/**
 * Unit tests for retry delay calculation logic.
 * Tests the pure algorithm without database dependencies.
 */

// Extract the delay calculation logic directly for unit testing
function calculateDelay(policy, attemptNumber) {
  if (!policy) return 0;
  
  let delay;
  switch (policy.strategy) {
    case 'fixed':
      delay = policy.initial_delay_ms;
      break;
    case 'linear':
      delay = policy.initial_delay_ms * attemptNumber;
      break;
    case 'exponential':
      delay = policy.initial_delay_ms * Math.pow(policy.backoff_multiplier, attemptNumber - 1);
      break;
    default:
      delay = policy.initial_delay_ms;
  }
  return Math.min(delay, policy.max_delay_ms);
}

describe('Retry Delay Calculation', () => {
  it('should return 0 when no policy is provided', () => {
    expect(calculateDelay(null, 1)).toBe(0);
  });

  describe('fixed strategy', () => {
    const fixedPolicy = {
      strategy: 'fixed',
      initial_delay_ms: 5000,
      backoff_multiplier: 1,
      max_delay_ms: 3600000,
    };

    it('should return the same delay for every attempt', () => {
      expect(calculateDelay(fixedPolicy, 1)).toBe(5000);
      expect(calculateDelay(fixedPolicy, 2)).toBe(5000);
      expect(calculateDelay(fixedPolicy, 5)).toBe(5000);
    });
  });

  describe('linear strategy', () => {
    const linearPolicy = {
      strategy: 'linear',
      initial_delay_ms: 1000,
      backoff_multiplier: 1,
      max_delay_ms: 3600000,
    };

    it('should increase delay linearly with attempt number', () => {
      expect(calculateDelay(linearPolicy, 1)).toBe(1000);
      expect(calculateDelay(linearPolicy, 2)).toBe(2000);
      expect(calculateDelay(linearPolicy, 3)).toBe(3000);
      expect(calculateDelay(linearPolicy, 10)).toBe(10000);
    });
  });

  describe('exponential strategy', () => {
    const exponentialPolicy = {
      strategy: 'exponential',
      initial_delay_ms: 1000,
      backoff_multiplier: 2.0,
      max_delay_ms: 60000,
    };

    it('should increase delay exponentially', () => {
      expect(calculateDelay(exponentialPolicy, 1)).toBe(1000);  // 1000 * 2^0
      expect(calculateDelay(exponentialPolicy, 2)).toBe(2000);  // 1000 * 2^1
      expect(calculateDelay(exponentialPolicy, 3)).toBe(4000);  // 1000 * 2^2
      expect(calculateDelay(exponentialPolicy, 4)).toBe(8000);  // 1000 * 2^3
    });

    it('should cap delay at max_delay_ms', () => {
      // 1000 * 2^9 = 512000, should be capped at 60000
      const delay = calculateDelay(exponentialPolicy, 10);
      expect(delay).toBe(60000);
    });

    it('should handle high backoff multiplier', () => {
      const aggressivePolicy = {
        strategy: 'exponential',
        initial_delay_ms: 100,
        backoff_multiplier: 3.0,
        max_delay_ms: 100000,
      };
      expect(calculateDelay(aggressivePolicy, 1)).toBe(100);    // 100 * 3^0
      expect(calculateDelay(aggressivePolicy, 2)).toBe(300);    // 100 * 3^1
      expect(calculateDelay(aggressivePolicy, 3)).toBe(900);    // 100 * 3^2
      expect(calculateDelay(aggressivePolicy, 4)).toBe(2700);   // 100 * 3^3
    });
  });

  describe('unknown strategy', () => {
    it('should fallback to initial_delay_ms', () => {
      const policy = {
        strategy: 'unknown_strategy',
        initial_delay_ms: 3000,
        backoff_multiplier: 1,
        max_delay_ms: 3600000,
      };
      expect(calculateDelay(policy, 5)).toBe(3000);
    });
  });

  describe('edge cases', () => {
    it('should handle attempt number 0', () => {
      const policy = {
        strategy: 'exponential',
        initial_delay_ms: 1000,
        backoff_multiplier: 2.0,
        max_delay_ms: 60000,
      };
      // 1000 * 2^(-1) = 500
      expect(calculateDelay(policy, 0)).toBe(500);
    });

    it('should handle very small max_delay_ms', () => {
      const policy = {
        strategy: 'exponential',
        initial_delay_ms: 5000,
        backoff_multiplier: 2.0,
        max_delay_ms: 1000,
      };
      expect(calculateDelay(policy, 1)).toBe(1000); // Capped
    });
  });
});
