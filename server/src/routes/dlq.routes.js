const express = require('express');
const dlqController = require('../controllers/dlq.controller');
const authenticate = require('../middleware/auth');
const { requireQueueAccess, requireDlqAccess } = require('../middleware/resourceAuth');
const requireRole = require('../middleware/rbac');

const queueDlqRouter = express.Router({ mergeParams: true });
queueDlqRouter.use(authenticate, requireQueueAccess);
queueDlqRouter.get('/', dlqController.listDLQEntries);

const globalDlqRouter = express.Router({ mergeParams: true });
globalDlqRouter.use(authenticate, requireDlqAccess);
globalDlqRouter.get('/', dlqController.listAllDLQEntries);
globalDlqRouter.post('/:entryId/retry', requireRole(['admin', 'member']), dlqController.retryDLQEntry);
globalDlqRouter.post('/:entryId/discard', requireRole(['admin', 'member']), dlqController.discardDLQEntry);

module.exports = {
  queueDlqRouter,
  globalDlqRouter
};
