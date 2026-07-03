const Joi = require('joi');
const { BadRequestError } = require('../utils/errors');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.reduce((acc, current) => {
        acc[current.path.join('.')] = current.message;
        return acc;
      }, {});

      return next(new BadRequestError('Validation failed', 'VALIDATION_ERROR', details));
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

module.exports = validate;
