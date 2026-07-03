require('dotenv').config({ path: '../.env' });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  WORKER_ID: process.env.WORKER_ID || require('uuid').v4(),
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY, 10) || 5,
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS, 10) || 1000,
  HEARTBEAT_INTERVAL_MS: parseInt(process.env.HEARTBEAT_INTERVAL_MS, 10) || 10000,
};
