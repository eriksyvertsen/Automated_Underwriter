// services/promptTemplateService.js

class PromptTemplateService {
  constructor() {
    this.templateVersions = {};
    this.initializeTemplates();
  }

  initializeTemplates() {
    // Load core templates
    this.loadCoreTemplates();

    // Load industry-specific templates
    this.loadIndustryTemplates();

    // Load specialized templates
    this.loadSpecializedTemplates();
  }

  loadCoreTemplates() {
    this.templateVersions = {
      executiveSummary: {
        standard: {
          version: "2.0.0",
          systemPrompt: "You are a senior financial analyst specializing in executive summaries for underwriting reports. Your summaries are concise, data-driven, and provide clear investment insights with supporting evidence.",
          template: `Generate a comprehensive executive summary for an underwriting report on {companyName}, a {companyDescription}. 

Structure your response with the following sections:
1. Company Snapshot (2-3 sentences on founding, headquarters, size, and business model)
2. Market Position (2-3 sentences on industry standing, market share, and competitive advantages)
3. Financial Overview (3-4 sentences highlighting key metrics, trends, and financial health)
4. Risk Assessment (2-3 sentences on primary risk factors and mitigating circumstances)
5. Investment Thesis (3-4 sentences articulating the core investment rationale with key supporting factors)
6. Outlook & Recommendation (2-3 sentences with forward-looking assessment and clear recommendation)

Maintain a formal, analytical tone appropriate for institutional investors. Support all assertions with specific data points from the following information:
{companyData}`
        },
        conservative: {
          version: "1.0.0",
          systemPrompt: "You are a conservative financial analyst providing cautious executive summaries for underwriting reports. Your summaries emphasize risk awareness and capital preservation.",
          template: `Generate a conservative executive summary for an underwriting report on {companyName}, a {companyDescription}. 

Structure your response with the following sections (emphasizing risk factors and downside protection):
1. Company Overview (2-3 sentences on core business, founding, and leadership)
2. Industry Context (2-3 sentences on market position with emphasis on competitive threats)
3. Financial Assessment (3-4 sentences highlighting key metrics with focus on sustainability and risks)
4. Primary Risk Factors (4-5 sentences detailing key risks with severity assessments)
5. Protective Factors (2-3 sentences on risk mitigation elements and downside protection)
6. Conservative Recommendation (2-3 sentences with measured assessment and recommendation)

Use a formal, risk-aware analytical tone. Support all assertions with specific data points from the following information:
{companyData}`
        }
      },
      // Additional refined core templates would follow
    };
  }

  loadIndustryTemplates() {
    // Software/Technology specific template
    this.templateVersions.executiveSummary.technology = {
      version: "1.0.0",
      systemPrompt: "You are a technology sector specialist crafting executive summaries for tech company underwriting reports. Your summaries emphasize product-market fit, technological differentiation, and scalability.",
      template: `Generate a technology-focused executive summary for an underwriting report on {companyName}, a {companyDescription}.

Structure your response with the following sections (emphasizing tech-specific aspects):
1. Technology Overview (2-3 sentences on core technology, platform, and differentiation)
2. Market Fit & Adoption (2-3 sentences on user metrics, growth rates, and adoption indicators)
3. Technical Capabilities (2-3 sentences on engineering team, tech stack, and innovation pipeline)
4. Competitive Technical Positioning (2-3 sentences on technical moats and proprietary advantages)
5. Scaling Metrics (2-3 sentences on key technical and operational scaling indicators)
6. Tech-Adjusted Investment Thesis (3-4 sentences with technology-centric investment rationale)

Use a formal but tech-savvy analytical tone. Support all assertions with specific data points from the following information:
{companyData}`
    };

    // Healthcare specific template
    this.templateVersions.executiveSummary.healthcare = {
      version: "1.0.0",
      systemPrompt: "You are a healthcare sector specialist crafting executive summaries for healthcare company underwriting reports. Your summaries emphasize clinical efficacy, regulatory pathway, and market access considerations.",
      template: `Generate a healthcare-focused executive summary for an underwriting report on {companyName}, a {companyDescription}.

Structure your response with the following sections (emphasizing healthcare-specific aspects):
1. Clinical/Solution Overview (2-3 sentences on healthcare offering, target condition/need, and approach)
2. Regulatory Status (2-3 sentences on approvals, compliance, and regulatory pathway)
3. Market Access & Reimbursement (2-3 sentences on payer coverage, pricing, and access strategy)
4. Clinical/Economic Value Proposition (2-3 sentences on outcomes, cost-effectiveness, and differentiation)
5. Healthcare-Specific Risks (2-3 sentences on regulatory, clinical, and market access risks)
6. Healthcare-Adjusted Investment Thesis (3-4 sentences with healthcare-centric investment rationale)

Use a formal healthcare analytical tone. Support all assertions with specific data points from the following information:
{companyData}`
    };

    // Add more industry templates...
  }

  loadSpecializedTemplates() {
    // Early-stage template
    this.templateVersions.executiveSummary.earlyStage = {
      version: "1.0.0",
      systemPrompt: "You are a venture capital analyst specializing in early-stage companies. Your summaries emphasize team quality, market opportunity, and go-to-market strategy for pre-revenue or early-revenue companies.",
      template: `Generate an early-stage focused executive summary for an underwriting report on {companyName}, a {companyDescription}.

Structure your response with the following sections (optimized for early-stage evaluation):
1. Founding Team Assessment (3-4 sentences on founders' background, domain expertise, and track record)
2. Problem & Solution (2-3 sentences on problem being solved and proposed solution)
3. Market Opportunity (2-3 sentences on TAM, SAM, and market growth)
4. Early Traction Indicators (2-3 sentences on user growth, engagement, or early sales)
5. Go-to-Market Strategy (2-3 sentences on customer acquisition approach and early evidence)
6. Early-Stage Investment Rationale (3-4 sentences with milestone-based investment thesis)

Use a forward-looking yet grounded analytical tone. Support assertions where possible from the following information:
{companyData}`
    };

    // Add more specialized templates...
  }

  /**
   * Get the appropriate template based on section type, industry, and other parameters
   */
  getTemplateForSection(sectionType, options = {}) {
    const { industry, specialization, style } = options;

    // Check if we have templates for this section type
    if (!this.templateVersions[sectionType]) {
      console.warn(`No templates found for section type: ${sectionType}`);
      return null;
    }

    // Try to get industry-specific template
    if (industry && this.templateVersions[sectionType][industry.toLowerCase()]) {
      return this.templateVersions[sectionType][industry.toLowerCase()];
    }

    // Try to get specialization-specific template
    if (specialization && this.templateVersions[sectionType][specialization]) {
      return this.templateVersions[sectionType][specialization];
    }

    // Try to get style-specific template
    if (style && this.templateVersions[sectionType][style]) {
      return this.templateVersions[sectionType][style];
    }

    // Fall back to standard template
    return this.templateVersions[sectionType].standard;
  }

  /**
   * Get all available template variants for a section
   */
  getTemplateVariantsForSection(sectionType) {
    if (!this.templateVersions[sectionType]) {
      return [];
    }

    return Object.keys(this.templateVersions[sectionType]);
  }
}

// Export a singleton instance
module.exports = new PromptTemplateService();