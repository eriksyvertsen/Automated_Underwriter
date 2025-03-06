const { errorHandler, ApiError, asyncHandler } = require('../../utils/errorHandler');

describe('Error Handler Utilities', () => {
  describe('errorHandler middleware', () => {
    let req, res, next;
    let consoleErrorSpy;

    beforeEach(() => {
      req = {};
      res = { statusCode: 200, status: jest.fn(() => res), json: jest.fn(() => res) };
      next = jest.fn();
      // Initialize spy on each test
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore spy after each test
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should handle errors with status codes', () => {
      const error = new Error('Test error');

      // In the actual implementation, res.statusCode is used, not error.statusCode
      // So we need to set the status code on the response object
      res.statusCode = 400;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Test error'
      }));
    });

    it('should default to 500 status code if res.statusCode is 200', () => {
      const error = new Error('Server error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Server error'
      }));
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Dev error');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        stack: 'Error stack trace'
      }));

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Production error');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.not.objectContaining({
        stack: expect.anything()
      }));

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('ApiError class', () => {
    it('should create an error with the correct properties', () => {
      const error = new ApiError('Test message', 400);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ApiError');
    });

    it('should create a bad request error', () => {
      const error = ApiError.badRequest('Bad request');

      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('should create an unauthorized error', () => {
      const error = ApiError.unauthorized();

      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('should use default messages if none provided', () => {
      const error = ApiError.notFound();

      expect(error.message).toBe('Not Found');
    });
  });

  describe('asyncHandler', () => {
    it('should wrap an async function and handle errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = asyncHandler(mockFn);

      const req = {};
      const res = {};
      const next = jest.fn();

      await wrappedFn(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass resolved values through', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(mockFn);

      const req = {};
      const res = {};
      const next = jest.fn();

      await wrappedFn(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });
});