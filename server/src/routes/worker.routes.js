const express = require('express');
const workerController = require('../controllers/worker.controller');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// List all workers
router.get('/', workerController.getWorkers);

module.exports = router;
