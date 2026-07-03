const express = require('express');
const orgController = require('../controllers/org.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// List/Create organizations (admin only for creating)
router.get('/', orgController.getOrganizations);
router.post('/', requireRole(['admin']), orgController.createOrganization);

// Get/Update/Delete specific organization
router.get('/:id', orgController.getOrganization);
router.put('/:id', requireRole(['admin']), orgController.updateOrganization);
router.delete('/:id', requireRole(['admin']), orgController.deleteOrganization);

module.exports = router;
