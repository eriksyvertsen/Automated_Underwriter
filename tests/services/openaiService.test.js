// tests/services/openaiService.test.js
const axios = require('axios');
const openaiService = require('../../services/openaiService');

jest.mock('axios');

describe('OpenAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the axios.create to return a properly mocked instance
    axios.create.mockReturnValue({
      post: jest.fn().mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'This is a mock OpenAI response for testing.'
            }
          }],
          usage: {
            total_tokens: 100
          },
          model: 'gpt-4-turbo'
        }
      }),
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    });
  });

  describe('generateContent', () => {
    it('should generate content using OpenAI API', async () => {
      const prompt = 'Test prompt';
      const options = {
        temperature: 0.5,
        maxTokens: 500
      };

      const result = await openaiService.generateContent(prompt, options);

      expect(result).toBeDefined();
      expect(result.content).toBe('This is a mock OpenAI response for testing.');
      expect(result.usage).toEqual({ total_tokens: 100 });
      expect(result.model).toBe('gpt-4-turbo');

      const axiosInstance = axios.create.mock.results[0].value;
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: 'gpt-4-turbo',
          messages: [
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: prompt })
          ],
          temperature: options.temperature,
          max_tokens: options.maxTokens
        }),
        expect.anything()
      );
    });

    it('should use fallback model when primary model fails', async () => {
      const prompt = 'Test prompt';
      const axiosInstance = axios.create.mock.results[0].value;

      // First call throws an error indicating capacity issues
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message: 'The model is currently overloaded'
            }
          }
        }
      });

      // Second call succeeds with fallback model
      axiosInstance.post.mockResolvedValueOnce({
        data: {
          choices: [{
            message: {
              content: 'Fallback model response'
            }
          }],
          usage: {
            total_tokens: 50
          },
          model: 'gpt-3.5-turbo'
        }
      });

      // Mock shouldUseFallbackModel to return true
      openaiService.shouldUseFallbackModel = jest.fn().mockReturnValue(true);

      const result = await openaiService.generateContent(prompt);

      expect(result).toBeDefined();
      expect(result.content).toBe('Fallback model response');
      expect(result.model).toBe('gpt-3.5-turbo');

      // Verify it was called twice - once with primary, once with fallback
      expect(axiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors', async () => {
      const prompt = 'Test prompt';
      const axiosInstance = axios.create.mock.results[0].value;

      // Mock API error
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message: 'Invalid API key'
            }
          }
        }
      });

      // Mock shouldUseFallbackModel to return false
      openaiService.shouldUseFallbackModel = jest.fn().mockReturnValue(false);

      // Mock enhanceError
      openaiService.enhanceError = jest.fn().mockImplementation(error => {
        return new Error(`OpenAI API Error: ${error.response.data.error.message}`);
      });

      await expect(openaiService.generateContent(prompt))
        .rejects.toThrow('OpenAI API Error: Invalid API key');
    });
  });

  describe('generateReportSection', () => {
    it('should generate a report section with proper templating', async () => {
      const sectionType = 'executiveSummary';
      const companyData = {
        name: 'Test Company',
        description: 'A technology company',
        foundingYear: 2020
      };

      // Mock internal methods
      openaiService.getPromptTemplateForSection = jest.fn().mockReturnValue({
        version: '1.0.0',
        template: 'Generate an executive summary for {companyName}',
        systemPrompt: 'You are a financial analyst.'
      });

      openaiService.fillPromptTemplate = jest.fn().mockReturnValue('Generate an executive summary for Test Company');
      openaiService.optimizeTokenUsage = jest.fn().mockImplementation(prompt => prompt);
      openaiService.getSectionTemperature = jest.fn().mockReturnValue(0.3);
      openaiService.getMaxTokensForSection = jest.fn().mockReturnValue(1000);
      openaiService.processOpenAIResponse = jest.fn().mockImplementation(content => content);

      // Mock generateContent
      openaiService.generateContent = jest.fn().mockResolvedValue({
        content: 'Executive summary content for Test Company',
        usage: { total_tokens: 150 },
        model: 'gpt-4-turbo'
      });

      const result = await openaiService.generateReportSection(sectionType, companyData);

      expect(result).toBeDefined();
      expect(result.content).toBe('Executive summary content for Test Company');
      expect(result.metadata).toMatchObject({
        tokensUsed: 150,
        model: 'gpt-4-turbo',
        promptVersionId: '1.0.0'
      });

      // Verify internal function calls
      expect(openaiService.getPromptTemplateForSection).toHaveBeenCalledWith(sectionType);
      expect(openaiService.fillPromptTemplate).toHaveBeenCalled();
      expect(openaiService.generateContent).toHaveBeenCalledWith(
        'Generate an executive summary for Test Company',
        expect.objectContaining({
          temperature: 0.3,
          maxTokens: 1000,
          systemPrompt: 'You are a financial analyst.'
        })
      );
    });
  });
});