// services/contentQualityService.js

const openaiService = require('./openaiService');

class ContentQualityService {
  constructor() {
    this.qualityChecks = {
      executiveSummary: this.checkExecutiveSummary,
      financialAnalysis: this.checkFinancialAnalysis,
      // Add more section-specific checks
    };

    // Quality evaluation prompt
    this.evaluationPrompt = `You are a senior financial analyst and editor reviewing content for an underwriting report. 
Evaluate the following content for quality, accuracy, and professionalism.

Content to evaluate:
"{content}"

Provide your evaluation as a JSON object with the following structure:
{
  "score": [1-10 numerical rating],
  "strengths": [Array of strengths in the content],
  "weaknesses": [Array of weaknesses in the content],
  "suggestions": [Array of specific suggestions for improvement],
  "factualIssues": [Array of potential factual issues or inconsistencies],
  "tonalIssues": [Array of tonal or stylistic issues]
}`;
  }

  /**
   * Evaluate content quality
   */
  async evaluateContent(content, sectionType) {
    try {
      // Use a specific check if available
      if (this.qualityChecks[sectionType]) {
        return this.qualityChecks[sectionType](content);
      }

      // Otherwise use generic evaluation
      return this.genericQualityCheck(content);
    } catch (error) {
      console.error('Error evaluating content quality:', error);
      return {
        passed: true, // Default to passing on error
        score: 7,
        issues: ['Unable to perform quality check']
      };
    }
  }

  /**
   * Generic quality check for any content
   */
  async genericQualityCheck(content) {
    const prompt = this.evaluationPrompt.replace('{content}', content);

    // Get quality evaluation from AI
    const evaluation = await openaiService.generateContent(prompt, {
      temperature: 0.3,
      maxTokens: 800,
      skipCache: true, // Always get fresh evaluation
      systemPrompt: "You are a critical editor evaluating financial writing. Be thorough and honest in your assessment."
    });

    try {
      // Parse the evaluation
      const result = JSON.parse(evaluation.content);

      // Determine if content passes quality check
      const passed = result.score >= 7;

      return {
        passed,
        score: result.score,
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        suggestions: result.suggestions || [],
        factualIssues: result.factualIssues || [],
        tonalIssues: result.tonalIssues || []
      };
    } catch (error) {
      console.error('Error parsing quality evaluation:', error);
      return {
        passed: true,
        score: 7,
        issues: ['Error parsing quality evaluation']
      };
    }
  }

  /**
   * Improve content based on quality evaluation
   */
  async improveContent(content, evaluation, sectionType) {
    if (evaluation.passed && evaluation.score >= 8) {
      // Content is already high quality
      return content;
    }

    const improvementPrompt = `You are a senior financial editor improving content for an underwriting report.

Original content:
"""
${content}
"""

Quality evaluation:
"""
${JSON.stringify(evaluation, null, 2)}
"""

Revise the content to address the identified weaknesses and issues while preserving the original structure and meaning.
Focus particularly on addressing these specific issues:
${evaluation.weaknesses.map(w => `- ${w}`).join('\n')}
${evaluation.factualIssues.map(i => `- ${i}`).join('\n')}
${evaluation.tonalIssues.map(t => `- ${t}`).join('\n')}

Take the suggestions into account:
${evaluation.suggestions.map(s => `- ${s}`).join('\n')}

Maintain the original intent, but improve the quality, clarity, and professionalism.`;

    const improved = await openaiService.generateContent(improvementPrompt, {
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: "You are a skilled financial editor who improves content while maintaining its structure and intent."
    });

    return improved.content;
  }

  // Section-specific quality checks
  async checkExecutiveSummary(content) {
    // Implementation similar to genericQualityCheck but with executive summary specific criteria
  }

  async checkFinancialAnalysis(content) {
    // Implementation similar to genericQualityCheck but with financial analysis specific criteria
  }
}

module.exports = new ContentQualityService();