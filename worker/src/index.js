const Poller = require('./poller');
const setupGracefulShutdown = require('./gracefulShutdown');
const logger = require('./utils/logger');

async function main() {
  try {
    const poller = new Poller();
    setupGracefulShutdown(poller);

    logger.info('Starting Codity Worker...');
    await poller.start();
  } catch (err) {
    logger.error('Failed to start worker', err);
    process.exit(1);
  }
}

main();
