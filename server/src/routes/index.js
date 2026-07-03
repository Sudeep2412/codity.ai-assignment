const express = require('express');
const authRoutes = require('./auth.routes');
const { projectQueueRouter, globalQueueRouter } = require('./queue.routes');
const { queueJobRouter, globalJobRouter } = require('./job.routes');
const { queueDlqRouter, globalDlqRouter } = require('./dlq.routes');
const metricsRoutes = require('./metrics.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/organizations', require('./org.routes'));
router.use('/projects', require('./project.routes'));
router.use('/retry-policies', require('./retryPolicy.routes'));
router.use('/workers', require('./worker.routes'));
router.use('/simulate', require('./simulate.routes'));
router.use('/projects/:projectId/queues', projectQueueRouter);
router.use('/queues', globalQueueRouter);
router.use('/queues/:queueId/jobs', queueJobRouter);
router.use('/queues/:queueId/dlq', queueDlqRouter);
router.use('/jobs', globalJobRouter);
router.use('/dlq', globalDlqRouter);
router.use('/metrics', metricsRoutes);

module.exports = router;
