// controllers/customizationController.js

const enhancedReportService = require('../services/enhancedReportService');
const { ApiError, asyncHandler } = require('../utils/errorHandler');

/**
 * Get report customization options
 */
const getCustomization = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;

    // Get the report
    const report = await enhancedReportService.getReportById(reportId, userId);

    // Return customization settings
    res.status(200).json({
      customization: report.customization || {
        enabledSections: enhancedReportService.getSectionsForTemplate(report.templateType || 'standard'),
        sectionOrder: [],
        theme: 'standard',
        includeTOC: true,
        includeVisualizations: true
      }
    });
  } catch (error) {
    console.error('Get customization error:', error);
    if (error.message === 'Report not found') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Failed to get customization options' });
  }
});

/**
 * Update report customization options
 */
const updateCustomization = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.userId;
    const reportId = req.params.id;
    const customization = req.body;

    // Validate customization options
    if (!customization) {
      return res.status(400).json({ error: 'Customization options are required' });
    }

    // Update customization
    const report = await enhancedReportService.updateReportCustomization(
      reportId, 
      userId,
      customization
    );

    res.status(200).json({
      message: 'Customization updated successfully',
      customization: report.customization
    });
  } catch (error) {
    console.error('Update customization error:', error);
    if (error.message === 'Report not found' || error.message === 'Report not found or not authorized') {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.status(500).json({ error: 'Failed to update customization options' });
  }
});

/**
 * Get available section types
 */
const getAvailableSections = asyncHandler(async (req, res) => {
  try {
    const sections = [
      {
        id: 'executiveSummary',
        title: 'Executive Summary',
        description: 'A concise overview of the company and key investment considerations',
        default: true,
        category: 'core'
      },
      {
        id: 'companyOverview',
        title: 'Company Overview',
        description: 'Detailed company description including business model, products, and history',
        default: true,
        category: 'core'
      },
      {
        id: 'marketAnalysis',
        title: 'Market Analysis',
        description: 'Analysis of the target market size, growth, and trends',
        default: true,
        category: 'market'
      },
      {
        id: 'competitiveAnalysis',
        title: 'Competitive Analysis',
        description: 'Analysis of competitors, market positioning, and competitive advantages',
        default: false,
        category: 'market'
      },
      {
        id: 'financialAnalysis',
        title: 'Financial Analysis',
        description: 'Analysis of historical financial performance and key metrics',
        default: true,
        category: 'financial'
      },
      {
        id: 'financialProjections',
        title: 'Financial Projections',
        description: 'Forward-looking financial forecasts and assumptions',
        default: false,
        category: 'financial'
      },
      {
        id: 'valuationAnalysis',
        title: 'Valuation Analysis',
        description: 'Estimation of company value using various valuation methodologies',
        default: false,
        category: 'financial'
      },
      {
        id: 'managementAnalysis',
        title: 'Management Analysis',
        description: 'Assessment of leadership team, expertise, and governance',
        default: false,
        category: 'governance'
      },
      {
        id: 'riskAssessment',
        title: 'Risk Assessment',
        description: 'Identification and analysis of key risks and mitigating factors',
        default: true,
        category: 'risk'
      },
      {
        id: 'investmentRecommendation',
        title: 'Investment Recommendation',
        description: 'Final assessment and recommendation for potential investors',
        default: true,
        category: 'recommendation'
      }
    ];

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
        'financialProjections',
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
        'financialProjections',
        'valuationAnalysis',
        'riskAssessment', 
        'investmentRecommendation'
      ]
    };

    // Get themes
    const themes = [
      {
        id: 'standard',
        name: 'Standard',
        description: 'Clean, professional look with blue accents',
        preview: '/images/themes/standard.png'
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design with minimalist aesthetics',
        preview: '/images/themes/modern.png'
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional financial report styling',
        preview: '/images/themes/classic.png'
      },
      {
        id: 'dark',
        name: 'Dark Mode',
        description: 'Dark background with light text for reduced eye strain',
        preview: '/images/themes/dark.png'
      }
    ];

    res.status(200).json({
      sections,
      templates,
      themes
    });
  } catch (error) {
    console.error('Get available sections error:', error);
    res.status(500).json({ error: 'Failed to get available sections' });
  }
});

/**
 * Get report template preview
 */
const getTemplatePreview = asyncHandler(async (req, res) => {
  try {
    const templateType = req.params.templateType;

    // List of sections included in this template
    const sections = enhancedReportService.getSectionsForTemplate(templateType);

    // Map to section titles
    const sectionTitles = sections.map(sectionType => 
      enhancedReportService.getSectionTitle(sectionType)
    );

    // Template description
    let description = "Standard template with essential report sections.";
    switch(templateType) {
      case 'basic':
        description = "Simplified template with only essential information.";
        break;
      case 'financial':
        description = "Finance-focused template emphasizing financial analysis and projections.";
        break;
      case 'comprehensive':
        description = "Complete template with all available sections for in-depth analysis.";
        break;
    }

    res.status(200).json({
      templateType,
      sections: sectionTitles,
      description
    });
  } catch (error) {
    console.error('Get template preview error:', error);
    res.status(500).json({ error: 'Failed to get template preview' });
  }
});

module.exports = {
  getCustomization,
  updateCustomization,
  getAvailableSections,
  getTemplatePreview
};