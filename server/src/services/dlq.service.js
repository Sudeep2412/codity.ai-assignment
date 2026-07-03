const db = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class DLQService {
  async getDLQEntries(queueId, query = {}) {
    let baseQuery = db('dead_letter_queue').where({ queue_id: queueId });
    
    if (query.resolution_status) {
      baseQuery = baseQuery.andWhere('resolution_status', query.resolution_status);
    }
    
    return baseQuery.orderBy('failed_at', 'desc');
  }

  async getAllDLQEntries(query = {}) {
    let baseQuery = db('dead_letter_queue');
    
    if (query.resolution_status) {
      baseQuery = baseQuery.andWhere('resolution_status', query.resolution_status);
    }
    if (query.queue_id) {
      baseQuery = baseQuery.andWhere('queue_id', query.queue_id);
    }
    
    return baseQuery.orderBy('failed_at', 'desc');
  }

  async sendToDLQ(jobId, failureReason) {
    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) throw new NotFoundError('Job not found');

    const executions = await db('job_executions')
      .where({ job_id: jobId })
      .orderBy('attempt_number', 'asc');

    // AI Failure Summary — simulated analysis based on execution patterns
    const failureCount = executions.filter(e => e.status === 'failed').length;
    const lastError = executions.length > 0 ? executions[executions.length - 1].error_message : failureReason;
    const aiSummary = `Job "${job.type}" failed ${failureCount} time(s) across ${job.attempt_number} attempt(s). ` +
      `Final error: ${lastError}. ` +
      `Avg duration: ${Math.round(executions.reduce((s, e) => s + (e.duration_ms || 0), 0) / Math.max(executions.length, 1))}ms. ` +
      `Recommendation: Check payload validity and downstream service health.`;

    const [dlqEntry] = await db('dead_letter_queue').insert({
      original_job_id: job.id,
      queue_id: job.queue_id,
      job_type: job.type,
      payload: job.payload,
      failure_reason: failureReason,
      ai_failure_summary: aiSummary,
      total_attempts: job.attempt_number,
      execution_history: JSON.stringify(executions),
      resolution_status: 'pending'
    }).returning('*');
    
    return dlqEntry;
  }

  async retryDLQEntry(entryId) {
    const entry = await db('dead_letter_queue').where({ id: entryId }).first();
    if (!entry) throw new NotFoundError('DLQ entry not found');

    if (entry.resolution_status !== 'pending') {
      throw new BadRequestError(`Entry already ${entry.resolution_status}`, 'DLQ_ALREADY_RESOLVED');
    }

    // Re-create the job
    const [newJob] = await db('jobs').insert({
      queue_id: entry.queue_id,
      type: entry.job_type,
      payload: entry.payload,
      status: 'queued',
      scheduled_at: new Date()
    }).returning('*');

    // Mark DLQ entry as retried
    await db('dead_letter_queue')
      .where({ id: entryId })
      .update({ resolution_status: 'retried', resolved_at: new Date() });

    return newJob;
  }

  async discardDLQEntry(entryId) {
    const [updated] = await db('dead_letter_queue')
      .where({ id: entryId })
      .update({ resolution_status: 'discarded', resolved_at: new Date() })
      .returning('*');
      
    if (!updated) throw new NotFoundError('DLQ entry not found');
    return updated;
  }
}

module.exports = new DLQService();
