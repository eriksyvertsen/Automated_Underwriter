// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  // Determine status code based on error type or default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Send error response
  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

// Custom error class for API errors
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message) {
    return new ApiError(message || 'Bad Request', 400);
  }

  static unauthorized(message) {
    return new ApiError(message || 'Unauthorized', 401);
  }

  static forbidden(message) {
    return new ApiError(message || 'Forbidden', 403);
  }

  static notFound(message) {
    return new ApiError(message || 'Not Found', 404);
  }

  static conflict(message) {
    return new ApiError(message || 'Conflict', 409);
  }

  static tooMany(message) {
    return new ApiError(message || 'Too Many Requests', 429);
  }

  static internal(message) {
    return new ApiError(message || 'Internal Server Error', 500);
  }
}

// Async handler to catch errors in async functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  ApiError,
  asyncHandler
};