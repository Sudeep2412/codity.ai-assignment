const express = require('express');
const projectController = require('../controllers/project.controller');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/rbac');

// mergeParams to access :orgId from parent router if needed
const router = express.Router({ mergeParams: true });

router.use(authenticate);

// List/Create projects
router.get('/', projectController.getProjects);
router.post('/', requireRole(['admin']), projectController.createProject);

// Get/Update/Delete specific project
router.get('/:id', projectController.getProject);
router.put('/:id', requireRole(['admin']), projectController.updateProject);
router.delete('/:id', requireRole(['admin']), projectController.deleteProject);

module.exports = router;
