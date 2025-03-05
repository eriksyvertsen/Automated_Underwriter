const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Register a new user (limited to prevent abuse)
router.post('/register', authLimiter, authController.register);

// Login user (limited to prevent brute force)
router.post('/login', authLimiter, authController.login);

// Get current user (requires authentication)
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;