const db = require('../config/database');
const { ForbiddenError } = require('../utils/errors');

exports.requireProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    if (!projectId) return next();

    const project = await db('projects').where({ id: projectId }).first();
    if (!project) return next(); // Not Found will be handled by controller

    if (req.user.role === 'admin') return next();

    const member = await db('org_members')
      .where({ org_id: project.org_id, user_id: req.user.id })
      .first();

    if (!member) {
      return next(new ForbiddenError('You do not have access to this project'));
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.requireQueueAccess = async (req, res, next) => {
  try {
    const queueId = req.params.queueId;
    if (!queueId) return next();

    const queue = await db('queues').where({ id: queueId }).first();
    if (!queue) return next();

    const project = await db('projects').where({ id: queue.project_id }).first();
    if (!project) return next();

    if (req.user.role === 'admin') return next();

    const member = await db('org_members')
      .where({ org_id: project.org_id, user_id: req.user.id })
      .first();

    if (!member) {
      return next(new ForbiddenError('You do not have access to this queue'));
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.requireJobAccess = async (req, res, next) => {
  try {
    const jobId = req.params.jobId;
    if (!jobId) return next();

    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) return next();

    // Call the queue access logic
    req.params.queueId = job.queue_id;
    exports.requireQueueAccess(req, res, next);
  } catch (err) {
    next(err);
  }
};

exports.requireDlqAccess = async (req, res, next) => {
  try {
    const entryId = req.params.entryId;
    if (!entryId) return next();

    const entry = await db('dead_letter_queue').where({ id: entryId }).first();
    if (!entry) return next();

    // Call the queue access logic
    req.params.queueId = entry.queue_id;
    exports.requireQueueAccess(req, res, next);
  } catch (err) {
    next(err);
  }
};
