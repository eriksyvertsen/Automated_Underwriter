// services/dataService.js
const axios = require('axios');

class DataService {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Normalize and enrich company data from various sources
   * @param {Object} rawData User-provided data
   * @returns {Object} Normalized and enriched company data
   */
  async normalizeCompanyData(rawData) {
    try {
      // Create standard structure for normalized data
      const normalizedData = {
        company: {
          name: this.sanitizeCompanyName(rawData.name),
          description: rawData.description || '',
          foundingYear: this.extractFoundingYear(rawData),
          headquarters: this.normalizeLocation(rawData.headquarters),
          employees: this.normalizeEmployeeCount(rawData.employeeCount),
          industry: this.normalizeIndustry(rawData.industry),
          website: rawData.website || '',
          status: rawData.status || 'private'
        },
        financials: {
          revenue: this.extractRevenue(rawData),
          growth: this.calculateGrowthRate(rawData),
          funding: this.normalizeFunding(rawData),
          profitability: rawData.profitability || 'N/A',
          cashPosition: rawData.cashPosition || 'N/A'
        },
        market: {
          size: this.estimateMarketSize(rawData.industry),
          growth: this.estimateMarketGrowth(rawData.industry),
          competitors: rawData.competitors || [],
          trends: this.getIndustryTrends(rawData.industry)
        },
        risk: {
          factors: this.identifyRiskFactors(rawData),
          rating: this.calculateRiskRating(rawData)
        }
      };

      // Attempt to enrich with external data if available
      const enrichedData = await this.enrichWithExternalData(normalizedData, rawData);

      return this.addConfidenceScores(enrichedData);
    } catch (error) {
      console.error('Error normalizing company data:', error);
      // Return the original data with minimal processing if something fails
      return {
        company: {
          name: rawData.name || 'Unknown Company',
          description: rawData.description || '',
          foundingYear: rawData.foundingYear || 'N/A',
          headquarters: rawData.headquarters || 'N/A',
          employees: rawData.employeeCount || 'N/A',
          industry: rawData.industry || 'N/A'
        }
      };
    }
  }

  /**
   * Sanitize company name by removing special characters and normalizing format
   */
  sanitizeCompanyName(name) {
    if (!name) return 'Unknown Company';

    // Remove excess whitespace
    let sanitized = name.trim().replace(/\s+/g, ' ');

    // Remove/normalize common suffixes
    const suffixes = [', Inc.', ' Inc.', ',Inc.', ' Inc', ', LLC', ' LLC', ',LLC', ' LLC'];
    for (const suffix of suffixes) {
      if (sanitized.endsWith(suffix)) {
        sanitized = sanitized.substring(0, sanitized.length - suffix.length);
        break;
      }
    }

    return sanitized.trim();
  }

  /**
   * Extract founding year from raw data
   */
  extractFoundingYear(rawData) {
    if (rawData.foundingYear) {
      const year = parseInt(rawData.foundingYear);
      // Basic validation (year must be between 1800 and current year)
      if (!isNaN(year) && year >= 1800 && year <= new Date().getFullYear()) {
        return year;
      }
    }
    return 'N/A';
  }

