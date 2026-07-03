const express = require('express');
const retryPolicyController = require('../controllers/retryPolicy.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// List/Create retry policies (admin only for creating)
router.get('/', retryPolicyController.getRetryPolicies);
router.post('/', requireRole(['admin']), retryPolicyController.createRetryPolicy);

// Get/Update/Delete specific retry policy
router.get('/:id', retryPolicyController.getRetryPolicy);
router.put('/:id', requireRole(['admin']), retryPolicyController.updateRetryPolicy);
router.delete('/:id', requireRole(['admin']), retryPolicyController.deleteRetryPolicy);

module.exports = router;
