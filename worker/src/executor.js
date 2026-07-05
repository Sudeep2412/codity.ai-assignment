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
        logger.info(`[Job ${job.id}] Generating report (format: ${payload.format || 'pdf'})...`);
        await new Promise((resolve) => setTimeout(resolve, payload.duration || 3000));
        if (signal?.aborted) throw new Error('Aborted');
        return { reportUrl: `https://reports.codity.ai/${job.id}.${payload.format || 'pdf'}`, size: '2.4MB' };

      case 'send-email':
        logger.info(`[Job ${job.id}] Sending email to ${payload.to || 'unknown@example.com'}...`);
        await new Promise((resolve) => setTimeout(resolve, payload.duration || 1000));
        if (signal?.aborted) throw new Error('Aborted');
        if (payload.failProbability && Math.random() < payload.failProbability) {
          throw new Error('SMTP connection timed out');
        }
        return { delivered: true, messageId: `msg_${Date.now()}` };

      case 'process-webhook':
        logger.info(`[Job ${job.id}] Dispatching webhook to ${payload.url || 'unknown'}...`);
        await new Promise((resolve) => setTimeout(resolve, payload.duration || 1500));
        if (signal?.aborted) throw new Error('Aborted');
        return { statusCode: 200, response: 'OK' };

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
