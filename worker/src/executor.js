const logger = require('./utils/logger');

// Pluggable job handlers
const simulationHandler = require('./handlers/simulation');

class Executor {
  constructor() {
    this.activeExecutions = new Map();
  }

  getActiveCount() {
    return this.activeExecutions.size;
  }

  /**
   * Execute a job with timeout enforcement.
   * @param {Object} job - The job record from the database
   * @param {number} timeoutMs - Maximum execution time before timeout kill
   */
  async executeJob(job, timeoutMs = 30000) {
    logger.info(`Executing job ${job.id} (type: ${job.type}, timeout: ${timeoutMs}ms)`);
    
    const abortController = new AbortController();
    
    // Register as active
    const executionPromise = this._run(job, abortController.signal);
    this.activeExecutions.set(job.id, executionPromise);
    
    try {
      // Race between actual execution and timeout
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          abortController.abort(new Error(`Timeout of ${timeoutMs}ms exceeded`));
          reject(new Error(`Job execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        // Allow the timer to not block Node from exiting during shutdown
        if (timer.unref) timer.unref();
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message, stack: error.stack };
    } finally {
      this.activeExecutions.delete(job.id);
    }
  }

  async _run(job, signal) {
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    
    // Route to appropriate handler based on job type
    // Pass signal to the handlers so they can cleanly abort
    switch (job.type) {
      case 'generate-report':
      case 'send-email':
      case 'process-webhook':
      case 'simulation':
        return simulationHandler(payload, signal);
        
      default:
        // Default simulated handler if unknown
        logger.debug(`No specific handler for job type '${job.type}', using simulation`);
        return simulationHandler(payload, signal);
    }
  }

  async drain(timeoutMs = 30000) {
    if (this.activeExecutions.size === 0) return;
    
    logger.info(`Draining ${this.activeExecutions.size} active jobs with timeout ${timeoutMs}ms...`);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Drain timeout exceeded')), timeoutMs)
    );
    
    try {
      await Promise.race([
        Promise.allSettled([...this.activeExecutions.values()]),
        timeoutPromise
      ]);
      logger.info('All active jobs drained successfully');
    } catch (err) {
      logger.warn(`Drain incomplete: ${err.message}. ${this.activeExecutions.size} jobs still running.`);
    }
  }
}

module.exports = Executor;
