const queueService = require('../services/queue.service');

exports.createQueue = async (req, res, next) => {
  try {
    const result = await queueService.createQueue(req.params.projectId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.listQueues = async (req, res, next) => {
  try {
    const result = await queueService.listQueues(req.params.projectId, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

exports.listAllQueues = async (req, res, next) => {
  try {
    const result = await queueService.listAllQueues(req.user, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

exports.getQueue = async (req, res, next) => {
  try {
    const result = await queueService.getQueue(req.params.queueId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateQueue = async (req, res, next) => {
  try {
    const result = await queueService.updateQueue(req.params.queueId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteQueue = async (req, res, next) => {
  try {
    const result = await queueService.deleteQueue(req.params.queueId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.pauseQueue = async (req, res, next) => {
  try {
    const result = await queueService.setQueueStatus(req.params.queueId, 'paused');
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.resumeQueue = async (req, res, next) => {
  try {
    const result = await queueService.setQueueStatus(req.params.queueId, 'active');
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getQueueStats = async (req, res, next) => {
  try {
    const result = await queueService.getQueueStats(req.params.queueId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
