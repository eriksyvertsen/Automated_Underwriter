// middleware/adminAuth.js

const { ApiError } = require('../utils/errorHandler');
const { getCollection } = require('../config/db');

/**
 * Middleware to verify the user is an admin
 * This adds an additional layer of security by checking the database
 * to ensure the user still has admin privileges
 */
const verifyAdmin = async (req, res, next) => {
  try {
    // Check if user object exists and has userId
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get users collection
    const usersCollection = await getCollection('users');

    // Find user in database
    const user = await usersCollection.findOne({ _id: req.user.userId });

    // Check if user exists and has admin role
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Enhance req.user with additional admin info
    req.user.adminSince = user.adminSince;
    req.user.adminPermissions = user.adminPermissions || ['view', 'edit'];

    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ error: 'Server error during admin verification' });
  }
};

/**
 * Middleware to log admin actions
 * This logs all admin actions for audit purposes
 */
const logAdminAction = async (req, res, next) => {
  // Store the original send function
  const originalSend = res.send;

  // Get admin action from URL
  const actionPath = req.originalUrl;
  const method = req.method;
  const adminId = req.user.userId;
  const actionData = {
    method,
    path: actionPath,
    body: req.method === 'GET' ? null : req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    timestamp: new Date()
  };

  // Replace the original send function with a wrapper
  res.send = function(data) {
    // Log the action
    logAction(adminId, actionData, res.statusCode, data)
      .catch(err => console.error('Error logging admin action:', err));

    // Call the original send function
    return originalSend.apply(this, arguments);
  };

  // Continue to next middleware
  next();
};

/**
 * Helper function to log admin actions to database
 */
async function logAction(adminId, actionData, statusCode, responseData) {
  try {
    // Get admin logs collection
    const logsCollection = await getCollection('adminLogs');

    // Create log entry
    const logEntry = {
      adminId,
      action: actionData,
      response: {
        statusCode,
        timestamp: new Date()
      }
    };

    // Insert log entry
    await logsCollection.insertOne(logEntry);
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

module.exports = {
  verifyAdmin,
  logAdminAction
};