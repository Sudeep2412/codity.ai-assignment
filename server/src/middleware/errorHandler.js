const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      }
    });
  }

  // Joi Validation Errors mapping (fallback if validate.js didn't catch it)
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.details,
      }
    });
  }

  // Generic server error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(env.NODE_ENV === 'development' && { details: err.message, stack: err.stack }),
    }
  });
};

module.exports = errorHandler;