  /**
   * Normalize location data
   */
  normalizeLocation(location) {
    if (!location) return 'N/A';

    // Remove excess whitespace
    return location.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize employee count
   */
  normalizeEmployeeCount(count) {
    if (!count) return 'N/A';

    // If it's already a number, format it
    if (typeof count === 'number') {
      return count;
    }

    // Try to parse it as a number
    const parsed = parseInt(count.toString().replace(/,/g, ''));
    if (!isNaN(parsed)) {
      return parsed;
    }

    return 'N/A';
  }

  /**
   * Normalize industry classification
   */
  normalizeIndustry(industry) {
    if (!industry) return 'N/A';

    // Map to standard industry categories if possible
    const standardIndustries = {
      'tech': 'Technology',
      'technology': 'Technology',
      'software': 'Software',
      'healthcare': 'Healthcare',
      'health': 'Healthcare',
      'finance': 'Financial Services',
      'financial': 'Financial Services',
      'retail': 'Retail',
      'manufacturing': 'Manufacturing',
      'education': 'Education',
      'media': 'Media & Entertainment',
      'entertainment': 'Media & Entertainment',
      'food': 'Food & Beverage',
      'beverage': 'Food & Beverage',
      'transportation': 'Transportation & Logistics',
      'logistics': 'Transportation & Logistics',
      'real estate': 'Real Estate',
      'energy': 'Energy & Utilities',
      'utilities': 'Energy & Utilities',
      'telecom': 'Telecommunications',
      'telecommunications': 'Telecommunications'
    };

    const normalizedIndustry = industry.toLowerCase().trim();

    for (const [key, value] of Object.entries(standardIndustries)) {
      if (normalizedIndustry.includes(key)) {
        return value;
      }
    }

    // If no match found, return the original with first letter capitalized
    return industry.charAt(0).toUpperCase() + industry.slice(1);
  }

  /**
   * Extract revenue information
   */
  extractRevenue(rawData) {
    if (!rawData.revenue) return 'N/A';

    // If it's already an object with the right structure, return it
    if (typeof rawData.revenue === 'object' && rawData.revenue.value && rawData.revenue.currency) {
      return rawData.revenue;
    }

    // Try to parse as a string with currency symbol
    if (typeof rawData.revenue === 'string') {
      const currencyMatch = rawData.revenue.match(/(\$|€|£|¥)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(million|billion|M|B|K)?/i);

      if (currencyMatch) {
        let value = parseFloat(currencyMatch[2].replace(/,/g, ''));
        const multiplier = currencyMatch[3] ? currencyMatch[3].toLowerCase() : null;

        // Apply multiplier
        if (multiplier === 'million' || multiplier === 'm') {
          value *= 1000000;
        } else if (multiplier === 'billion' || multiplier === 'b') {
          value *= 1000000000;
        } else if (multiplier === 'k') {
          value *= 1000;
        }

        // Determine currency
        let currency = 'USD';
        if (currencyMatch[1] === '€') currency = 'EUR';
        else if (currencyMatch[1] === '£') currency = 'GBP';
        else if (currencyMatch[1] === '¥') currency = 'JPY';

        return {
          value,
          currency,
          display: rawData.revenue
        };
      }
    }

    // If it's a number, assume it's in USD
    if (typeof rawData.revenue === 'number') {
      return {
        value: rawData.revenue,
        currency: 'USD',
        display: `$${rawData.revenue.toLocaleString()}`
      };
    }

    return 'N/A';
  }

  /**
   * Calculate growth rate from available data
   */
  calculateGrowthRate(rawData) {
    // If growth rate is directly provided
    if (rawData.growthRate) {
      return {
        rate: parseFloat(rawData.growthRate),
        period: rawData.growthPeriod || 'annual'
      };
    }

    // If we have revenue for multiple years, we can calculate
    if (rawData.revenueHistory && Array.isArray(rawData.revenueHistory) && rawData.revenueHistory.length >= 2) {
      const sorted = [...rawData.revenueHistory].sort((a, b) => a.year - b.year);
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];

      if (oldest.value && newest.value) {
        const years = newest.year - oldest.year;
        if (years > 0) {
          const rate = ((newest.value / oldest.value) ** (1 / years) - 1) * 100;
          return {
            rate: parseFloat(rate.toFixed(2)),
            period: 'CAGR',
            years: years
          };
        }
      }
    }

    // Estimate based on industry if we don't have company-specific data
    if (rawData.industry) {
      const industryGrowthRates = {
        'Technology': 15,
        'Software': 18,
        'Healthcare': 8,
        'Financial Services': 5,
        'Retail': 4,
        'Manufacturing': 3,
        'Energy & Utilities': 2,
        'Telecommunications': 3,
        'Media & Entertainment': 6
      };

      const normalizedIndustry = this.normalizeIndustry(rawData.industry);
      if (industryGrowthRates[normalizedIndustry]) {
        return {
          rate: industryGrowthRates[normalizedIndustry],
          period: 'annual',
          estimated: true
        };
      }
    }

    return 'N/A';
  }

  /**
   * Normalize funding information
   */
  normalizeFunding(rawData) {
    if (!rawData.funding) return 'N/A';

    // If it's already an object with the right structure, return it
    if (typeof rawData.funding === 'object' && 
        rawData.funding.total !== undefined && 
        rawData.funding.rounds !== undefined) {
      return rawData.funding;
    }

    // If it's a number, assume it's the total funding in USD
    if (typeof rawData.funding === 'number') {
      return {
        total: rawData.funding,
        currency: 'USD',
        rounds: rawData.fundingRounds || 'N/A',
        latestRound: rawData.latestRound || 'N/A',
        investors: rawData.investors || []
      };
    }

    // Try to parse as a string with currency symbol
    if (typeof rawData.funding === 'string') {
      const currencyMatch = rawData.funding.match(/(\$|€|£|¥)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(million|billion|M|B|K)?/i);

      if (currencyMatch) {
        let value = parseFloat(currencyMatch[2].replace(/,/g, ''));
        const multiplier = currencyMatch[3] ? currencyMatch[3].toLowerCase() : null;

        // Apply multiplier
        if (multiplier === 'million' || multiplier === 'm') {
          value *= 1000000;
        } else if (multiplier === 'billion' || multiplier === 'b') {
          value *= 1000000000;
        } else if (multiplier === 'k') {
          value *= 1000;
        }

        // Determine currency
        let currency = 'USD';
        if (currencyMatch[1] === '€') currency = 'EUR';
        else if (currencyMatch[1] === '£') currency = 'GBP';
        else if (currencyMatch[1] === '¥') currency = 'JPY';

        return {
          total: value,
          currency,
          display: rawData.funding,
          rounds: rawData.fundingRounds || 'N/A',
          latestRound: rawData.latestRound || 'N/A',
          investors: rawData.investors || []
        };
      }
    }

    return 'N/A';
  }

