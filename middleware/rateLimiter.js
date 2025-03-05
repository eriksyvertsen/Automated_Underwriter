const { rateLimits } = require('../config/db');

// Create custom rate limiter middleware using Replit Database
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute by default
    max = 60, // 60 requests per minute by default
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip, // Use IP address as default key
  } = options;

  return async (req, res, next) => {
    try {
      // Generate key based on the provided keyGenerator function
      const key = keyGenerator(req);

      // Increment the request count for this key
      const currentRequests = await rateLimits.increment(key, windowMs);

      // Check if the limit has been exceeded
      if (currentRequests > max) {
        return res.status(429).json({ error: message });
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - currentRequests));

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If there's an error with rate limiting, allow the request to proceed
      next();
    }
  };
};

// Pre-configured rate limiters
const standardLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 login attempts per hour
  message: 'Too many login attempts, please try again after an hour',
  keyGenerator: (req) => `auth:${req.ip}`, // Separate key for auth endpoints
});

const reportGenerationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 report generations per hour
  message: 'Report generation limit reached, please try again later',
  keyGenerator: (req) => {
    // If authenticated, use user ID; otherwise, use IP
    return req.user ? `report:${req.user.userId}` : `report:${req.ip}`;
  },
});

module.exports = {
  createRateLimiter,
  standardLimiter,
  authLimiter,
  reportGenerationLimiter,
};