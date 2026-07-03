const express = require('express');
const queueController = require('../controllers/queue.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const { requireProjectAccess, requireQueueAccess } = require('../middleware/resourceAuth');
const validate = require('../middleware/validate');
const Joi = require('joi');

const createQueueSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  priority: Joi.number().integer().min(1).max(10).default(5),
  concurrencyLimit: Joi.number().integer().min(1).max(100).default(5),
  retryPolicyId: Joi.string().uuid().optional(),
  tags: Joi.object().optional()
});

const updateQueueSchema = Joi.object({
  priority: Joi.number().integer().min(1).max(10).optional(),
  concurrencyLimit: Joi.number().integer().min(1).max(100).optional(),
  retryPolicyId: Joi.string().uuid().optional(),
  tags: Joi.object().optional()
});

// Router for /api/projects/:projectId/queues
const projectRouter = express.Router({ mergeParams: true });
projectRouter.use(authenticate, requireProjectAccess);
projectRouter.post('/', requireRole(['admin', 'member']), validate(createQueueSchema), queueController.createQueue);
projectRouter.get('/', queueController.listQueues);

// Router for /api/queues/:queueId (and global /api/queues list)
const globalRouter = express.Router({ mergeParams: true });
globalRouter.get('/', authenticate, queueController.listAllQueues);

globalRouter.use(authenticate, requireQueueAccess);
globalRouter.get('/:queueId', queueController.getQueue);
globalRouter.patch('/:queueId', requireRole(['admin', 'member']), validate(updateQueueSchema), queueController.updateQueue);
globalRouter.delete('/:queueId', requireRole(['admin']), queueController.deleteQueue);

globalRouter.post('/:queueId/pause', requireRole(['admin', 'member']), queueController.pauseQueue);
globalRouter.post('/:queueId/resume', requireRole(['admin', 'member']), queueController.resumeQueue);
globalRouter.get('/:queueId/stats', queueController.getQueueStats);

module.exports = {
  projectQueueRouter: projectRouter,
  globalQueueRouter: globalRouter
};
