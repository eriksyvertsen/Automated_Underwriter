const { errorHandler, ApiError, asyncHandler } = require('../../utils/errorHandler');

describe('Error Handler Utilities', () => {
  describe('errorHandler middleware', () => {
    let req, res, next;
    let consoleErrorSpy;

    beforeEach(() => {
      req = {};
      res = { statusCode: 200, status: jest.fn(() => res), json: jest.fn(() => res) };
      next = jest.fn();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should handle errors with status codes', () => {
      // Test implementation
    });

    // More tests...
  });

  // More tests...
});
