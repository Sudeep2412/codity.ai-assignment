const cronParser = require('cron-parser');
const db = require('../config/database');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class SchedulerService {
  constructor() {
    this.intervalId = null;
    this.POLL_INTERVAL = 5000; // Poll every 5s for delayed or scheduled jobs
    this.HEARTBEAT_STALE_THRESHOLD_MS = 30000; // 3× default heartbeat interval
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.run(), this.POLL_INTERVAL);
    logger.info('Scheduler service started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async run() {
    // Distributed Lock — TTL is a safety net; lock is released explicitly
    const lockKey = 'scheduler:lock';
    const lockTTL = this.POLL_INTERVAL * 3; // Safety TTL in case of crash
    const acquired = await redis.set(lockKey, 'locked', 'NX', 'PX', lockTTL);
    
    if (!acquired) {
      // Another scheduler is running
      return;
    }

    try {
      await this.promoteScheduledJobs();
      await this.recoverStaleWorkers();
    } catch (err) {
      logger.error('Error in scheduler run', err);
    } finally {
      // Always release lock immediately so other instances aren't starved
      await redis.del(lockKey).catch(() => {});
    }
  }

  /**
   * Promote due cron/scheduled jobs into the jobs table.
   */
  async promoteScheduledJobs() {
    await db.transaction(async (trx) => {
      // Find all scheduled jobs that are due
      const dueJobs = await trx('scheduled_jobs')
        .where('enabled', true)
        .andWhere('next_run_at', '<=', new Date())
        .forUpdate()
        .skipLocked();

      for (const job of dueJobs) {
        // Create an actual job instance
        const [newJob] = await trx('jobs').insert({
          queue_id: job.queue_id,
          type: job.type,
          payload: job.payload,
          status: 'queued',
          scheduled_at: new Date()
        }).returning('id');

        // Calculate next run
        try {
          const interval = cronParser.parseExpression(job.cron_expression);
          const nextRunAt = interval.next().toDate();

          // Update scheduled job
          await trx('scheduled_jobs').where({ id: job.id }).update({
            last_run_at: new Date(),
            next_run_at: nextRunAt,
            last_job_id: newJob.id,
            updated_at: new Date()
          });
          
          logger.info(`Promoted cron job ${job.id}, next run at ${nextRunAt}`);
        } catch (err) {
          logger.error(`Invalid cron expression for job ${job.id}`, err);
          // Disable job to prevent infinite loop
          await trx('scheduled_jobs').where({ id: job.id }).update({ enabled: false });
        }
      }
    });
  }

  /**
   * Detect workers whose heartbeat has gone stale and requeue their orphaned jobs.
   * This prevents jobs from being permanently stuck after a worker crash.
   */
  async recoverStaleWorkers() {
    const staleThreshold = new Date(Date.now() - this.HEARTBEAT_STALE_THRESHOLD_MS);

    await db.transaction(async (trx) => {
      // Find workers with expired heartbeats that are still marked online/busy
      const staleWorkers = await trx('workers')
        .whereIn('status', ['online', 'busy'])
        .andWhere('last_heartbeat_at', '<', staleThreshold)
        .select('id', 'hostname');

      if (staleWorkers.length === 0) return;

      const staleWorkerIds = staleWorkers.map(w => w.id);
      logger.warn(`Detected ${staleWorkers.length} stale worker(s): ${staleWorkers.map(w => w.hostname).join(', ')}`);

      // Mark stale workers as offline and reset their active_jobs counter
      await trx('workers')
        .whereIn('id', staleWorkerIds)
        .update({ status: 'offline', active_jobs: 0 });

      // Requeue orphaned jobs (claimed or running by dead workers)
      const orphanedJobs = await trx('jobs')
        .whereIn('claimed_by_worker', staleWorkerIds)
        .whereIn('status', ['claimed', 'running'])
        .update({
          status: 'queued',
          claimed_by_worker: null,
          claimed_at: null,
          started_at: null,
          scheduled_at: new Date(),
          updated_at: new Date()
        });

      if (orphanedJobs > 0) {
        logger.warn(`Requeued ${orphanedJobs} orphaned job(s) from stale workers`);
      }
    });
  }
}

module.exports = new SchedulerService();
