// services/openaiService.js

const axios = require('axios');

class OpenAIService {
  constructor() {
    this.config = {
      baseURL: 'https://api.openai.com/v1',
      models: {
        primary: 'gpt-4-turbo',
        fallback: 'gpt-3.5-turbo'
      },
      endpoints: {
        completions: '/chat/completions',
        embeddings: '/embeddings'
      },
      retryStrategy: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000
      }
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    this.setupRetryInterceptor();
    this.setupCache();
  }

  // Set up a simple in-memory cache for API responses
  setupCache() {
    // Store the config reference for cache to use
    const serviceConfig = this.config;

    this.cache = {
      responses: new Map(),
      maxSize: 100, // Maximum number of cached responses
      ttl: 30 * 60 * 1000, // 30 minutes TTL

      // Add an item to the cache with TTL
      set(key, value) {
        // Remove oldest entry if we're at capacity
        if (this.responses.size >= this.maxSize) {
          const oldestKey = this.responses.keys().next().value;
          this.responses.delete(oldestKey);
        }

        this.responses.set(key, {
          value,
          expires: Date.now() + this.ttl
        });
      },

      // Get an item from the cache if it exists and hasn't expired
      get(key) {
        const item = this.responses.get(key);
        if (!item) return null;

        if (item.expires < Date.now()) {
          this.responses.delete(key);
          return null;
        }

        return item.value;
      },

      // Generate a cache key from a prompt and options
      generateKey(prompt, options) {
        const optionsString = JSON.stringify({
          model: options.model || serviceConfig.models.primary,
          temperature: options.temperature || 0.3,
          maxTokens: options.maxTokens || 2000
        });

        return `${prompt.substring(0, 100)}_${optionsString}`;
      },

      // Clear all cache entries
      clear() {
        this.responses.clear();
      }
    };
  }

  // Set up retry logic for API calls
  setupRetryInterceptor() {
    this.axiosInstance.interceptors.response.use(undefined, async (error) => {
      const { config, response } = error;

      // If config is undefined or already retried more than max, reject
      if (!config || !config.retry) {
        return Promise.reject(error);
      }

      // Retry only these status codes
      const retryStatusCodes = [429, 500, 502, 503, 504];

      // Initialize retry count
      config.retry.count = config.retry.count || 0;

      // If reached max retries or not a retryable status code, reject
      if (
        config.retry.count >= this.config.retryStrategy.maxRetries ||
        !response ||
        !retryStatusCodes.includes(response.status)
      ) {
        return Promise.reject(error);
      }

      // Increment retry count
      config.retry.count += 1;

      // Calculate exponential backoff delay
      const delay = Math.min(
        this.config.retryStrategy.initialDelay * Math.pow(2, config.retry.count - 1),
        this.config.retryStrategy.maxDelay
      );

      // Wait for the delay then retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Return the retry request
      return this.axiosInstance(config);
    });
  }

  // Check if we should use fallback model
  shouldUseFallbackModel(error) {
    // Check if error is related to model unavailability or capacity
    if (error.response && error.response.data) {
      const errorMessage = error.response.data.error?.message?.toLowerCase() || '';
      return (
        errorMessage.includes('capacity') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('currently unavailable')
      );
    }
    return false;
  }

  // Enhanced error handling
  enhanceError(error) {
    if (error.response && error.response.data) {
      return new Error(`OpenAI API Error: ${error.response.data.error?.message || error.message}`);
    }
    return error;
  }

