const logger = require('./utils/logger');
const db = require('./config/database');
const redis = require('./config/redis');

module.exports = function setupGracefulShutdown(poller) {
  const signals = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);

      try {
        // 1. Stop polling and wait for active jobs to complete (with timeout)
        await poller.stop();

        // 2. Requeue any jobs that didn't finish draining in time
        const runningJobs = await db('jobs').where({ status: 'running', claimed_by_worker: poller.workerId });
        if (runningJobs.length > 0) {
          logger.warn(`Requeueing ${runningJobs.length} active jobs due to shutdown timeout`);
          await db('jobs')
            .whereIn('id', runningJobs.map(j => j.id))
            .update({
              status: 'queued',
              claimed_by_worker: null,
              claimed_at: null,
              started_at: null,
              updated_at: new Date()
            });
        }

        // 3. Close connections
        await db.destroy();
        await redis.quit();

        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown', err);
        process.exit(1);
      }
    });
  }
  
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', err);
    process.exit(1);
  });
};
