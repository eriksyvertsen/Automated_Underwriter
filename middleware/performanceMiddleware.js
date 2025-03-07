// middleware/performanceMiddleware.js

const healthCheckService = require('../services/healthCheckService');

/**
 * Middleware to track API performance
 */
const trackApiPerformance = (req, res, next) => {
  // Get start time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture response time
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Track request in health check service
    healthCheckService.incrementCounter('api_calls');
    healthCheckService.recordTimer('api_response_time', responseTime);

    // Additional tracking for specific endpoints
    if (req.path.includes('/reports') && req.method === 'POST') {
      if (req.path.includes('/generate')) {
        healthCheckService.incrementCounter('report_generations');
      }
    }

    // Call original end function
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  trackApiPerformance
};