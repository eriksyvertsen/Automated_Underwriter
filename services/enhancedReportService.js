// services/enhancedReportService.js
const { ObjectId } = require('mongodb');
const { getCollection } = require('../config/db');
const openaiService = require('./openaiService');
const dataService = require('./dataService');

class EnhancedReportService {
  constructor() {
    this.reportsCollection = null;
    this.initialized = false;
    this.initPromise = this.init();
  }

  /**
   * Create a new report
   */
  async createReport(userId, companyDetails) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Create the report object
      const newReport = {
        userId: userId,
        companyName: companyDetails.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        templateType: companyDetails.templateType || 'standard',
        sections: [],
        generationProgress: 0,
        storageLocation: null
      };

      // Insert the report into the database
      const result = await collection.insertOne(newReport);

      // Get the inserted report with its ID
      newReport._id = result.insertedId;

      return newReport;
    } catch (error) {
      console.error('Create report error:', error);
      throw error;
    }
  }

  async init() {
    try {
      this.reportsCollection = await getCollection('reports');
      this.initialized = true;
      console.log('EnhancedReportService initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing EnhancedReportService:', error);
      return false;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
      if (!this.initialized) {
        console.log('Attempting to re-initialize EnhancedReportService...');
        await this.init();
      }
      if (!this.initialized) {
        throw new Error('EnhancedReportService could not be initialized');
      }
    }
    return this.reportsCollection;
  }

  /**
   * Generate a complete report with all selected sections
   */
  async generateFullReport(reportId, userId, companyData, templateType = 'standard') {
    try {
      // Ensure the service is initialized
      await this.ensureInitialized();

      // Update report status to generating
      await this.updateReport(reportId, userId, {
        status: 'generating',
        templateType: templateType
      });

      // Normalize and enrich company data
      const normalizedData = await dataService.normalizeCompanyData(companyData);

      // Determine which sections to generate based on template type
      const sectionsToGenerate = this.getSectionsForTemplate(templateType);

      // Track progress
      let completedSections = 0;
      const totalSections = sectionsToGenerate.length;

      // Process each section
      for (const sectionType of sectionsToGenerate) {
        try {
          await this.generateReportSection(reportId, userId, sectionType, normalizedData);
          completedSections++;

          // Update progress
          await this.updateReport(reportId, userId, {
            generationProgress: (completedSections / totalSections) * 100
          });
        } catch (error) {
          console.error(`Error generating ${sectionType}:`, error);
          // Continue with other sections despite error
        }
      }

      // Update report status to completed
      await this.updateReport(reportId, userId, {
        status: 'completed',
        generationProgress: 100
      });

      return await this.getReportById(reportId, userId);
    } catch (error) {
      console.error('Generate full report error:', error);

      // Update report status to failed
      await this.updateReport(reportId, userId, {
        status: 'failed'
      });

      throw error;
    }
  }

  /**
   * Generate a specific report section
   */
  async generateReportSection(reportId, userId, sectionType, companyData) {
    try {
      // Get the report to ensure it exists and user has access
      const report = await this.getReportById(reportId, userId);

      // Check if this section already exists
      const existingSectionIndex = report.sections.findIndex(s => s.type === sectionType);

      // Generate section content using OpenAI service
      const generatedSection = await openaiService.generateReportSection(
        sectionType,
        companyData
      );

      // Create the section object
      const newSection = {
        id: existingSectionIndex >= 0 ? report.sections[existingSectionIndex].id : new ObjectId().toString(),
        type: sectionType,
        title: this.getSectionTitle(sectionType),
        content: generatedSection.content,
        generatedAt: new Date(),
        edited: false,
        metadata: generatedSection.metadata,
        data: this.extractVisualizationData(sectionType, companyData)
      };

      // Update the report with the new section
      if (existingSectionIndex >= 0) {
        // Replace existing section
        report.sections[existingSectionIndex] = newSection;
      } else {
        // Add new section
        report.sections.push(newSection);
      }

      // Update the report status if needed
      if (report.status === 'draft' || report.status === 'generating') {
        report.status = 'in_progress';
      }

      // Save the updated report
      await this.updateReport(reportId, userId, {
        sections: report.sections,
        status: report.status
      });

      return newSection;
    } catch (error) {
      console.error('Generate report section error:', error);
      throw error;
    }
  }

  /**
   * Extract relevant data for visualizations in each section
   */
  extractVisualizationData(sectionType, companyData) {
    // Based on section type, extract relevant visualization data
    switch (sectionType) {
      case 'financialAnalysis':
        return this.extractFinancialVisualizationData(companyData);
      case 'marketAnalysis':
        return this.extractMarketVisualizationData(companyData);
      case 'riskAssessment':
        return this.extractRiskVisualizationData(companyData);
      default:
        return null; // No visualizations for other sections
    }
  }

  /**
   * Extract financial data for visualizations
   */
  extractFinancialVisualizationData(companyData) {
    const financialData = {
      metrics: [],
      charts: {}
    };

    // Revenue growth chart data
    if (companyData.financials && companyData.financials.growth) {
      const growthData = companyData.financials.growth;

      // Add a revenue growth metric
      if (typeof growthData.rate === 'number') {
        financialData.metrics.push({
          name: 'Revenue Growth',
          value: `${growthData.rate}%`,
          type: 'percentage',
          description: `${growthData.period || 'Annual'} growth rate`
        });
      }
    }

    // Revenue data
    if (companyData.financials && companyData.financials.revenue) {
      const revenue = companyData.financials.revenue;

      if (revenue !== 'N/A') {
        // Add revenue metric
        financialData.metrics.push({
          name: 'Revenue',
          value: revenue.display || `${revenue.currency} ${revenue.value.toLocaleString()}`,
          type: 'currency',
          description: 'Annual revenue'
        });
      }
    }

    // Historical data
    if (companyData.financials && companyData.financials.revenueHistory && Array.isArray(companyData.financials.revenueHistory)) {
      // Create revenue history chart
      financialData.charts.revenueHistory = {
        type: 'line',
        title: 'Revenue History',
        data: companyData.financials.revenueHistory.map(item => ({
          year: item.year,
          value: item.value
        })).sort((a, b) => a.year - b.year)
      };
    }

    // Profitability data
    if (companyData.financials && companyData.financials.profitability && companyData.financials.profitability !== 'N/A') {
      financialData.metrics.push({
        name: 'Profitability',
        value: typeof companyData.financials.profitability === 'string' 
          ? companyData.financials.profitability 
          : `${companyData.financials.profitability}%`,
        type: 'text',
        description: 'Profitability status'
      });
    }

    return financialData;
  }

  /**
   * Extract market data for visualizations
   */
  extractMarketVisualizationData(companyData) {
    const marketData = {
      metrics: [],
      charts: {}
    };

    // Market size
    if (companyData.market && companyData.market.size && companyData.market.size !== 'N/A') {
      const size = companyData.market.size;

      marketData.metrics.push({
        name: 'Market Size',
        value: `${size.size} ${size.unit}`,
        type: 'currency',
        description: `${size.currency} (${size.year})`
      });
    }

    // Market growth
    if (companyData.market && companyData.market.growth && companyData.market.growth !== 'N/A') {
      const growth = companyData.market.growth;

      marketData.metrics.push({
        name: 'Market Growth',
        value: `${growth.rate}%`,
        type: 'percentage',
        description: `${growth.period} (${growth.years || 'current'})`
      });
    }

    // Competitors
    if (companyData.market && companyData.market.competitors && Array.isArray(companyData.market.competitors)) {
      const competitors = companyData.market.competitors;

      // Create competitor chart data
      if (competitors.length > 0) {
        marketData.charts.competitors = {
          type: 'bar',
          title: 'Competitive Landscape',
          data: competitors.map(comp => ({
            name: comp.name,
            value: comp.marketShare || comp.revenue || comp.employees || 50 // Fallback value
          }))
        };
      }
    }

    // Trends
    if (companyData.market && companyData.market.trends && Array.isArray(companyData.market.trends)) {
      marketData.trends = companyData.market.trends;
    }

    return marketData;
  }

  /**
   * Extract risk data for visualizations
   */
  extractRiskVisualizationData(companyData) {
    const riskData = {
      metrics: [],
      charts: {}
    };

    // Risk rating
    if (companyData.risk && companyData.risk.rating) {
      const rating = companyData.risk.rating;

      // Overall risk score
      if (rating.score !== undefined) {
        riskData.metrics.push({
          name: 'Risk Score',
          value: rating.score,
          type: 'score',
          maxValue: 100,
          description: rating.rating
        });
      }
    }

    // Risk factors
    if (companyData.risk && companyData.risk.factors && Array.isArray(companyData.risk.factors)) {
      const factors = companyData.risk.factors;

      // Create risk factors chart
      if (factors.length > 0) {
        riskData.charts.riskFactors = {
          type: 'horizontal-bar',
          title: 'Risk Factors',
          data: factors.map(factor => {
            // Convert severity to numeric value
            let severityValue = 50; // Default medium
            if (factor.severity === 'High') severityValue = 75;
            if (factor.severity === 'Low') severityValue = 25;
            if (factor.severity === 'Very High') severityValue = 90;
            if (factor.severity === 'Very Low') severityValue = 10;

            return {
              name: factor.factor,
              value: severityValue,
              description: factor.description,
              severity: factor.severity
            };
          })
        };
      }
    }

    return riskData;
  }

  /**
   * Get a report by ID
   */
  async getReportById(reportId, userId) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Convert string ID to ObjectId if needed
      const objectId = typeof reportId === 'string' ? new ObjectId(reportId) : reportId;

      // Find the report by ID and user ID for security
      const report = await collection.findOne({ 
        _id: objectId,
        userId: userId
      });

      if (!report) {
        throw new Error('Report not found');
      }

      return report;
    } catch (error) {
      console.error('Get report error:', error);
      throw error;
    }
  }

  /**
   * Update an existing report
   */
  async updateReport(reportId, userId, updates) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Convert string ID to ObjectId if needed
      const objectId = typeof reportId === 'string' ? new ObjectId(reportId) : reportId;

      // Prepare updates object
      const updateData = {
        updatedAt: new Date(),
        ...updates
      };

      // Update the report
      const result = await collection.updateOne(
        { _id: objectId, userId: userId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        throw new Error('Report not found or not authorized');
      }

      // Return the updated report
      return await this.getReportById(reportId, userId);
    } catch (error) {
      console.error('Update report error:', error);
      throw error;
    }
  }

  /**
   * Get all reports for a user
   */
  async getReportsByUser(userId) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Find all reports for the user
      const reports = await collection.find({ userId: userId })
        .sort({ updatedAt: -1 })
        .toArray();

      return reports;
    } catch (error) {
      console.error('Get reports error:', error);
      throw error;
    }
  }

  /**
   * Get the section title based on section type
   */
  getSectionTitle(sectionType) {
    const titles = {
      executiveSummary: 'Executive Summary',
      companyOverview: 'Company Overview',
      marketAnalysis: 'Market Analysis',
      financialAnalysis: 'Financial Analysis',
      riskAssessment: 'Risk Assessment',
      investmentRecommendation: 'Investment Recommendation',
      competitiveAnalysis: 'Competitive Analysis',
      managementAnalysis: 'Management Analysis',
      valuationAnalysis: 'Valuation Analysis'
    };

    return titles[sectionType] || sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
  }

  /**
   * Get the sections to generate based on template type
   */
  getSectionsForTemplate(templateType) {
    const templates = {
      standard: [
        'executiveSummary', 
        'companyOverview', 
        'marketAnalysis', 
        'financialAnalysis', 
        'riskAssessment', 
        'investmentRecommendation'
      ],
      basic: [
        'executiveSummary', 
        'companyOverview', 
        'riskAssessment'
      ],
      financial: [
        'executiveSummary', 
        'financialAnalysis', 
        'valuationAnalysis',
        'investmentRecommendation'
      ],
      comprehensive: [
        'executiveSummary', 
        'companyOverview',
        'managementAnalysis', 
        'marketAnalysis', 
        'competitiveAnalysis',
        'financialAnalysis', 
        'valuationAnalysis',
        'riskAssessment', 
        'investmentRecommendation'
      ],
      mvp: [
        'executiveSummary', 
        'companyOverview',
        'marketAnalysis',
        'riskAssessment'
      ]
    };

    return templates[templateType] || templates.mvp;
  }

  /**
   * Check the status of a report generation
   */
  async checkGenerationStatus(reportId, userId) {
    try {
      const report = await this.getReportById(reportId, userId);

      return {
        reportId: report._id,
        status: report.status,
        progress: report.generationProgress || 0,
        completedSections: report.sections.length,
        updatedAt: report.updatedAt
      };
    } catch (error) {
      console.error('Check generation status error:', error);
      throw error;
    }
  }

  /**
   * Export report to a specific format
   */
  async exportReport(reportId, userId, format = 'pdf') {
    try {
      // Get the report
      const report = await this.getReportById(reportId, userId);

      // For now, we'll return the report data that would be used to generate the PDF
      // In a future update, this will generate an actual PDF file
      return {
        reportId: report._id,
        format: format,
        exportedAt: new Date(),
        exportReady: true,
        downloadUrl: `/api/reports/${reportId}/download?format=${format}`,
        reportData: {
          title: report.companyName,
          sections: report.sections,
          generatedAt: report.updatedAt,
          templateType: report.templateType
        }
      };
    } catch (error) {
      console.error('Export report error:', error);
      throw error;
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId, userId) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Convert string ID to ObjectId if needed
      const objectId = typeof reportId === 'string' ? new ObjectId(reportId) : reportId;

      // Delete the report
      const result = await collection.deleteOne({ _id: objectId, userId: userId });

      if (result.deletedCount === 0) {
        throw new Error('Report not found or not authorized');
      }

      return { success: true };
    } catch (error) {
      console.error('Delete report error:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedReportService();