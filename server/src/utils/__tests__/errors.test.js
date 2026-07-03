const { AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../errors');

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should set all properties correctly', () => {
      const err = new AppError('test msg', 500, 'TEST_CODE', { field: 'value' });
      expect(err.message).toBe('test msg');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('TEST_CODE');
      expect(err.details).toEqual({ field: 'value' });
      expect(err.isOperational).toBe(true);
      expect(err).toBeInstanceOf(Error);
    });

    it('should have a proper stack trace', () => {
      const err = new AppError('test', 500, 'TEST');
      expect(err.stack).toBeDefined();
    });
  });

  describe('BadRequestError', () => {
    it('should have status 400', () => {
      const err = new BadRequestError();
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('should accept custom message and code', () => {
      const err = new BadRequestError('Invalid input', 'VALIDATION_ERROR', { name: 'required' });
      expect(err.message).toBe('Invalid input');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual({ name: 'required' });
    });
  });

  describe('UnauthorizedError', () => {
    it('should have status 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should have status 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404', () => {
      const err = new NotFoundError('Resource not found');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should have status 409', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
    });
  });
});