  /**
   * Estimate market size based on industry
   */
  estimateMarketSize(industry) {
    if (!industry) return 'N/A';

    const marketSizeEstimates = {
      'Technology': { size: 5.2, unit: 'trillion', currency: 'USD' },
      'Software': { size: 593, unit: 'billion', currency: 'USD' },
      'Healthcare': { size: 8.3, unit: 'trillion', currency: 'USD' },
      'Financial Services': { size: 22.5, unit: 'trillion', currency: 'USD' },
      'Retail': { size: 26, unit: 'trillion', currency: 'USD' },
      'Manufacturing': { size: 15, unit: 'trillion', currency: 'USD' },
      'Energy & Utilities': { size: 7, unit: 'trillion', currency: 'USD' },
      'Telecommunications': { size: 1.7, unit: 'trillion', currency: 'USD' },
      'Media & Entertainment': { size: 2.3, unit: 'trillion', currency: 'USD' }
    };

    const normalizedIndustry = this.normalizeIndustry(industry);

    if (marketSizeEstimates[normalizedIndustry]) {
      return {
        ...marketSizeEstimates[normalizedIndustry],
        estimated: true,
        year: new Date().getFullYear()
      };
    }

    return 'N/A';
  }

  /**
   * Estimate market growth based on industry
   */
  estimateMarketGrowth(industry) {
    if (!industry) return 'N/A';

    const marketGrowthEstimates = {
      'Technology': 12.5,
      'Software': 11.3,
      'Healthcare': 8.6,
      'Financial Services': 6.0,
      'Retail': 4.8,
      'Manufacturing': 3.5,
      'Energy & Utilities': 2.7,
      'Telecommunications': 5.4,
      'Media & Entertainment': 7.2
    };

    const normalizedIndustry = this.normalizeIndustry(industry);

    if (marketGrowthEstimates[normalizedIndustry]) {
      return {
        rate: marketGrowthEstimates[normalizedIndustry],
        period: 'annual',
        estimated: true,
        years: '2023-2028'
      };
    }

    return 'N/A';
  }

  /**
   * Get industry trends based on industry
   */
  getIndustryTrends(industry) {
    if (!industry) return [];

    const industryTrends = {
      'Technology': [
        'Digital transformation acceleration',
        'AI and machine learning integration',
        'Edge computing growth',
        'Cybersecurity importance increasing',
        'Cloud computing expansion'
      ],
      'Software': [
        'Low-code/no-code development',
        'DevOps & CI/CD adoption',
        'Microservices architecture',
        'SaaS business model dominance',
        'API-first approach'
      ],
      'Healthcare': [
        'Telehealth expansion',
        'Digital health records standardization',
        'AI in diagnostics',
        'Precision medicine advancement',
        'Value-based care models'
      ],
      'Financial Services': [
        'Open banking initiatives',
        'Blockchain and cryptocurrency integration',
        'Digital-only banking growth',
        'Embedded finance across industries',
        'Regulatory technology expansion'
      ]
    };

    const normalizedIndustry = this.normalizeIndustry(industry);

    if (industryTrends[normalizedIndustry]) {
      return industryTrends[normalizedIndustry];
    }

    // Return generic trends for industries not specifically defined
    return [
      'Digital transformation',
      'Sustainability focus',
      'Supply chain resilience',
      'Data-driven decision making',
      'Customer experience prioritization'
    ];
  }

