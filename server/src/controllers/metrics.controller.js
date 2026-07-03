const metricsService = require('../services/metrics.service');

exports.getThroughput = async (req, res, next) => {
  try {
    const data = await metricsService.getThroughput(req.query.timeframe);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getErrorRate = async (req, res, next) => {
  try {
    const data = await metricsService.getErrorRate(req.query.timeframe);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getWorkers = async (req, res, next) => {
  try {
    const data = await metricsService.getWorkerUtilization();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getOverview = async (req, res, next) => {
  try {
    const data = await metricsService.getSystemOverview();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await metricsService.getRecentActivity(limit);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};
