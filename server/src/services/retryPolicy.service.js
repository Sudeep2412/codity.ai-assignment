const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

class RetryPolicyService {
  async getRetryPolicies(query) {
    const { limit, offset, page } = getPaginationParams(query);
    
    let baseQuery = db('retry_policies');
    
    const totalRes = await baseQuery.clone().count('* as count').first();
    const total = parseInt(totalRes.count, 10);
    
    const policies = await baseQuery
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);
      
    return {
      data: policies,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  async getRetryPolicy(id) {
    const policy = await db('retry_policies').where({ id }).first();
    if (!policy) throw new NotFoundError('Retry policy not found');
    return policy;
  }

  async createRetryPolicy(data) {
    const [policy] = await db('retry_policies').insert({
      name: data.name,
      description: data.description,
      strategy: data.strategy,
      initial_delay_ms: data.initial_delay_ms,
      max_delay_ms: data.max_delay_ms,
      backoff_multiplier: data.backoff_multiplier
    }).returning('*');
    return policy;
  }

  async updateRetryPolicy(id, data) {
    const [policy] = await db('retry_policies')
      .where({ id })
      .update({
        name: data.name,
        description: data.description,
        strategy: data.strategy,
        initial_delay_ms: data.initial_delay_ms,
        max_delay_ms: data.max_delay_ms,
        backoff_multiplier: data.backoff_multiplier,
        updated_at: new Date()
      })
      .returning('*');
      
    if (!policy) throw new NotFoundError('Retry policy not found');
    return policy;
  }

  async deleteRetryPolicy(id) {
    const deleted = await db('retry_policies').where({ id }).delete();
    if (!deleted) throw new NotFoundError('Retry policy not found');
    return true;
  }
}

module.exports = new RetryPolicyService();
