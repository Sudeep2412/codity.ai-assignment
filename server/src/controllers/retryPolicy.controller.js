const retryPolicyService = require('../services/retryPolicy.service');

exports.getRetryPolicies = async (req, res, next) => {
  try {
    const result = await retryPolicyService.getRetryPolicies(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getRetryPolicy = async (req, res, next) => {
  try {
    const policy = await retryPolicyService.getRetryPolicy(req.params.id);
    res.status(200).json({ success: true, data: policy });
  } catch (error) { next(error); }
};

exports.createRetryPolicy = async (req, res, next) => {
  try {
    const policy = await retryPolicyService.createRetryPolicy(req.body);
    res.status(201).json({ success: true, data: policy });
  } catch (error) { next(error); }
};

exports.updateRetryPolicy = async (req, res, next) => {
  try {
    const policy = await retryPolicyService.updateRetryPolicy(req.params.id, req.body);
    res.status(200).json({ success: true, data: policy });
  } catch (error) { next(error); }
};

exports.deleteRetryPolicy = async (req, res, next) => {
  try {
    await retryPolicyService.deleteRetryPolicy(req.params.id);
    res.status(204).send();
  } catch (error) { next(error); }
};