  /**
   * Identify risk factors based on company data
   */
  identifyRiskFactors(rawData) {
    const risks = [];

    // Company maturity risk
    if (rawData.foundingYear) {
      const age = new Date().getFullYear() - rawData.foundingYear;
      if (age < 3) {
        risks.push({
          factor: 'Early-stage company risk',
          description: 'The company has been operating for less than 3 years, increasing uncertainty about long-term viability.',
          severity: 'High'
        });
      } else if (age < 5) {
        risks.push({
          factor: 'Growth-stage company risk',
          description: 'The company is still in its growth phase with 3-5 years of operation.',
          severity: 'Medium'
        });
      }
    }

    // Industry risks
    const industryRisks = {
      'Technology': {
        factor: 'Technology obsolescence risk',
        description: 'Rapid pace of innovation may lead to technology becoming outdated quickly.',
        severity: 'Medium'
      },
      'Healthcare': {
        factor: 'Regulatory compliance risk',
        description: 'Healthcare industry faces stringent and evolving regulatory requirements.',
        severity: 'High'
      },
      'Financial Services': {
        factor: 'Market volatility risk',
        description: 'Financial services companies are particularly vulnerable to economic downturns and market fluctuations.',
        severity: 'High'
      }
    };

    const normalizedIndustry = this.normalizeIndustry(rawData.industry);
    if (industryRisks[normalizedIndustry]) {
      risks.push(industryRisks[normalizedIndustry]);
    }

    // Size risks
    if (rawData.employeeCount) {
      const count = this.normalizeEmployeeCount(rawData.employeeCount);
      if (typeof count === 'number') {
        if (count < 20) {
          risks.push({
            factor: 'Small team risk',
            description: 'Limited human resources may impact ability to execute business plan.',
            severity: 'Medium'
          });
        }
      }
    }

    // Add general risks if we have few identified
    if (risks.length < 2) {
      risks.push({
        factor: 'Competitive pressure',
        description: 'The company operates in a competitive market environment.',
        severity: 'Medium'
      });

      risks.push({
        factor: 'Economic sensitivity',
        description: 'General economic conditions may impact business performance.',
        severity: 'Medium'
      });
    }

    return risks;
  }

  /**
   * Calculate a risk rating based on company data
   */
  calculateRiskRating(rawData) {
    let score = 50; // Start with neutral score

    // Adjust for company age
    if (rawData.foundingYear) {
      const age = new Date().getFullYear() - rawData.foundingYear;
      if (age < 2) score -= 15;
      else if (age < 5) score -= 10;
      else if (age < 10) score -= 5;
      else if (age > 20) score += 10;
    }

    // Adjust for company size
    if (rawData.employeeCount) {
      const count = this.normalizeEmployeeCount(rawData.employeeCount);
      if (typeof count === 'number') {
        if (count < 10) score -= 10;
        else if (count < 50) score -= 5;
        else if (count > 200) score += 5;
        else if (count > 1000) score += 10;
      }
    }

    // Industry risk adjustment
    const industryRisk = {
      'Technology': 0,
      'Software': -5,
      'Healthcare': 5,
      'Financial Services': -5,
      'Retail': 0,
      'Manufacturing': 10,
      'Energy & Utilities': 5,
      'Telecommunications': 5,
      'Media & Entertainment': -10
    };

    const normalizedIndustry = this.normalizeIndustry(rawData.industry);
    if (industryRisk[normalizedIndustry] !== undefined) {
      score += industryRisk[normalizedIndustry];
    }

    // Calculate rating based on score
    let rating;
    if (score >= 80) rating = 'Very Low Risk';
    else if (score >= 65) rating = 'Low Risk';
    else if (score >= 45) rating = 'Moderate Risk';
    else if (score >= 30) rating = 'High Risk';
    else rating = 'Very High Risk';

    return {
      score,
      rating,
      factors: this.identifyRiskFactors(rawData)
    };
  }

  /**
   * Attempt to enrich data with external sources
   */
  async enrichWithExternalData(normalizedData, rawData) {
    try {
      // For MVP, we'll skip actual API calls to external data sources
      // In the future, this would integrate with financial data APIs
      return normalizedData;
    } catch (error) {
      console.error('Error enriching data with external sources:', error);
      return normalizedData;
    }
  }

  /**
   * Add confidence scores to normalized data
   */
  addConfidenceScores(data) {
    // Clone data to avoid modifying original
    const scoredData = JSON.parse(JSON.stringify(data));

    // Add metadata with confidence scores
    scoredData._metadata = {
      confidence: {
        company: this.calculateSectionConfidence(data.company),
        financials: this.calculateSectionConfidence(data.financials),
        market: this.calculateSectionConfidence(data.market),
        overall: 0 // Will be calculated below
      },
      processedAt: new Date().toISOString(),
      dataVersion: '1.0'
    };

    // Calculate overall confidence
    scoredData._metadata.confidence.overall = (
      scoredData._metadata.confidence.company * 0.4 +
      scoredData._metadata.confidence.financials * 0.4 +
      scoredData._metadata.confidence.market * 0.2
    ).toFixed(2);

    return scoredData;
  }

  /**
   * Calculate confidence score for a data section
   */
  calculateSectionConfidence(section) {
    if (!section) return 0;

    let validFields = 0;
    let totalFields = 0;

    for (const [key, value] of Object.entries(section)) {
      totalFields++;
      if (value !== 'N/A' && value !== null && value !== undefined && value !== '') {
        validFields++;
      }
    }

    return totalFields > 0 ? parseFloat(((validFields / totalFields) * 100).toFixed(2)) : 0;
  }
}

module.exports = new DataService();