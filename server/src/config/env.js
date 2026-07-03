require('dotenv').config({ path: '../.env' });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  WORKER_ID: process.env.WORKER_ID || 'worker-1',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY, 10) || 5,
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS, 10) || 1000,
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.HEARTBEAT_INTERVAL_MS, 10) || 10000,
};

// Validate critical variables
if (!env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set. Database connection will fail.');
}

module.exports = env;
