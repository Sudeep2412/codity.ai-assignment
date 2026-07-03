const env = require('./config/env');
const db = require('./config/database');
const redis = require('./config/redis');
const logger = require('./utils/logger');
const HeartbeatService = require('./heartbeat');
const Executor = require('./executor');

class Poller {
  constructor() {
    this.workerId = env.WORKER_ID;
    this.concurrency = env.WORKER_CONCURRENCY;
    this.intervalMs = env.POLL_INTERVAL_MS;
    
    this.executor = new Executor();
    this.heartbeat = new HeartbeatService(this.workerId, () => this.executor.getActiveCount());
    
    this.isRunning = false;
    this.timeoutId = null;
  }

  async start() {
    this.isRunning = true;
    
    // Register worker in DB (upsert)
    await db('workers').insert({
      id: this.workerId,
      hostname: require('os').hostname(),
      status: 'online',
      concurrency_slots: this.concurrency,
      metadata: JSON.stringify({ pid: process.pid })
    }).onConflict('id').merge();

    this.heartbeat.start();
    logger.info(`Worker ${this.workerId} started. Concurrency: ${this.concurrency}`);
    
    this.loop();
  }

  async stop() {
    this.isRunning = false;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    
    this.heartbeat.stop();
    await this.executor.drain();
    
    // Deregister worker
    await db('workers').where({ id: this.workerId }).update({ status: 'offline' });
    logger.info(`Worker ${this.workerId} stopped`);
  }

  async loop() {
    if (!this.isRunning) return;

    try {
      if (this.executor.getActiveCount() < this.concurrency) {
        const job = await this.claimNextJob();
        if (job) {
          // Fire and forget — with error boundary to prevent unhandled rejections
          this.handleJob(job).catch(err => logger.error(`Unhandled error in handleJob for ${job.id}`, err));
          
          // Poll again immediately if we found a job
          return setImmediate(() => this.loop());
        }
      }
    } catch (err) {
      logger.error('Error in poll loop', err);
    }

    // Backoff if no jobs or no capacity
    this.timeoutId = setTimeout(() => this.loop(), this.intervalMs);
  }

  /**
   * Atomically claim the next eligible job using SELECT FOR UPDATE SKIP LOCKED.
   * Only claims from active (non-paused) queues that haven't hit their concurrency limit.
   */
  async claimNextJob() {
    const result = await db.raw(`
      UPDATE jobs
      SET
          status = 'claimed',
          claimed_by_worker = ?,
          claimed_at = NOW(),
          updated_at = NOW()
      WHERE id = (
          SELECT j.id FROM jobs j
          INNER JOIN queues q ON q.id = j.queue_id
          WHERE j.status = 'queued'
            AND j.scheduled_at <= NOW()
            AND q.status = 'active'
            AND (
              SELECT COUNT(*) FROM jobs running
              WHERE running.queue_id = q.id
                AND running.status IN ('claimed', 'running')
            ) < q.concurrency_limit
          ORDER BY q.priority ASC, j.priority ASC, j.created_at ASC
          LIMIT 1
          FOR UPDATE OF j SKIP LOCKED
      )
      RETURNING *;
    `, [this.workerId]);

    return result.rows[0] || null;
  }

