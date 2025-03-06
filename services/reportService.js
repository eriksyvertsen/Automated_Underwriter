// services/reportService.js
// This file now simply re-exports the enhancedReportService
// to maintain compatibility with existing code while standardizing on
// the enhanced implementation

const enhancedReportService = require('./enhancedReportService');

// Export the enhanced service directly
module.exports = enhancedReportService;