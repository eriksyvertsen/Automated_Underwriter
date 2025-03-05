const axios = require('axios');
const openaiService = require('../../services/openaiService');

jest.mock('axios');

describe('OpenAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateContent', () => {
    it('should generate content using OpenAI API', async () => {
      // Test implementation
    });
  });

  // More tests...
});
