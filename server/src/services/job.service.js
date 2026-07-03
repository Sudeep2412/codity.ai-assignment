const cronParser = require('cron-parser');
const db = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

class JobService {
  async createJob(queueId, data) {
    const queue = await db('queues').where({ id: queueId }).first();
    if (!queue) throw new NotFoundError('Queue not found');

    const isDelayed = data.scheduledAt && new Date(data.scheduledAt) > new Date();

    const jobData = {
      queue_id: queueId,
      type: data.type,
      payload: data.payload ? JSON.stringify(data.payload) : '{}',
      priority: data.priority || queue.priority,
      max_attempts: data.maxAttempts || 3,
      timeout_ms: data.timeoutMs || 30000,
      idempotency_key: data.idempotencyKey || null,
      scheduled_at: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
      status: isDelayed ? 'scheduled' : 'queued'
    };

    const [job] = await db('jobs')
      .insert(jobData)
      .onConflict(db.raw('(queue_id, idempotency_key) WHERE idempotency_key IS NOT NULL'))
      .ignore() // Do not insert if idempotency key exists
      .returning('*');

    if (!job) {
      // It was ignored due to idempotency key, fetch the existing one
      return db('jobs').where({ queue_id: queueId, idempotency_key: data.idempotencyKey }).first();
    }

    return job;
  }

  async createBatchJobs(queueId, jobsArray) {
    const queue = await db('queues').where({ id: queueId }).first();
    if (!queue) throw new NotFoundError('Queue not found');

    const jobsData = jobsArray.map(data => {
      const isDelayed = data.scheduledAt && new Date(data.scheduledAt) > new Date();
      return {
        queue_id: queueId,
        type: data.type,
        payload: data.payload ? JSON.stringify(data.payload) : '{}',
        priority: data.priority || queue.priority,
        max_attempts: data.maxAttempts || 3,
        idempotency_key: data.idempotencyKey || null,
        scheduled_at: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
        status: isDelayed ? 'scheduled' : 'queued'
      };
    });

    const inserted = await db('jobs')
      .insert(jobsData)
      .onConflict(db.raw('(queue_id, idempotency_key) WHERE idempotency_key IS NOT NULL'))
      .ignore()
      .returning('*');

    return {
      inserted: inserted,
      insertedCount: inserted.length,
      skippedCount: jobsData.length - inserted.length,
      totalRequested: jobsData.length
    };
  }

  async createScheduledJob(queueId, data) {
    const queue = await db('queues').where({ id: queueId }).first();
    if (!queue) throw new NotFoundError('Queue not found');

    // Calculate the actual next run time from the cron expression
    let nextRunAt;
    try {
      const interval = cronParser.parseExpression(data.cronExpression);
      nextRunAt = interval.next().toDate();
    } catch (err) {
      throw new BadRequestError(`Invalid cron expression: ${data.cronExpression}`);
    }

    const [scheduledJob] = await db('scheduled_jobs').insert({
      queue_id: queueId,
      type: data.type,
      cron_expression: data.cronExpression,
      payload: data.payload ? JSON.stringify(data.payload) : '{}',
      next_run_at: nextRunAt
    }).returning('*');

    return scheduledJob;
  }

  async listJobs(queueId, query) {
    const { limit, offset, page } = getPaginationParams(query);
    
    let baseQuery = db('jobs').where({ queue_id: queueId });
    
    if (query.status) baseQuery = baseQuery.andWhere('status', query.status);
    if (query.type) baseQuery = baseQuery.andWhere('type', query.type);

    const totalRes = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalRes.count, 10);

    const jobs = await baseQuery
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    return {
      data: jobs,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  async listAllJobs(query) {
    const { limit, offset, page } = getPaginationParams(query);

    let baseQuery = db('jobs');

    if (query.status) baseQuery = baseQuery.where('status', query.status);
    if (query.type) baseQuery = baseQuery.where('type', query.type);
    if (query.queueId) baseQuery = baseQuery.where('queue_id', query.queueId);

    const totalRes = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalRes.count, 10);

    const jobs = await baseQuery
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: jobs,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  async getJob(jobId) {
    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) throw new NotFoundError('Job not found');

    const executions = await db('job_executions')
      .where({ job_id: jobId })
      .orderBy('attempt_number', 'asc');

    const logs = await db('job_logs')
      .where({ job_id: jobId })
      .orderBy('timestamp', 'asc');

    job.executions = executions;
    job.logs = logs;
    return job;
  }

  async cancelJob(jobId) {
    // Atomic conditional update — prevents race conditions
    const [updated] = await db('jobs')
      .where({ id: jobId })
      .whereNotIn('status', ['completed', 'failed', 'cancelled'])
      .update({ status: 'cancelled', updated_at: new Date() })
      .returning('*');

    if (!updated) {
      // Either not found or in a terminal state
      const job = await db('jobs').where({ id: jobId }).first();
      if (!job) throw new NotFoundError('Job not found');
      throw new BadRequestError(`Cannot cancel job in '${job.status}' status`);
    }

    return updated;
  }

  async retryJob(jobId) {
    // Atomic conditional update — prevents race conditions
    const [updated] = await db('jobs')
      .where({ id: jobId, status: 'failed' })
      .update({ 
        status: 'queued', 
        scheduled_at: new Date(),
        updated_at: new Date(),
        claimed_by_worker: null,
        claimed_at: null,
        started_at: null,
        attempt_number: 0 // Reset attempts for manual retry
      })
      .returning('*');

    if (!updated) {
      const job = await db('jobs').where({ id: jobId }).first();
      if (!job) throw new NotFoundError('Job not found');
      throw new BadRequestError('Only failed jobs can be manually retried');
    }

    return updated;
  }

  async getJobLogs(jobId) {
    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) throw new NotFoundError('Job not found');

    const logs = await db('job_logs')
      .where({ job_id: jobId })
      .orderBy('timestamp', 'asc');

    return logs;
  }
}

module.exports = new JobService();
