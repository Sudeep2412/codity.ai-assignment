const jobService = require('../services/job.service');
const { BadRequestError } = require('../utils/errors');

exports.burstSimulate = async (req, res, next) => {
  try {
    const { queueId, count = 10, jobType = 'simulation', failProbability = 0.1, durationMs = 1000 } = req.body;
    
    if (!queueId) {
      throw new BadRequestError('queueId is required for simulation burst');
    }
    
    const numCount = parseInt(count, 10);
    if (isNaN(numCount) || numCount <= 0 || numCount > 1000) {
      throw new BadRequestError('count must be between 1 and 1000');
    }

    const jobs = Array.from({ length: numCount }).map(() => ({
      type: jobType,
      payload: {
        failProbability: parseFloat(failProbability),
        durationMs: parseInt(durationMs, 10),
        items: Math.floor(Math.random() * 100)
      }
    }));

    const result = await jobService.createBatchJobs(queueId, jobs);
    
    res.status(201).json({ 
      success: true, 
      message: `Successfully burst created ${numCount} jobs`,
      data: result 
    });
  } catch (error) {
    next(error);
  }
};
