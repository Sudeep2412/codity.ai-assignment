const jobService = require('../services/job.service');

exports.createJob = async (req, res, next) => {
  try {
    const result = await jobService.createJob(req.params.queueId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createBatchJobs = async (req, res, next) => {
  try {
    const result = await jobService.createBatchJobs(req.params.queueId, req.body.jobs);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createScheduledJob = async (req, res, next) => {
  try {
    const result = await jobService.createScheduledJob(req.params.queueId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.listJobs = async (req, res, next) => {
  try {
    const result = await jobService.listJobs(req.params.queueId, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

exports.listAllJobs = async (req, res, next) => {
  try {
    const result = await jobService.listAllJobs(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

exports.getJob = async (req, res, next) => {
  try {
    const result = await jobService.getJob(req.params.jobId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.cancelJob = async (req, res, next) => {
  try {
    const result = await jobService.cancelJob(req.params.jobId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.retryJob = async (req, res, next) => {
  try {
    const result = await jobService.retryJob(req.params.jobId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getJobLogs = async (req, res, next) => {
  try {
    const result = await jobService.getJobLogs(req.params.jobId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
