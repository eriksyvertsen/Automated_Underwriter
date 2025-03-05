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

  // Generate content using OpenAI API
  async generateContent(prompt, options = {}) {
    try {
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

      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model
      };
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
      }
    };

    return promptTemplates[sectionType] || promptTemplates.executiveSummary;
  }

  // Fill prompt template with company data
  fillPromptTemplate(promptTemplate, companyData, additionalContext) {
    let filledPrompt = promptTemplate.template;

    // Replace template variables with actual data
    const templateVariables = {
      companyName: companyData.name || 'the company',
      companyDescription: companyData.description || 'private company',
      foundingYear: companyData.foundingYear || 'N/A',
      headquarters: companyData.headquarters || 'N/A',
      employeeCount: companyData.employeeCount || 'N/A',
      fundingStatus: companyData.fundingStatus || 'N/A',
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
      riskAssessment: 0.3,
      investmentRecommendation: 0.3
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
      riskAssessment: 1000,
      investmentRecommendation: 800
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