  async handleJob(job) {
    // Idempotency check (R5)
    const existingCompletion = await db('job_executions')
      .where({ job_id: job.id, status: 'completed' })
      .first();
      
    if (existingCompletion) {
      logger.info(`Job ${job.id} already completed (idempotent recovery), skipping execution`);
      return this.markCompleted(job, existingCompletion.id, existingCompletion.result, existingCompletion.duration_ms);
    }

    // Increment attempt number when execution actually starts (R3)
    const newAttemptNumber = job.attempt_number + 1;

    // Record execution start
    const [execution] = await db('job_executions').insert({
      job_id: job.id,
      worker_id: this.workerId,
      attempt_number: newAttemptNumber,
      status: 'running'
    }).returning('id');

    // Transition to 'running' with started_at timestamp
    await db('jobs').where({ id: job.id }).update({
      status: 'running',
      attempt_number: newAttemptNumber,
      started_at: new Date(),
      updated_at: new Date()
    });

    job.attempt_number = newAttemptNumber;

    // Announce job started via Redis Pub/Sub
    await redis.publish('jobs:events', JSON.stringify({
      type: 'job:started',
      jobId: job.id,
      queueId: job.queue_id,
      workerId: this.workerId
    }));

    const startTime = Date.now();
    const timeoutMs = job.timeout_ms || 30000; // Default 30s timeout

    try {
      const { success, result, error, stack } = await this.executor.executeJob(job, timeoutMs);
      const durationMs = Date.now() - startTime;

      if (success) {
        await this.markCompleted(job, execution.id, result, durationMs);
      } else {
        await this.handleFailure(job, execution.id, error, stack, durationMs);
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      await this.handleFailure(job, execution.id, err.message, err.stack, durationMs);
    }
  }

  async markCompleted(job, executionId, result, durationMs) {
    await db.transaction(async (trx) => {
      // Update execution
      await trx('job_executions').where({ id: executionId }).update({
        status: 'completed',
        result: JSON.stringify(result),
        duration_ms: durationMs,
        finished_at: new Date()
      });

      // Update job
      await trx('jobs').where({ id: job.id }).update({
        status: 'completed',
        result: JSON.stringify(result),
        completed_at: new Date(),
        updated_at: new Date()
      });

      // Update queue stats
      await trx.raw('UPDATE queues SET total_processed = total_processed + 1 WHERE id = ?', [job.queue_id]);

      // Log success
      await trx('job_logs').insert({
        job_id: job.id,
        execution_id: executionId,
        level: 'info',
        message: `Job completed successfully in ${durationMs}ms`,
      });
    });

    await redis.publish('jobs:events', JSON.stringify({
      type: 'job:completed',
      jobId: job.id,
      queueId: job.queue_id,
      durationMs
    }));
  }

  async handleFailure(job, executionId, error, stack, durationMs) {
    const isPermanent = job.attempt_number >= job.max_attempts;

    await db.transaction(async (trx) => {
      // Update execution
      await trx('job_executions').where({ id: executionId }).update({
        status: 'failed',
        error_message: error,
        stack_trace: stack,
        duration_ms: durationMs,
        finished_at: new Date()
      });

      // Log failure
      await trx('job_logs').insert({
        job_id: job.id,
        execution_id: executionId,
        level: 'error',
        message: `Attempt ${job.attempt_number}/${job.max_attempts} failed: ${error}`,
      });

      if (isPermanent) {
        // Mark job as failed permanently
        await trx('jobs').where({ id: job.id }).update({
          status: 'failed',
          updated_at: new Date()
        });
        await trx.raw('UPDATE queues SET total_failed = total_failed + 1 WHERE id = ?', [job.queue_id]);
        
        // Send to Dead Letter Queue
        await trx('dead_letter_queue').insert({
          original_job_id: job.id,
          queue_id: job.queue_id,
          job_type: job.type,
          payload: job.payload,
          failure_reason: error,
          total_attempts: job.attempt_number
        });
        
        await redis.publish('jobs:events', JSON.stringify({
          type: 'job:failed',
          jobId: job.id,
          queueId: job.queue_id,
          permanent: true
        }));
      } else {
        // Needs retry — calculate delay using the correct strategy
        const delayMs = await this.calculateRetryDelay(trx, job);

        // Re-queue with calculated delay
        await trx('jobs').where({ id: job.id }).update({
          status: 'queued',
          claimed_by_worker: null,
          claimed_at: null,
          started_at: null,
          scheduled_at: new Date(Date.now() + delayMs),
          updated_at: new Date()
        });
        
        await redis.publish('jobs:events', JSON.stringify({
          type: 'job:retrying',
          jobId: job.id,
          queueId: job.queue_id,
          nextAttemptIn: delayMs
        }));

        logger.info(`Job ${job.id} scheduled for retry in ${delayMs}ms (attempt ${job.attempt_number}/${job.max_attempts})`);
      }
    });
  }

  /**
   * Calculate retry delay using the queue's retry policy strategy.
   * Supports fixed, linear, and exponential backoff.
   */
  async calculateRetryDelay(trx, job) {
    const queue = await trx('queues').where({ id: job.queue_id }).first();
    
    if (!queue || !queue.retry_policy_id) {
      return 1000; // Default 1s
    }
    
    const policy = await trx('retry_policies').where({ id: queue.retry_policy_id }).first();
    if (!policy) return 1000;

    let delayMs;
    switch (policy.strategy) {
      case 'fixed':
        delayMs = policy.initial_delay_ms;
        break;
      case 'linear':
        delayMs = policy.initial_delay_ms * job.attempt_number;
        break;
      case 'exponential':
        delayMs = policy.initial_delay_ms * Math.pow(policy.backoff_multiplier, job.attempt_number - 1);
        break;
      default:
        delayMs = policy.initial_delay_ms;
    }
    
    return Math.min(delayMs, policy.max_delay_ms || 3600000);
  }
}

module.exports = Poller;
