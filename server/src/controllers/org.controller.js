const orgService = require('../services/org.service');

exports.getOrganizations = async (req, res, next) => {
  try {
    const result = await orgService.getOrganizations(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getOrganization = async (req, res, next) => {
  try {
    const org = await orgService.getOrganization(req.params.id);
    res.status(200).json({ success: true, data: org });
  } catch (error) { next(error); }
};

exports.createOrganization = async (req, res, next) => {
  try {
    const org = await orgService.createOrganization(req.body);
    res.status(201).json({ success: true, data: org });
  } catch (error) { next(error); }
};

exports.updateOrganization = async (req, res, next) => {
  try {
    const org = await orgService.updateOrganization(req.params.id, req.body);
    res.status(200).json({ success: true, data: org });
  } catch (error) { next(error); }
};

exports.deleteOrganization = async (req, res, next) => {
  try {
    await orgService.deleteOrganization(req.params.id);
    res.status(204).send();
  } catch (error) { next(error); }
};
