const express = require('express');
const simulateController = require('../controllers/simulate.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// Admin/Member can simulate
router.post('/burst', requireRole(['admin', 'member']), simulateController.burstSimulate);

module.exports = router;
