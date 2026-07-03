const db = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

class QueueService {
  async createQueue(projectId, data) {
    // Check if project exists
    const project = await db('projects').where({ id: projectId }).first();
    if (!project) throw new NotFoundError('Project not found');

    if (data.retryPolicyId) {
      const policy = await db('retry_policies').where({ id: data.retryPolicyId }).first();
      if (!policy) throw new BadRequestError('Retry policy not found');
    }

    const [queue] = await db('queues').insert({
      project_id: projectId,
      name: data.name,
      priority: data.priority,
      concurrency_limit: data.concurrencyLimit,
      retry_policy_id: data.retryPolicyId || null,
      tags: data.tags ? JSON.stringify(data.tags) : '{}',
    }).returning('*');

    return queue;
  }

  async listQueues(projectId, query) {
    const { limit, offset, page } = getPaginationParams(query);
    
    let baseQuery = db('queues').where({ project_id: projectId });
    
    if (query.status) {
      baseQuery = baseQuery.andWhere('status', query.status);
    }

    const totalRes = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalRes.count, 10);

    const queues = await baseQuery.orderBy('created_at', 'desc').limit(limit).offset(offset);
    
    return {
      data: queues,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  async listAllQueues(user, query) {
    const { limit, offset, page } = getPaginationParams(query);
    
    let baseQuery = db('queues');
    
    if (user.role !== 'admin') {
      baseQuery = baseQuery
        .join('projects', 'queues.project_id', 'projects.id')
        .join('org_members', 'projects.org_id', 'org_members.org_id')
        .where('org_members.user_id', user.id)
        .select('queues.*');
    }
    
    if (query.status) {
      baseQuery = baseQuery.where('queues.status', query.status);
    }

    // Need to handle count properly when using joins
    const countQuery = baseQuery.clone();
    if (user.role !== 'admin') {
      countQuery.clearSelect().count('queues.id as count');
    } else {
      countQuery.count('* as count');
    }
    
    const totalRes = await countQuery.first();
    const total = parseInt(totalRes?.count || 0, 10);

    const queues = await baseQuery.orderBy('queues.created_at', 'desc').limit(limit).offset(offset);
    
    return {
      data: queues,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  async getQueue(queueId) {
    const queue = await db('queues').where({ id: queueId }).first();
    if (!queue) throw new NotFoundError('Queue not found');
    return queue;
  }

  async updateQueue(queueId, data) {
    const queue = await this.getQueue(queueId);
    
    const updateData = {};
    if (data.concurrencyLimit !== undefined) updateData.concurrency_limit = data.concurrencyLimit;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.retryPolicyId !== undefined) updateData.retry_policy_id = data.retryPolicyId;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    updateData.updated_at = new Date();

    const [updated] = await db('queues').where({ id: queueId }).update(updateData).returning('*');
    return updated;
  }

  async setQueueStatus(queueId, status) {
    const queue = await this.getQueue(queueId);
    
    if (queue.status === status) return queue;
    
    const [updated] = await db('queues')
      .where({ id: queueId })
      .update({ status, updated_at: new Date() })
      .returning('*');
      
    return updated;
  }

  async deleteQueue(queueId) {
    const queue = await this.getQueue(queueId);
    await db('queues').where({ id: queueId }).del();
    return { id: queueId, deleted: true };
  }

  async getQueueStats(queueId) {
    const queue = await this.getQueue(queueId);
    
    // Get jobs grouped by status
    const stats = await db('jobs')
      .where({ queue_id: queueId })
      .select('status')
      .count('* as count')
      .groupBy('status');
      
    const formattedStats = stats.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {
      queued: 0, scheduled: 0, claimed: 0, running: 0, completed: 0, failed: 0, cancelled: 0
    });

    return {
      queue,
      liveJobStats: formattedStats,
      historical: {
        totalProcessed: parseInt(queue.total_processed, 10),
        totalFailed: parseInt(queue.total_failed, 10)
      }
    };
  }
}

module.exports = new QueueService();
