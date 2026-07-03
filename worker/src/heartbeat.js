const env = require('./config/env');
const db = require('./config/database');
const redis = require('./config/redis');
const logger = require('./utils/logger');

class HeartbeatService {
  constructor(workerId, getActiveJobsCount) {
    this.workerId = workerId;
    this.getActiveJobsCount = getActiveJobsCount;
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) return;
    
    // Initial heartbeat
    this.ping();

    this.intervalId = setInterval(() => this.ping(), env.HEARTBEAT_INTERVAL_MS);
    logger.info(`Heartbeat started for worker ${this.workerId}`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Heartbeat stopped');
    }
  }

  async ping(attempt = 1) {
    try {
      const activeJobs = this.getActiveJobsCount();
      const cpuUsage = process.cpuUsage().user / 1000000; // rough approximation
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      
      const TTL = Math.ceil(env.HEARTBEAT_INTERVAL_MS / 1000) * 3; // 3 missed beats TTL

      // Redis key for quick live check by dashboard
      await redis.set(
        `worker:heartbeat:${this.workerId}`, 
        JSON.stringify({ activeJobs, cpuUsage, memoryUsage, timestamp: Date.now() }), 
        'EX', 
        TTL
      );

      // Persist durable history periodically
      await db('worker_heartbeats').insert({
        worker_id: this.workerId,
        active_jobs: activeJobs,
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
      });

      // Update worker last_seen
      await db('workers').where({ id: this.workerId }).update({
        last_heartbeat_at: new Date(),
        active_jobs: activeJobs,
        status: activeJobs > 0 ? 'busy' : 'online'
      });
      
      this.consecutiveFailures = 0;
    } catch (err) {
      this.consecutiveFailures = (this.consecutiveFailures || 0) + 1;
      
      if (attempt < 3) {
        logger.warn(`Heartbeat failed, retrying (attempt ${attempt}/3)...`, err.message);
        setTimeout(() => this.ping(attempt + 1), 1000);
      } else {
        logger.error(`Failed to send heartbeat after 3 attempts`, err);
        if (this.consecutiveFailures > 5) {
          logger.error('CRITICAL: Heartbeat failed 5+ consecutive times. Worker may be marked stale by scheduler.');
        }
      }
    }
  }
}

module.exports = HeartbeatService;
