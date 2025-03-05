const authService = require('../services/authService');

// Authentication middleware for protecting routes
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = authService.verifyToken(token);

    // Add user data to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token, authorization denied' });
  }
};

// Authorization middleware for role-based access control
const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const role = req.user.role;

      // Allow if user role is in the allowed roles list
      if (roles.length && !roles.includes(role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(403).json({ error: 'Authorization failed' });
    }
  };
};

module.exports = {
  authenticate,
  authorize
};