const projectService = require('../services/project.service');

exports.getProjects = async (req, res, next) => {
  try {
    const query = { ...req.query };
    // If mounted under /api/organizations/:orgId/projects
    if (req.params.orgId) {
      query.org_id = req.params.orgId;
    }
    
    const result = await projectService.getProjects(query);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await projectService.getProject(req.params.id);
    res.status(200).json({ success: true, data: project });
  } catch (error) { next(error); }
};

exports.createProject = async (req, res, next) => {
  try {
    const data = { ...req.body };
    // If mounted under /api/organizations/:orgId/projects
    if (req.params.orgId) {
      data.organization_id = req.params.orgId;
    }
    
    const project = await projectService.createProject(data);
    res.status(201).json({ success: true, data: project });
  } catch (error) { next(error); }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    res.status(200).json({ success: true, data: project });
  } catch (error) { next(error); }
};

exports.deleteProject = async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.id);
    res.status(204).send();
  } catch (error) { next(error); }
};
