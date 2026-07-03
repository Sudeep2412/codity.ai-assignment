const express = require('express');
const jobController = require('../controllers/job.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const validate = require('../middleware/validate');
const Joi = require('joi');

const router = express.Router({ mergeParams: true });

const createJobSchema = Joi.object({
  type: Joi.string().required().max(100),
  payload: Joi.object().optional().default({}),
  priority: Joi.number().integer().min(1).max(10).optional(),
  scheduledAt: Joi.date().iso().min('now').optional(),
  idempotencyKey: Joi.string().max(255).optional(),
  maxAttempts: Joi.number().integer().min(1).max(20).optional(),
  timeoutMs: Joi.number().integer().min(1000).max(600000).optional() // 1s – 10min
});

const createScheduledJobSchema = Joi.object({
  type: Joi.string().required().max(100),
  payload: Joi.object().optional().default({}),
  cronExpression: Joi.string().required()
});

const createBatchJobsSchema = Joi.object({
  jobs: Joi.array().items(createJobSchema).min(1).max(100).required()
});

/**
 * @swagger
 * /api/queues/{queueId}/jobs:
 *   post:
 *     summary: Create a new job in a queue
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *               payload:
 *                 type: object
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               idempotencyKey:
 *                 type: string
 *               maxAttempts:
 *                 type: integer
 *               timeoutMs:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/queues/{queueId}/jobs:
 *   get:
 *     summary: List jobs in a queue with pagination and filtering
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queueId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, scheduled, claimed, running, completed, failed, cancelled]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of jobs
 */

/**
 * @swagger
 * /api/jobs/{jobId}:
 *   get:
 *     summary: Get job details with execution history
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job details with executions
 *       404:
 *         description: Job not found
 */

/**
 * @swagger
 * /api/jobs/{jobId}/retry:
 *   post:
 *     summary: Manually retry a failed job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job requeued for retry
 *       400:
 *         description: Job not in failed status
 */

// Mounted at /api/queues/:queueId/jobs
const { requireQueueAccess, requireJobAccess } = require('../middleware/resourceAuth');

router.use(authenticate, requireQueueAccess);
router.post('/', validate(createJobSchema), jobController.createJob);
router.post('/scheduled', requireRole(['admin', 'member']), validate(createScheduledJobSchema), jobController.createScheduledJob);
router.post('/batch', requireRole(['admin', 'member']), validate(createBatchJobsSchema), jobController.createBatchJobs);
router.get('/', jobController.listJobs);

// Mounted directly at /api/jobs
const globalRouter = express.Router({ mergeParams: true });
globalRouter.use(authenticate, requireJobAccess);
globalRouter.get('/', jobController.listAllJobs);
globalRouter.get('/:jobId', jobController.getJob);
globalRouter.delete('/:jobId', jobController.cancelJob);
globalRouter.post('/:jobId/retry', jobController.retryJob);
globalRouter.get('/:jobId/logs', jobController.getJobLogs);

module.exports = {
  queueJobRouter: router,
  globalJobRouter: globalRouter
};
