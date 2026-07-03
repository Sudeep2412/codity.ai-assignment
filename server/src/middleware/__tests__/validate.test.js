const validate = require('../validate');
const Joi = require('joi');

describe('Validate Middleware', () => {
  const schema = Joi.object({
    name: Joi.string().required(),
    age: Joi.number().integer().min(1).required(),
  });

  const mockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  it('should call next() with validated value on valid input', () => {
    const req = { body: { name: 'John', age: 25, extraField: 'removed' } };
    const res = mockRes();
    const next = jest.fn();

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // Called with no error
    // stripUnknown should remove extraField
    expect(req.body).toEqual({ name: 'John', age: 25 });
  });

  it('should call next with BadRequestError on invalid input', () => {
    const req = { body: { name: '' } };
    const res = mockRes();
    const next = jest.fn();

    const middleware = validate(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate query params when property is "query"', () => {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
    });

    const req = { query: { page: '3' } };
    const res = mockRes();
    const next = jest.fn();

    const middleware = validate(querySchema, 'query');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 3 });
  });

  it('should collect all validation errors (abortEarly: false)', () => {
    const req = { body: {} }; // Missing both name and age
    const res = mockRes();
    const next = jest.fn();

    const middleware = validate(schema);
    middleware(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error.details).toBeDefined();
    // Should have errors for both 'name' and 'age'
    expect(Object.keys(error.details).length).toBeGreaterThanOrEqual(2);
  });
});
