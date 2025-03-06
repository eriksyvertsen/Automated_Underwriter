// controllers/exportController.js
const ReportService = require('../services/reportService');
const pdfExportService = require('../services/pdfExportService');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const path = require('path');

/**
 * Generate and export a report in the requested format
 */
const exportReport = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const format = req.query.format || 'pdf';

    // Validate requested format
    const supportedFormats = ['pdf', 'html'];
    if (!supportedFormats.includes(format)) {
      return res.status(400).json({ 
        error: `Unsupported format: ${format}. Supported formats are: ${supportedFormats.join(', ')}` 
      });
    }

    // Get the report
    const report = await enhancedReportService.getReportById(reportId, userId);

    // Generate the export
    let exportData;
    if (format === 'pdf' || format === 'html') {
      exportData = await pdfExportService.generatePDF(report);
    }

    // Return export metadata
    res.status(200).json({
      exportId: path.basename(exportData.path),
      reportId: reportId,
      format: format,
      generatedAt: exportData.generatedAt,
      downloadUrl: `/api/reports/${reportId}/download/${path.basename(exportData.path)}`,
      size: exportData.size
    });
  } catch (error) {
    console.error('Export report error:', error);
    if (error.message === 'Report not found') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Failed to export report' });
  }
});

/**
 * Download a previously generated export
 */
const downloadExport = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const exportId = req.params.exportId;

    // Verify report access
    await enhancedReportService.getReportById(reportId, userId);

    // Get the export file
    const exportFile = await pdfExportService.getExportFile(exportId);

    if (!exportFile.exists) {
      return res.status(404).json({ error: 'Export not found or expired' });
    }

    // Set headers based on file type
    if (exportId.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${reportId}_report.html"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportId}_report.pdf"`);
    }

    // Send the file
    res.send(exportFile.content);
  } catch (error) {
    console.error('Download export error:', error);
    if (error.message === 'Report not found') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Failed to download export' });
  }
});

/**
 * Export a specific section of a report
 */
const exportSection = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const sectionId = req.params.sectionId;
    const format = req.query.format || 'pdf';

    // Validate requested format
    const supportedFormats = ['pdf', 'html'];
    if (!supportedFormats.includes(format)) {
      return res.status(400).json({ 
        error: `Unsupported format: ${format}. Supported formats are: ${supportedFormats.join(', ')}` 
      });
    }

    // Get the report
    const report = await enhancedReportService.getReportById(reportId, userId);

    // Find the requested section
    const section = report.sections.find(s => s.id === sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Create a modified report with only the requested section
    const modifiedReport = {
      ...report,
      sections: [section]
    };

    // Generate the export
    let exportData;
    if (format === 'pdf' || format === 'html') {
      exportData = await pdfExportService.generatePDF(modifiedReport);
    }

    // Return export metadata
    res.status(200).json({
      exportId: path.basename(exportData.path),
      reportId: reportId,
      sectionId: sectionId,
      format: format,
      generatedAt: exportData.generatedAt,
      downloadUrl: `/api/reports/${reportId}/sections/${sectionId}/download/${path.basename(exportData.path)}`,
      size: exportData.size
    });
  } catch (error) {
    console.error('Export section error:', error);
    if (error.message === 'Report not found') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Failed to export section' });
  }
});

/**
 * Download a previously generated section export
 */
const downloadSectionExport = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const sectionId = req.params.sectionId;
    const exportId = req.params.exportId;

    // Verify report access
    await enhancedReportService.getReportById(reportId, userId);

    // Get the export file
    const exportFile = await pdfExportService.getExportFile(exportId);

    if (!exportFile.exists) {
      return res.status(404).json({ error: 'Export not found or expired' });
    }

    // Set headers based on file type
    if (exportId.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${reportId}_${sectionId}.html"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportId}_${sectionId}.pdf"`);
    }

    // Send the file
    res.send(exportFile.content);
  } catch (error) {
    console.error('Download section export error:', error);
    if (error.message === 'Report not found') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Failed to download section export' });
  }
});

module.exports = {
  exportReport,
  downloadExport,
  exportSection,
  downloadSectionExport
};