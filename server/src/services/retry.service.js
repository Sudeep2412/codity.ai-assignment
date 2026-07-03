const db = require('../config/database');

class RetryService {
  async calculateDelay(policy, attemptNumber) {
    if (!policy) return 0;
    
    switch (policy.strategy) {
      case 'fixed':
        return policy.initial_delay_ms;
        
      case 'linear':
        return policy.initial_delay_ms * attemptNumber;
        
      case 'exponential':
        const delay = policy.initial_delay_ms * Math.pow(policy.backoff_multiplier, attemptNumber - 1);
        return Math.min(delay, policy.max_delay_ms);
        
      default:
        return policy.initial_delay_ms;
    }
  }

  async getRetryPolicy(policyId) {
    return db('retry_policies').where({ id: policyId }).first();
  }
}

module.exports = new RetryService();
