// routes/admin.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { standardLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// System metrics
router.get('/metrics', standardLimiter, adminController.getSystemMetrics);

// System health
router.get('/health', standardLimiter, adminController.getSystemHealth);

// Usage data for charts
router.get('/usage', standardLimiter, adminController.getUsageData);

// Job queue status
router.get('/jobs', standardLimiter, adminController.getJobQueueStatus);

// API response times
router.get('/response-times', standardLimiter, adminController.getApiResponseTimes);

// Recent activity
router.get('/activity', standardLimiter, adminController.getRecentActivity);

// Maintenance actions
router.post('/maintenance', standardLimiter, adminController.performMaintenance);

module.exports = router;