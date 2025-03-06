// tests/services/reportService.test.js
const reportService = require('../../services/reportService');
const openaiService = require('../../services/openaiService');

// Mock the MongoDB collection and OpenAI service
jest.mock('../../config/db', () => ({
  getCollection: jest.fn(async () => ({
    findOne: jest.fn(async (query) => {
      if (query._id === '60d21b4667d0d8992e610c86' && query.userId === 'test-user-id') {
        return {
          _id: '60d21b4667d0d8992e610c86',
          userId: 'test-user-id',
          companyName: 'Test Company',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
          templateType: 'standard',
          sections: []
        };
      }
      return null;
    }),
    insertOne: jest.fn(async (report) => ({ 
      insertedId: '60d21b4667d0d8992e610c86'
    })),
    updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
    deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        toArray: jest.fn(async () => ([
          {
            _id: '60d21b4667d0d8992e610c86',
            userId: 'test-user-id',
            companyName: 'Test Company'
          }
        ]))
      }))
    }))
  }))
}));

jest.mock('../../services/openaiService', () => ({
  generateReportSection: jest.fn(async () => ({
    content: 'Generated content for testing',
    metadata: {
      tokensUsed: 100,
      generatedAt: new Date(),
      model: 'gpt-4-turbo',
      promptVersionId: '1.0.0'
    }
  }))
}));

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Force the service to be initialized
    reportService.initialized = true;
    reportService.ensureInitialized = jest.fn(async () => reportService.reportsCollection);
  });

  describe('createReport', () => {
    it('should create a new report', async () => {
      const userId = 'test-user-id';
      const companyDetails = {
        name: 'Test Company',
        description: 'Test Description',
        industry: 'Technology'
      };

      const report = await reportService.createReport(userId, companyDetails);

      expect(report).toBeDefined();
      expect(report._id).toBe('60d21b4667d0d8992e610c86');
      expect(report.companyName).toBe('Test Company');
      expect(report.userId).toBe('test-user-id');
      expect(report.status).toBe('draft');
    });
  });

  describe('getReportById', () => {
    it('should get a report by id', async () => {
      const reportId = '60d21b4667d0d8992e610c86';
      const userId = 'test-user-id';

      const report = await reportService.getReportById(reportId, userId);

      expect(report).toBeDefined();
      expect(report._id).toBe('60d21b4667d0d8992e610c86');
      expect(report.userId).toBe('test-user-id');
    });

    it('should throw an error if report is not found', async () => {
      const reportId = 'non-existent-id';
      const userId = 'test-user-id';

      await expect(reportService.getReportById(reportId, userId))
        .rejects.toThrow('Report not found');
    });
  });

  describe('getReportsByUser', () => {
    it('should get all reports for a user', async () => {
      const userId = 'test-user-id';

      const reports = await reportService.getReportsByUser(userId);

      expect(reports).toBeInstanceOf(Array);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].userId).toBe('test-user-id');
    });
  });

  describe('generateReportSection', () => {
    it('should generate a report section', async () => {
      const reportId = '60d21b4667d0d8992e610c86';
      const userId = 'test-user-id';
      const sectionType = 'executiveSummary';
      const companyData = { name: 'Test Company' };

      // Mock implementation for updateReport to avoid infinite recursion
      reportService.updateReport = jest.fn().mockResolvedValue({});

      const section = await reportService.generateReportSection(
        reportId, userId, sectionType, companyData
      );

      expect(section).toBeDefined();
      expect(section.type).toBe('executiveSummary');
      expect(section.title).toBe('Executive Summary');
      expect(section.content).toBe('Generated content for testing');
      expect(openaiService.generateReportSection).toHaveBeenCalledWith(
        sectionType, companyData
      );
    });
  });

  // Add additional tests as needed for other methods
});