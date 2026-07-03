const dlqService = require('../services/dlq.service');

exports.listDLQEntries = async (req, res, next) => {
  try {
    const entries = await dlqService.getDLQEntries(req.params.queueId, req.query);
    res.status(200).json({ success: true, data: entries });
  } catch (err) { next(err); }
};

exports.listAllDLQEntries = async (req, res, next) => {
  try {
    const entries = await dlqService.getAllDLQEntries(req.query);
    res.status(200).json({ success: true, data: entries });
  } catch (err) { next(err); }
};

exports.retryDLQEntry = async (req, res, next) => {
  try {
    const job = await dlqService.retryDLQEntry(req.params.entryId);
    res.status(200).json({ success: true, data: job });
  } catch (err) { next(err); }
};

exports.discardDLQEntry = async (req, res, next) => {
  try {
    const entry = await dlqService.discardDLQEntry(req.params.entryId);
    res.status(200).json({ success: true, data: entry });
  } catch (err) { next(err); }
};
