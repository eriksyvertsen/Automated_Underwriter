// controllers/reportController.js
const enhancedReportService = require('../services/enhancedReportService');
const dataService = require('../services/dataService');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const { validationSchemas, validateBody } = require('../utils/validation');

// Create a new report
const createReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyDetails = req.body;

    // Validate minimal required fields
    if (!companyDetails.name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!companyDetails.description) {
      return res.status(400).json({ error: 'Company description is required' });
    }

    // Create the report with minimal data
    const report = await enhancedReportService.createReport(userId, companyDetails);

    res.status(201).json({
      reportId: report._id,
      status: report.status,
      message: 'Report created successfully. Further company details will be automatically researched.'
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// Get all reports for the user
const getReports = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all reports for the user
    const reports = await enhancedReportService.getReportsByUser(userId);

    res.status(200).json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Get a specific report
const getReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;

    // Get the report
    const report = await enhancedReportService.getReportById(reportId, userId);

    res.status(200).json({ report });
  } catch (error) {
    console.error('Get report error:', error);
    if (error.message === 'Report not found') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// Update a report
const updateReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const updates = req.body;

    // Update the report
    const updatedReport = await enhancedReportService.updateReport(reportId, userId, updates);

    res.status(200).json({ report: updatedReport });
  } catch (error) {
    console.error('Update report error:', error);
    if (error.message === 'Report not found or not authorized') {
      return res.status(404).json({ error: 'Report not found or not authorized' });
    }
    res.status(500).json({ error: 'Failed to update report' });
  }
};

// Delete a report
const deleteReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;

    // Delete the report
    const result = await enhancedReportService.deleteReport(reportId, userId);

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    if (error.message === 'Report not found or not authorized') {
      return res.status(404).json({ error: 'Report not found or not authorized' });
    }
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// Generate a report section
const generateSection = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const { sectionType, companyData } = req.body;

    // Validate inputs
    if (!sectionType) {
      return res.status(400).json({ error: 'Section type is required' });
    }

    if (!companyData) {
      return res.status(400).json({ error: 'Company data is required' });
    }

    // Normalize company data
    const normalizedData = await dataService.normalizeCompanyData(companyData);

    // Generate the section
    const section = await enhancedReportService.generateReportSection(
      reportId,
      userId,
      sectionType,
      normalizedData
    );

    res.status(200).json({ section });
  } catch (error) {
    console.error('Generate section error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to generate section' });
  }
};

// Queue full report generation with auto-research
const generateReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const { companyData, templateType } = req.body;

    // Validate minimal inputs
    if (!companyData || !companyData.name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Start report generation (non-blocking)
    const jobId = `report-${reportId}-${Date.now()}`;

    // Update report status to queued
    await enhancedReportService.updateReport(reportId, userId, {
      status: 'queued',
      generationJobId: jobId
    });

    // Queue the job and return the job ID
    res.status(202).json({
      jobId,
      reportId,
      status: 'queued',
      message: 'Report generation started. Company data will be automatically researched.'
    });

    // Start generation in the background
    enhancedReportService.generateFullReport(reportId, userId, companyData, templateType)
      .catch(error => {
        console.error('Background report generation error:', error);
      });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to start report generation' });
  }
};

// Check report generation status
const getGenerationStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;

    // Check the status
    const status = await enhancedReportService.checkGenerationStatus(reportId, userId);

    res.status(200).json(status);
  } catch (error) {
    console.error('Check generation status error:', error);
    res.status(500).json({ error: 'Failed to check generation status' });
  }
};

module.exports = {
  createReport,
  getReports,
  getReport,
  updateReport,
  deleteReport,
  generateSection,
  generateReport,
  getGenerationStatus
};