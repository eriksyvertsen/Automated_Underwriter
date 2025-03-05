const { getCollection } = require('../config/db');
const openaiService = require('./openaiService');
const { ObjectId } = require('mongodb');

class ReportService {
  constructor() {
    this.reportsCollection = null;
    this.initialized = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      // Try to get the collection
      this.reportsCollection = await getCollection('reports');
      this.initialized = true;
      console.log('ReportService initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing ReportService:', error);
      return false;
    }
  }

  // Helper method to ensure the service is initialized before operations
  async ensureInitialized() {
    if (!this.initialized) {
      // Wait for the initial initialization to complete
      await this.initPromise;

      // If still not initialized, try again
      if (!this.initialized) {
        console.log('Attempting to re-initialize ReportService...');
        await this.init();
      }

      if (!this.initialized) {
        throw new Error('ReportService could not be initialized');
      }
    }

    return this.reportsCollection;
  }

  // Create a new report based on company details
  async createReport(userId, companyDetails) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Create basic report structure
      const newReport = {
        userId: userId,
        companyName: companyDetails.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        templateType: 'standard',
        sections: [],
        storageLocation: null
      };

      // Insert the report into the database
      const result = await collection.insertOne(newReport);
      newReport._id = result.insertedId;

      return newReport;
    } catch (error) {
      console.error('Create report error:', error);
      throw error;
    }
  }

  // Get a report by ID
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

  // Get all reports for a user
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

  // Update an existing report
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

  // Delete a report
  async deleteReport(reportId, userId) {
    try {
      // Ensure the service is initialized
      const collection = await this.ensureInitialized();

      // Convert string ID to ObjectId if needed
      const objectId = typeof reportId === 'string' ? new ObjectId(reportId) : reportId;

      // Delete the report
      const result = await collection.deleteOne({ 
        _id: objectId,
        userId: userId
      });

      if (result.deletedCount === 0) {
        throw new Error('Report not found or not authorized');
      }

      return { success: true };
    } catch (error) {
      console.error('Delete report error:', error);
      throw error;
    }
  }

  // Generate a section for a report
  async generateReportSection(reportId, userId, sectionType, companyData) {
    try {
      // Ensure the service is initialized (through getReportById)

      // Get the report to ensure it exists and user has access
      const report = await this.getReportById(reportId, userId);

      // Check if this section already exists
      const existingSectionIndex = report.sections.findIndex(s => s.type === sectionType);

      // Generate content using OpenAI service
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
        metadata: generatedSection.metadata
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

  // Get the title for a section based on section type
  getSectionTitle(sectionType) {
    const titles = {
      executiveSummary: 'Executive Summary',
      companyOverview: 'Company Overview',
      marketAnalysis: 'Market Analysis',
      financialAnalysis: 'Financial Analysis',
      riskAssessment: 'Risk Assessment',
      investmentRecommendation: 'Investment Recommendation'
    };

    return titles[sectionType] || sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
  }

  // Queue the generation of a complete report
  async queueReportGeneration(reportId, userId, companyData, templateType = 'standard') {
    try {
      // Update report status
      await this.updateReport(reportId, userId, {
        status: 'generating',
        templateType: templateType
      });

      // Determine which sections to generate based on template type
      const sectionsToGenerate = this.getSectionsForTemplate(templateType);

      // Track progress
      let completedSections = 0;
      const totalSections = sectionsToGenerate.length;

      // Process each section
      for (const sectionType of sectionsToGenerate) {
        try {
          await this.generateReportSection(reportId, userId, sectionType, companyData);
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
      console.error('Queue report generation error:', error);

      // Update report status to failed
      await this.updateReport(reportId, userId, {
        status: 'failed'
      });

      throw error;
    }
  }

  // Get the sections to generate based on template type
  getSectionsForTemplate(templateType) {
    const templates = {
      standard: ['executiveSummary', 'companyOverview', 'marketAnalysis', 'financialAnalysis', 'riskAssessment', 'investmentRecommendation'],
      basic: ['executiveSummary', 'companyOverview', 'riskAssessment'],
      financial: ['executiveSummary', 'financialAnalysis', 'investmentRecommendation'],
      mvp: ['executiveSummary', 'companyOverview'] // For testing in MVP
    };

    return templates[templateType] || templates.mvp;
  }

  // Check the status of a report generation
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
}

module.exports = new ReportService();