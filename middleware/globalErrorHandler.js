// middleware/globalErrorHandler.js

const errorTrackingService = require('../services/errorTrackingService');

/**
 * Global error handling middleware with enhanced tracking
 */
const globalErrorHandler = (err, req, res, next) => {
  // Track the error
  const errorContext = {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.userId,
    body: req.body ? JSON.stringify(req.body).substring(0, 500) : null,
    query: req.query ? JSON.stringify(req.query) : null,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  };

  errorTrackingService.trackError(err, errorContext);

  // Determine status code based on error type or default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Create user-friendly error message
  let userMessage = 'An unexpected error occurred';

  if (err.name === 'ValidationError') {
    userMessage = err.message;
  } else if (err.name === 'ApiError') {
    userMessage = err.message;
  } else if (err.name === 'AuthenticationError') {
    userMessage = 'Authentication failed. Please log in again.';
  } else if (err.name === 'NotFoundError') {
    userMessage = 'The requested resource was not found.';
  } else if (process.env.NODE_ENV === 'development') {
    // In development, use the actual error message
    userMessage = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    error: userMessage,
    errorId: new Date().getTime(), // Simple error ID for tracking
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = globalErrorHandler;