const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { standardLimiter, reportGenerationLimiter } = require('../middleware/rateLimiter');
const { validateBody, validationSchemas } = require('../utils/validation');

// All routes require authentication
router.use(authenticate);

// Get all reports for the user
router.get('/', standardLimiter, reportController.getReports);

// Create a new report
router.post('/', 
  standardLimiter, 
  validateBody(validationSchemas.report.create()),
  reportController.createReport
);

// Get a specific report
router.get('/:id', standardLimiter, reportController.getReport);

// Update a report
router.put('/:id', standardLimiter, reportController.updateReport);

// Delete a report
router.delete('/:id', standardLimiter, reportController.deleteReport);

// Generate a specific section of a report
router.post('/:id/section', 
  reportGenerationLimiter, 
  reportController.generateSection
);

// Queue full report generation
router.post('/:id/generate', 
  reportGenerationLimiter, 
  reportController.generateReport
);

// Check report generation status
router.get('/:id/status', standardLimiter, reportController.getGenerationStatus);

module.exports = router;