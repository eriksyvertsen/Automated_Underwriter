// routes/reports.js

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const exportController = require('../controllers/exportController');
const customizationController = require('../controllers/customizationController');
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

// Export a full report
router.get('/:id/export', 
  standardLimiter, 
  exportController.exportReport
);

// Download exported report
router.get('/:id/download/:exportId', 
  standardLimiter, 
  exportController.downloadExport
);

// Export a specific section
router.get('/:id/sections/:sectionId/export', 
  standardLimiter, 
  exportController.exportSection
);

// Download exported section
router.get('/:id/sections/:sectionId/download/:exportId', 
  standardLimiter, 
  exportController.downloadSectionExport
);

// ===== New Customization Routes =====

// Get report customization options
router.get('/:id/customization', 
  standardLimiter, 
  customizationController.getCustomization
);

// Update report customization options
router.put('/:id/customization', 
  standardLimiter, 
  customizationController.updateCustomization
);

// Get available section types and themes
router.get('/options/sections', 
  standardLimiter, 
  customizationController.getAvailableSections
);

// Get template preview
router.get('/templates/:templateType', 
  standardLimiter, 
  customizationController.getTemplatePreview
);

// Submit feedback on report quality
router.post('/:id/feedback', 
  standardLimiter, 
  reportController.submitFeedback
);

module.exports = router;