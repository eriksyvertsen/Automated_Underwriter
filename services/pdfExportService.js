// services/pdfExportService.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class PDFExportService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'report-exports');
    this.initPromise = this.init();
  }

  async init() {
    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('PDFExportService initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing PDFExportService:', error);
      return false;
    }
  }

  /**
   * Generate HTML content for a report
   */
  generateReportHTML(report) {
    // Create HTML structure with proper styling
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${report.companyName} - Underwriting Report</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
          }
          .report-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ccc;
          }
          .report-title {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .report-subtitle {
            font-size: 18px;
            color: #666;
          }
          .report-meta {
            margin-top: 20px;
            font-size: 14px;
            color: #777;
          }
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 22px;
            margin-bottom: 15px;
            color: #2a5885;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          .section-content {
            font-size: 16px;
          }
          .section-content p {
            margin-bottom: 15px;
          }
          .section-content ul, .section-content ol {
            margin-bottom: 15px;
            padding-left: 20px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .metrics-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 20px;
            justify-content: space-between;
          }
          .metric-box {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            min-width: 150px;
            background-color: #f9f9f9;
            flex-grow: 1;
            text-align: center;
          }
          .metric-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #2a5885;
          }
          .metric-desc {
            font-size: 12px;
            color: #888;
            margin-top: 5px;
          }
          .risk-high {
            color: #d9534f;
          }
          .risk-medium {
            color: #f0ad4e;
          }
          .risk-low {
            color: #5cb85c;
          }
          @media print {
            body {
              padding: 0;
              font-size: 12pt;
            }
            .section {
              page-break-inside: avoid;
            }
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1 class="report-title">${report.companyName}</h1>
          <div class="report-subtitle">Underwriting Report</div>
          <div class="report-meta">
            Generated: ${new Date(report.updatedAt).toLocaleDateString()} | 
            Template: ${this.capitalizeFirst(report.templateType)} |
            Confidential
          </div>
        </div>

        ${this.renderSections(report.sections)}

        <div class="footer">
          <p>This report was generated using AI technology. The information presented is for informational purposes only and should not be considered as financial advice.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Render all sections of the report in HTML
   */
  renderSections(sections) {
    // Sort sections in logical order
    const orderedSections = this.orderSections(sections);

    return orderedSections.map(section => {
      // Format content
      const content = this.formatSectionContent(section.content);

      // Add visualizations if available
      const visualizations = this.renderVisualizations(section);

      return `
        <div class="section">
          <h2 class="section-title">${section.title}</h2>
          ${visualizations}
          <div class="section-content">
            ${content}
          </div>
        </div>
      `;
    }).join('\n');
  }

  /**
   * Order sections in a logical flow
   */
  orderSections(sections) {
    // Define optimal order
    const sectionOrder = [
      'executiveSummary',
      'companyOverview',
      'managementAnalysis',
      'marketAnalysis',
      'competitiveAnalysis',
      'financialAnalysis',
      'valuationAnalysis',
      'riskAssessment',
      'investmentRecommendation'
    ];

    // Sort based on the predefined order
    return [...sections].sort((a, b) => {
      const indexA = sectionOrder.indexOf(a.type);
      const indexB = sectionOrder.indexOf(b.type);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  }

  /**
   * Format section content with proper HTML
   */
  formatSectionContent(content) {
    if (!content) return '<p>No content available</p>';

    // Format paragraphs
    let formatted = content.replace(/\n\n/g, '</p><p>');
    formatted = '<p>' + formatted + '</p>';

    // Format bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Format italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Format headers
    formatted = formatted.replace(/^### (.*?)$/gm, '<h5>$1</h5>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^# (.*?)$/gm, '<h3>$1</h3>');

    // Format bullet lists
    formatted = formatted.replace(/^\s*- (.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/<li>(.*?)<\/li>\s*<li>/gs, '<li>$1</li>\n<li>');
    formatted = formatted.replace(/<li>(.*?)<\/li>/gs, '<ul><li>$1</li></ul>');
    formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');

    // Format numbered lists
    formatted = formatted.replace(/^\s*\d+\. (.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/<li>(.*?)<\/li>\s*<li>/gs, '<li>$1</li>\n<li>');
    formatted = formatted.replace(/<li>(.*?)<\/li>/gs, '<ol><li>$1</li></ol>');
    formatted = formatted.replace(/<\/ol>\s*<ol>/g, '');

    return formatted;
  }

  /**
   * Render visualizations for a section
   */
  renderVisualizations(section) {
    if (!section.data) return '';

    let visualizationHTML = '';

    // Add metrics if available
    if (section.data.metrics && section.data.metrics.length > 0) {
      visualizationHTML += `
        <div class="metrics-container">
          ${section.data.metrics.map(metric => `
            <div class="metric-box">
              <div class="metric-title">${metric.name}</div>
              <div class="metric-value ${this.getMetricClass(metric)}">${metric.value}</div>
              <div class="metric-desc">${metric.description || ''}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Add tables for chart data
    if (section.data.charts) {
      for (const [chartName, chart] of Object.entries(section.data.charts)) {
        if (chart.data && chart.data.length > 0) {
          visualizationHTML += `
            <table>
              <caption>${chart.title || 'Data'}</caption>
              <thead>
                <tr>
                  <th>${this.getFirstProperty(chart.data[0])}</th>
                  <th>${this.getSecondProperty(chart.data[0])}</th>
                </tr>
              </thead>
              <tbody>
                ${chart.data.map(item => `
                  <tr>
                    <td>${item[this.getFirstProperty(item)]}</td>
                    <td>${item[this.getSecondProperty(item)]}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
      }
    }

    return visualizationHTML;
  }

  /**
   * Get a CSS class for a metric based on its type
   */
  getMetricClass(metric) {
    if (metric.type === 'risk') {
      if (metric.value > 70) return 'risk-high';
      if (metric.value > 30) return 'risk-medium';
      return 'risk-low';
    }
    return '';
  }

  /**
   * Get the first property name of an object
   */
  getFirstProperty(obj) {
    return Object.keys(obj)[0] || 'Name';
  }

  /**
   * Get the second property name of an object
   */
  getSecondProperty(obj) {
    return Object.keys(obj)[1] || 'Value';
  }

  /**
   * Capitalize the first letter of a string
   */
  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate a PDF file from a report
   */
  async generatePDF(report) {
    try {
      await this.initPromise;

      // In a production environment, we'd use a real PDF generation library
      // For the Replit MVP, we'll create an HTML file that can be converted to PDF in the browser

      // Generate HTML content
      const htmlContent = this.generateReportHTML(report);

      // Create a unique filename
      const filename = `report_${report._id}_${Date.now()}.html`;
      const filePath = path.join(this.tempDir, filename);

      // Write HTML file
      await fs.writeFile(filePath, htmlContent, 'utf8');

      // Return metadata
      return {
        filename,
        path: filePath,
        type: 'html', // In production this would be 'pdf'
        generatedAt: new Date(),
        size: htmlContent.length // This would be the PDF file size in production
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Clean up old export files
   */
  async cleanupExports(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        if (file.startsWith('report_')) {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > maxAgeMs) {
            await fs.unlink(filePath);
            console.log(`Deleted old export file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up exports:', error);
    }
  }

  /**
   * Get a previously generated export file
   */
  async getExportFile(filename) {
    try {
      const filePath = path.join(this.tempDir, filename);

      // Check if file exists
      await fs.access(filePath);

      // Return the file contents
      return {
        path: filePath,
        content: await fs.readFile(filePath, 'utf8'),
        exists: true
      };
    } catch (error) {
      console.error('Error getting export file:', error);
      return { exists: false };
    }
  }
}

// Export a single instance 
const pdfExportService = new PDFExportService();
module.exports = pdfExportService;