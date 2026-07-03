const metricsService = require('../services/metrics.service');

exports.getWorkers = async (req, res, next) => {
  try {
    // Re-use the existing query from metricsService for now
    // In a fully fleshed out worker service, you might have more specific queries
    const data = await metricsService.getWorkerUtilization();
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