  // Generate content using OpenAI API with caching
  async generateContent(prompt, options = {}) {
    try {
      // Check cache first
      const cacheKey = this.cache.generateKey(prompt, options);
      const cachedResponse = this.cache.get(cacheKey);

      if (cachedResponse && !options.skipCache) {
        console.log('Using cached response for prompt');
        return cachedResponse;
      }

      const model = options.model || this.config.models.primary;
      const endpoint = this.config.endpoints.completions;

      const requestConfig = {
        retry: {
          count: 0
        }
      };

      const response = await this.axiosInstance.post(endpoint, {
        model: model,
        messages: [
          { 
            role: "system", 
            content: options.systemPrompt || "You are a professional financial analyst creating underwriting reports for institutional investors." 
          },
          { role: "user", content: prompt }
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 2000,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0
      }, requestConfig);

      const result = {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      // Try fallback model if primary model fails
      if (this.shouldUseFallbackModel(error) && options.model !== this.config.models.fallback) {
        console.warn('Falling back to alternate model due to API error');
        return this.generateContent(prompt, {
          ...options,
          model: this.config.models.fallback
        });
      }

      throw this.enhanceError(error);
    }
  }

  // Generate report section with optimized prompts
  async generateReportSection(sectionType, companyData, additionalContext = {}) {
    try {
      // Get the appropriate prompt template for this section
      const promptTemplate = this.getPromptTemplateForSection(sectionType);

      // Fill the template with company data
      const prompt = this.fillPromptTemplate(promptTemplate, companyData, additionalContext);

      // Optimize token usage if needed
      const optimizedPrompt = this.optimizeTokenUsage(prompt);

      // Generate content with section-specific parameters
      const response = await this.generateContent(optimizedPrompt, {
        temperature: this.getSectionTemperature(sectionType),
        maxTokens: this.getMaxTokensForSection(sectionType),
        systemPrompt: promptTemplate.systemPrompt
      });

      // Process and format the response
      const processedContent = this.processOpenAIResponse(response.content, sectionType);

      return {
        content: processedContent,
        metadata: {
          tokensUsed: response.usage.total_tokens,
          generatedAt: new Date(),
          model: response.model,
          promptVersionId: promptTemplate.version
        }
      };
    } catch (error) {
      console.error(`Error generating ${sectionType} section:`, error);
      throw error;
    }
  }

  // Get prompt template for specific report section
  getPromptTemplateForSection(sectionType) {
    const promptTemplates = {
      executiveSummary: {
        version: "1.0.0",
        systemPrompt: "You are a financial analyst specializing in executive summaries for underwriting reports on private companies. Your summaries are concise, data-driven, and highlight key investment considerations.",
        template: `Generate a professional executive summary for an underwriting report on {companyName}, a {companyDescription}. Include:
1. Company snapshot: founded {foundingYear}, headquartered in {headquarters}, approximately {employeeCount} employees, {fundingStatus}.
2. Investment thesis in 2-3 concise paragraphs that focus on {investmentHighlights}.
3. Summary financial metrics with 12-month outlook including {financialMetrics}.
4. Risk-adjusted investment recommendation.
Use a formal, analytical tone suitable for institutional investors. Make all estimates based on the following data points:
{companyData}`
      },

      companyOverview: {
        version: "1.0.0",
        systemPrompt: "You are a financial analyst specializing in company analysis for underwriting reports on private companies. Your overviews are thorough, objective, and focus on key business aspects.",
        template: `Create a detailed company overview for {companyName}, covering:
1. Business model and revenue streams
2. Products and services
3. Target markets and customer segments
4. History and key milestones
5. Leadership team background and expertise
6. Corporate structure and governance
7. Competitive positioning in the industry
8. Distribution channels and partnerships
9. Current challenges and ongoing initiatives
10. Future growth strategy

Use the following information:
{companyData}`
      },

      // New section: Competitive Analysis
      competitiveAnalysis: {
        version: "1.0.0",
        systemPrompt: "You are a financial analyst specializing in competitive analysis for underwriting reports. Your analyses are data-driven, objective, and provide strategic insights about market positioning.",
        template: `Generate a detailed competitive analysis for {companyName} in the {industry} industry. Include:

1. Market landscape overview with key players and their market shares
2. Detailed analysis of 3-5 main competitors with:
   - Company profiles and key differentiators
   - Strengths and weaknesses relative to {companyName}
   - Strategic positioning and recent initiatives
3. Competitive advantage assessment for {companyName}:
   - Unique selling propositions
   - Barriers to entry and moats
   - Technological or operational advantages
   - IP and innovation pipeline
4. Threat analysis:
   - Direct competitors and their growth trajectories
   - Potential new entrants and disruption risks
   - Substitution risks and alternative solutions
5. Strategic recommendations to enhance competitive positioning

Use a formal, analytical tone and support assertions with data from the following:
{companyData}`
      },

      // New section: Financial Projections
      financialProjections: {
        version: "1.0.0",
        systemPrompt: "You are a financial analyst specializing in financial modeling and projections. Your forecasts are well-reasoned, conservative where appropriate, and grounded in historical data and industry benchmarks.",
        template: `Create detailed financial projections for {companyName} covering the next 3-5 years. Include:

1. Key assumptions driving the forecast model:
   - Revenue growth rates and drivers
   - Margin evolution and cost structure
   - Capital expenditure requirements
   - Working capital needs
   - Market condition assumptions
2. Projected financial statements:
   - Annual income statement projections
   - Cash flow forecast highlights
   - Balance sheet evolution
3. Key financial metrics forecast:
   - Year-over-year growth rates
   - Profitability metrics (gross margin, EBITDA margin, net margin)
   - Efficiency metrics (asset turnover, inventory days)
   - Liquidity and solvency metrics
4. Scenario analysis:
   - Base case detailed above
   - Brief overview of upside case (with key drivers)
   - Brief overview of downside case (with key triggers and impacts)
5. Funding requirements and capital structure evolution

Base your analysis on the company's historical performance, industry benchmarks, and management guidance from this data:
{companyData}`
      },

      // Enhanced investment recommendation section
      investmentRecommendation: {
        version: "1.0.1",
        systemPrompt: "You are a senior financial analyst providing investment recommendations. Your advice is unbiased, risk-aware, and focuses on long-term investment thesis with clear reasoning.",
        template: `Provide a comprehensive investment recommendation regarding {companyName}, covering:

1. Investment thesis summary:
   - Core investment merits in bullet points
   - Key risks and mitigating factors
   - Value creation opportunities

2. Valuation analysis:
   - Valuation methodology used
   - Key valuation drivers
   - Multiple ranges relative to peers
   - Fair value estimate with sensitivity factors

3. Return potential:
   - Expected IRR over 3-5 year horizon
   - Sources of return (multiple expansion, EBITDA growth, debt reduction)
   - Downside protection and loss potential in adverse scenario

4. Investment recommendation:
   - Clear recommendation (Buy/Hold/Sell) with conviction level
   - Investment time horizon
   - Suitable investor profile
   - Position sizing guidance

5. Key metrics to monitor:
   - Trigger points for reassessment
   - Warning signals that could change the thesis

Use a formal, analytical tone and base your recommendation on the following data:
{companyData}`
      },

      // New section: Management Analysis
      managementAnalysis: {
        version: "1.0.0",
        systemPrompt: "You are a financial analyst with expertise in evaluating management teams. Your assessment is objective, focused on track record, and examines leadership capability and alignment with company strategy.",
        template: `Conduct a thorough analysis of the management team at {companyName}, including:

1. Leadership team overview:
   - Profiles of key executives (CEO, CFO, COO, CTO)
   - Career trajectory and relevant experience
   - Industry expertise and domain knowledge
   - Notable achievements and past performance

2. Governance assessment:
   - Board composition and independence
   - Committee structure and effectiveness
   - Alignment with shareholder interests
   - Governance policies and transparency

3. Execution capability:
   - Track record of meeting stated objectives
   - Strategic decision-making history
   - Crisis management capability
   - Innovation and adaptation ability

4. Compensation and incentives:
   - Executive compensation structure
   - Alignment with company performance
   - Equity ownership by management
   - Long-term vs. short-term incentive balance

5. Succession planning and team depth:
   - Key person risk assessment
   - Bench strength and succession plans
   - Recent executive turnover and implications
   - Leadership development practices

Provide an objective, evidence-based assessment using the following information:
{companyData}`
      },

      // New section: Valuation Analysis
      valuationAnalysis: {
        version: "1.0.0",
        systemPrompt: "You are a valuation specialist with expertise in private company valuations. Your analysis is thorough, employs multiple methodologies, and clearly outlines key assumptions and sensitivities.",
        template: `Perform a comprehensive valuation analysis for {companyName}, including:

1. Valuation summary:
   - Enterprise value range
   - Key value drivers
   - Most appropriate valuation methodologies for this company
   - Confidence level in the valuation

2. Comparable company analysis:
   - Selected peer group with rationale
   - Key trading multiples (EV/Revenue, EV/EBITDA, etc.)
   - Premium/discount justification
   - Implied valuation range

3. Discounted cash flow analysis:
   - Key assumptions (growth rate, margin evolution, terminal value)
   - WACC calculation and components
   - Free cash flow projections summary
   - Implied valuation and sensitivity to key inputs

4. Transaction comparable analysis:
   - Relevant M&A transactions in the sector
   - Transaction multiples and trends
   - Implied valuation range based on precedent transactions

5. Additional methodologies as appropriate:
   - Sum-of-the-parts analysis
   - LBO analysis
   - Asset-based valuation

Use a formal, analytical tone and base your analysis on the following information:
{companyData}`
      },

      // Market Analysis section
      marketAnalysis: {
        version: "1.0.0",
        systemPrompt: "You are a financial analyst specializing in market research and industry analysis. Your assessments are thorough, data-driven, and provide strategic insights about market dynamics.",
        template: `Conduct a comprehensive market analysis for {companyName} in the {industry} industry, covering:

1. Market size and growth:
   - Total addressable market (TAM) size and CAGR
   - Serviceable addressable market (SAM) estimation
   - Market share analysis and competitive landscape
   - Growth drivers and inhibitors

2. Industry trends and dynamics:
   - Key market trends and technological developments
   - Regulatory environment and policy impact
   - Consumer/customer behavior shifts
   - Supply chain dynamics and constraints

3. Market segmentation:
   - Key customer segments and their characteristics
   - Geographic distribution of market opportunity
   - Vertical markets and their differing needs
   - Emerging segments with growth potential

4. Market positioning:
   - Company's positioning within the competitive landscape
   - Market share and penetration rates
   - Value proposition and competitive advantages
   - Target market fit and customer acquisition strategy

5. Market opportunity assessment:
   - Whitespace analysis and growth vectors
   - Expansion opportunities (geographic, product, vertical)
   - Potential partnerships and strategic alliances
   - Addressable market growth forecast

Use a formal, analytical tone and support your analysis with data from the following information:
{companyData}`
      },

      // Risk Assessment section
      riskAssessment: {
        version: "1.0.0",
        systemPrompt: "You are a financial analyst specializing in risk assessment for investment opportunities. Your evaluations are thorough, balanced, and provide clear insights about risk factors and mitigating strategies.",
        template: `Provide a comprehensive risk assessment for an investment in {companyName}, covering:

1. Market and competitive risks:
   - Market volatility and cyclicality
   - Competitive intensity and market share vulnerability
   - Disruptive technologies and business models
   - Customer concentration and retention risks

2. Operational risks:
   - Supply chain vulnerabilities
   - Manufacturing or service delivery challenges
   - Talent acquisition and retention
   - Intellectual property protection
   - Cybersecurity and data privacy

3. Financial risks:
   - Revenue growth sustainability
   - Margin pressure points
   - Cash flow predictability and volatility
   - Capital structure and financing risks
   - Foreign exchange exposure (if applicable)

4. Legal and regulatory risks:
   - Regulatory compliance challenges
   - Pending or potential litigation
   - Intellectual property disputes
   - Industry-specific regulatory changes

5. Strategic risks:
   - Business model viability long-term
   - Execution risks in growth initiatives
   - Management depth and succession planning
   - M&A integration challenges (if applicable)

6. Risk mitigation strategies:
   - Existing risk management approaches
   - Recommended additional mitigants
   - Key risk indicators to monitor
   - Critical success factors for risk management

Use a formal, analytical tone and provide a balanced assessment based on the following information:
{companyData}`
      }
    };

    return promptTemplates[sectionType] || promptTemplates.executiveSummary;
  }

  // Fill prompt template with company data
  fillPromptTemplate(promptTemplate, companyData, additionalContext) {
    let filledPrompt = promptTemplate.template;

    // Replace template variables with actual data
    const templateVariables = {
      companyName: companyData.company?.name || 'the company',
      companyDescription: companyData.company?.description || 'private company',
      foundingYear: companyData.company?.foundingYear || 'N/A',
      headquarters: companyData.company?.headquarters || 'N/A',
      employeeCount: companyData.company?.employees || 'N/A',
      industry: companyData.company?.industry || 'N/A',
      fundingStatus: companyData.financials?.funding !== 'N/A' ? 
                     `with ${companyData.financials?.funding?.display || 'undisclosed'} funding` : 'privately funded',
      investmentHighlights: companyData.investmentHighlights || 'market position, growth potential, and competitive advantages',
      financialMetrics: companyData.financialMetrics || 'revenue, profitability, and cash flow',
      companyData: JSON.stringify(companyData, null, 2) || '{}'
    };

    // Add any additional context
    Object.keys(additionalContext).forEach(key => {
      templateVariables[key] = additionalContext[key];
    });

    // Replace all variables in the template
    Object.keys(templateVariables).forEach(key => {
      const placeholder = `{${key}}`;
      filledPrompt = filledPrompt.replace(new RegExp(placeholder, 'g'), templateVariables[key]);
    });

    return filledPrompt;
  }

  // Optimize token usage for long prompts
  optimizeTokenUsage(prompt, maxTokens = 4000) {
    // Simple token estimation (1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(prompt.length / 4);

    // If within limit, return unchanged
    if (estimatedTokens <= maxTokens) {
      return prompt;
    }

    // Otherwise, try to trim the prompt intelligently
    // For this MVP, we'll just truncate the company data section
    const companyDataIndex = prompt.indexOf('{companyData}');
    if (companyDataIndex > 0) {
      const jsonDataStart = prompt.indexOf('{', companyDataIndex + 13);
      const jsonDataEnd = prompt.lastIndexOf('}');

      if (jsonDataStart > 0 && jsonDataEnd > jsonDataStart) {
        try {
          // Parse the JSON data
          const jsonString = prompt.substring(jsonDataStart, jsonDataEnd + 1);
          const companyData = JSON.parse(jsonString);

          // Keep only essential fields
          const essentialFields = ['name', 'description', 'foundingYear', 'headquarters', 'industry'];
          const reducedData = {};
          essentialFields.forEach(field => {
            if (companyData[field] !== undefined) {
              reducedData[field] = companyData[field];
            }
          });

          // Replace the original JSON with the reduced version
          const reducedJson = JSON.stringify(reducedData, null, 2);
          const newPrompt = prompt.substring(0, jsonDataStart) + reducedJson + prompt.substring(jsonDataEnd + 1);

          return newPrompt;
        } catch (error) {
          console.error('Error optimizing token usage:', error);
        }
      }
    }

    // Fallback: just truncate the prompt
    const maxChars = maxTokens * 4;
    return prompt.substring(0, maxChars) + '\n[Content truncated due to length constraints]';
  }

  // Get appropriate temperature setting for different report sections
  getSectionTemperature(sectionType) {
    const temperatureSettings = {
      executiveSummary: 0.3,
      companyOverview: 0.4,
      marketAnalysis: 0.5,
      financialAnalysis: 0.2,
      financialProjections: 0.2,
      riskAssessment: 0.3,
      investmentRecommendation: 0.3,
      competitiveAnalysis: 0.4,
      managementAnalysis: 0.3,
      valuationAnalysis: 0.2
    };

    return temperatureSettings[sectionType] || 0.3;
  }

  // Get appropriate max tokens setting for different report sections
  getMaxTokensForSection(sectionType) {
    const tokenSettings = {
      executiveSummary: 1000,
      companyOverview: 2000,
      marketAnalysis: 1500,
      financialAnalysis: 1500,
      financialProjections: 1800,
      riskAssessment: 1000,
      investmentRecommendation: 1200,
      competitiveAnalysis: 1800,
      managementAnalysis: 1500,
      valuationAnalysis: 1500
    };

    return tokenSettings[sectionType] || 1500;
  }

  // Process and format OpenAI response
  processOpenAIResponse(content, sectionType) {
    // For MVP, we'll just return the content unchanged
    // In future versions, this could apply formatting, extract structured data, etc.
    return content;
  }
}

module.exports = new OpenAIService();