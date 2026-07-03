const express = require('express');
const metricsController = require('../controllers/metrics.controller');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/throughput', authenticate, metricsController.getThroughput);
router.get('/error-rate', authenticate, metricsController.getErrorRate);
router.get('/workers', authenticate, metricsController.getWorkers);
router.get('/overview', authenticate, metricsController.getOverview);
router.get('/activity', authenticate, metricsController.getRecentActivity);

module.exports = router;
