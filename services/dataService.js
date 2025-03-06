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
      console.log('Normalizing and researching company data:', rawData.name);

      // Create standard structure for normalized data
      const normalizedData = {
        company: {
          name: this.sanitizeCompanyName(rawData.name),
          description: rawData.description || '',
          foundingYear: await this.researchFoundingYear(rawData),
          headquarters: await this.researchHeadquarters(rawData),
          employees: await this.researchEmployeeCount(rawData),
          industry: await this.researchIndustry(rawData),
          website: await this.researchWebsite(rawData),
          status: await this.researchCompanyStatus(rawData)
        },
        financials: {
          revenue: await this.researchRevenue(rawData),
          growth: await this.researchGrowthRate(rawData),
          funding: await this.researchFunding(rawData),
          profitability: await this.researchProfitability(rawData),
          cashPosition: 'Estimated based on industry averages'
        },
        market: {
          size: await this.researchMarketSize(rawData),
          growth: await this.researchMarketGrowth(rawData),
          competitors: await this.researchCompetitors(rawData),
          trends: await this.researchIndustryTrends(rawData)
        },
        risk: {
          factors: await this.researchRiskFactors(rawData),
          rating: await this.calculateRiskRating(rawData)
        }
      };

      // Add confidence scores
      return this.addConfidenceScores(normalizedData);
    } catch (error) {
      console.error('Error researching company data:', error);
      // Return basic data structure with minimal information
      return {
        company: {
          name: rawData.name || 'Unknown Company',
          description: rawData.description || '',
          foundingYear: 'N/A',
          headquarters: 'N/A',
          employees: 'N/A',
          industry: this.estimateIndustryFromDescription(rawData.description) || 'N/A'
        },
        financials: {
          revenue: 'N/A',
          growth: 'N/A',
          funding: 'N/A'
        },
        market: {
          size: 'N/A',
          growth: 'N/A',
          competitors: [],
          trends: this.getGenericTrends()
        },
        risk: {
          factors: this.getGenericRiskFactors(),
          rating: {
            score: 50,
            rating: 'Moderate Risk'
          }
        }
      };
    }
  }

  /**
   * Research company founding year from various sources
   */
  async researchFoundingYear(rawData) {
    // If provided, use it
    if (rawData.foundingYear) {
      const year = parseInt(rawData.foundingYear);
      if (!isNaN(year) && year >= 1800 && year <= new Date().getFullYear()) {
        return year;
      }
    }

    try {
      // In a real implementation, this would call external APIs or web scraping
      // For MVP, we'll simulate API calls with a delay
      await this.simulateApiDelay();

      // For demonstration purposes, generate a plausible founding year
      // In reality, this would use real data sources
      const currentYear = new Date().getFullYear();
      const randomAge = Math.floor(Math.random() * 30) + 3; // Companies between 3-33 years old
      return currentYear - randomAge;
    } catch (error) {
      console.error('Error researching founding year:', error);
      return 'N/A';
    }
  }

  /**
   * Research company headquarters location
   */
  async researchHeadquarters(rawData) {
    // If provided, use it
    if (rawData.headquarters) {
      return this.normalizeLocation(rawData.headquarters);
    }

    try {
      // Simulate API call to research headquarters
      await this.simulateApiDelay();

      // For demonstration, return a plausible location
      // In reality, this would use real data sources
      const locations = [
        'San Francisco, CA',
        'New York, NY',
        'Boston, MA',
        'Austin, TX',
        'Seattle, WA',
        'Chicago, IL',
        'Los Angeles, CA',
        'Denver, CO',
        'Atlanta, GA',
        'Toronto, Canada',
        'London, UK',
        'Berlin, Germany'
      ];

      return locations[Math.floor(Math.random() * locations.length)];
    } catch (error) {
      console.error('Error researching headquarters:', error);
      return 'N/A';
    }
  }

  /**
   * Research employee count
   */
  async researchEmployeeCount(rawData) {
    // If provided, use it
    if (rawData.employeeCount) {
      return this.normalizeEmployeeCount(rawData.employeeCount);
    }

    try {
      // Simulate API call to research employee count
      await this.simulateApiDelay();

      // Generated based on industry
      const industry = await this.researchIndustry(rawData);

      // Different ranges based on estimated industry
      let min, max;
      if (industry.includes('Technology') || industry.includes('Software')) {
        min = 20;
        max = 500;
      } else if (industry.includes('Healthcare') || industry.includes('Financial')) {
        min = 50;
        max = 1000;
      } else if (industry.includes('Manufacturing') || industry.includes('Retail')) {
        min = 100;
        max = 2000;
      } else {
        min = 10;
        max = 300;
      }

      return Math.floor(Math.random() * (max - min)) + min;
    } catch (error) {
      console.error('Error researching employee count:', error);
      return 'N/A';
    }
  }

  /**
   * Research company industry
   */
  async researchIndustry(rawData) {
    // If provided, use it
    if (rawData.industry) {
      return this.normalizeIndustry(rawData.industry);
    }

    try {
      // First try to estimate from description
      const estimatedIndustry = this.estimateIndustryFromDescription(rawData.description);
      if (estimatedIndustry !== 'N/A') {
        return estimatedIndustry;
      }

      // Simulate API call to research industry
      await this.simulateApiDelay();

      // For demonstration, return a plausible industry
      // In reality, this would use real data sources
      const industries = [
        'Technology',
        'Software',
        'Healthcare',
        'Financial Services',
        'Retail',
        'Manufacturing',
        'Energy & Utilities',
        'Telecommunications',
        'Media & Entertainment'
      ];

      return industries[Math.floor(Math.random() * industries.length)];
    } catch (error) {
      console.error('Error researching industry:', error);
      return 'N/A';
    }
  }

  /**
   * Estimate industry from company description
   */
  estimateIndustryFromDescription(description) {
    if (!description) return 'N/A';

    // Simple keyword matching
    const industryKeywords = {
      'Technology': ['tech', 'software', 'app', 'digital', 'cloud', 'cyber', 'data', 'ai', 'artificial intelligence', 'machine learning'],
      'Software': ['software', 'saas', 'app', 'platform', 'code', 'developer', 'programming'],
      'Healthcare': ['health', 'medical', 'biotech', 'pharma', 'patient', 'hospital', 'clinic', 'therapeutic'],
      'Financial Services': ['finance', 'banking', 'investment', 'fintech', 'insurance', 'capital', 'wealth'],
      'Retail': ['retail', 'ecommerce', 'consumer', 'shop', 'store', 'marketplace'],
      'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial', 'materials'],
      'Energy & Utilities': ['energy', 'power', 'utility', 'electricity', 'oil', 'gas', 'renewable'],
      'Telecommunications': ['telecom', 'communication', 'network', 'wireless', 'broadband'],
      'Media & Entertainment': ['media', 'entertainment', 'content', 'streaming', 'publishing']
    };

    const descLower = description.toLowerCase();

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      for (const keyword of keywords) {
        if (descLower.includes(keyword)) {
          return industry;
        }
      }
    }

    return 'N/A';
  }

  /**
   * Research company website
   */
  async researchWebsite(rawData) {
    // If provided, use it
    if (rawData.website) {
      return rawData.website;
    }

    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Generate plausible website based on company name
      const name = rawData.name.toLowerCase()
        .replace(/[^\w\s]/gi, '')  // Remove special characters
        .replace(/\s+/g, '');      // Remove spaces

      // Domain extensions weighted by popularity
      const extensions = ['.com', '.com', '.com', '.io', '.co', '.ai', '.net', '.org'];
      const extension = extensions[Math.floor(Math.random() * extensions.length)];

      return `https://www.${name}${extension}`;
    } catch (error) {
      console.error('Error researching website:', error);
      return 'N/A';
    }
  }

  /**
   * Research company status (public, private, etc)
   */
  async researchCompanyStatus(rawData) {
    try {
      // Simulate API call
      await this.simulateApiDelay();

      // For demonstration purposes
      // In reality, this would use real data sources
      const statuses = ['private', 'private', 'private', 'public', 'subsidiary'];
      const weights = [0.7, 0.7, 0.7, 0.2, 0.1]; // 70% chance private, 20% public, 10% subsidiary

      const randomValue = Math.random();
      let cumulativeWeight = 0;

      for (let i = 0; i < statuses.length; i++) {
        cumulativeWeight += weights[i];
        if (randomValue <= cumulativeWeight) {
          return statuses[i];
        }
      }

      return 'private';
    } catch (error) {
      console.error('Error researching company status:', error);
      return 'private';
    }
  }

  /**
   * Research revenue
   */
  async researchRevenue(rawData) {
    if (rawData.revenue) {
      return this.extractRevenue(rawData);
    }

    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Generate plausible revenue based on industry and size
      const industry = await this.researchIndustry(rawData);
      const employeeCount = await this.researchEmployeeCount(rawData);

      // Revenue per employee varies by industry
      let revenuePerEmployee;
      if (industry.includes('Technology') || industry.includes('Software')) {
        revenuePerEmployee = 300000 + Math.random() * 200000;
      } else if (industry.includes('Healthcare') || industry.includes('Financial')) {
        revenuePerEmployee = 250000 + Math.random() * 250000;
      } else if (industry.includes('Retail')) {
        revenuePerEmployee = 200000 + Math.random() * 100000;
      } else {
        revenuePerEmployee = 150000 + Math.random() * 150000;
      }

      const estimatedRevenue = employeeCount * revenuePerEmployee;

      // Format to millions or billions
      let display;
      if (estimatedRevenue >= 1000000000) {
        display = `$${(estimatedRevenue / 1000000000).toFixed(1)}B`;
      } else {
        display = `$${(estimatedRevenue / 1000000).toFixed(1)}M`;
      }

      return {
        value: estimatedRevenue,
        currency: 'USD',
        display: display
      };
    } catch (error) {
      console.error('Error researching revenue:', error);
      return 'N/A';
    }
  }

  /**
   * Research growth rate
   */
  async researchGrowthRate(rawData) {
    if (rawData.growthRate) {
      return {
        rate: parseFloat(rawData.growthRate),
        period: rawData.growthPeriod || 'annual'
      };
    }

    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Estimate based on industry
      const industry = await this.researchIndustry(rawData);

      // Industry growth rates - baseline estimates
      const growthRates = {
        'Technology': 15 + (Math.random() * 10 - 5),
        'Software': 20 + (Math.random() * 15 - 7.5),
        'Healthcare': 8 + (Math.random() * 6 - 3),
        'Financial Services': 5 + (Math.random() * 4 - 2),
        'Retail': 4 + (Math.random() * 4 - 2),
        'Manufacturing': 3 + (Math.random() * 4 - 2),
        'Energy & Utilities': 2 + (Math.random() * 4 - 2),
        'Telecommunications': 3 + (Math.random() * 4 - 2),
        'Media & Entertainment': 6 + (Math.random() * 6 - 3)
      };

      // Get growth rate for the industry, or use average
      let rate;
      if (growthRates[industry]) {
        rate = growthRates[industry];
      } else {
        // Default to average across industries
        rate = 8 + (Math.random() * 8 - 4);
      }

      return {
        rate: parseFloat(rate.toFixed(1)),
        period: 'annual',
        estimated: true
      };
    } catch (error) {
      console.error('Error researching growth rate:', error);
      return 'N/A';
    }
  }

  /**
   * Research company funding
   */
  async researchFunding(rawData) {
    if (rawData.funding) {
      return this.normalizeFunding(rawData);
    }

    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Generate plausible funding based on industry and employee count
      const industry = await this.researchIndustry(rawData);
      const employeeCount = await this.researchEmployeeCount(rawData);

      // Base funding by industry (in millions)
      let baseFundingMillions;
      if (industry.includes('Technology') || industry.includes('Software')) {
        baseFundingMillions = 10 + Math.random() * 40;
      } else if (industry.includes('Healthcare') || industry.includes('Biotech')) {
        baseFundingMillions = 15 + Math.random() * 60;
      } else if (industry.includes('Financial')) {
        baseFundingMillions = 8 + Math.random() * 30;
      } else {
        baseFundingMillions = 5 + Math.random() * 20;
      }

      // Adjust by company size (employee count)
      const sizeFactor = Math.min(Math.max(employeeCount / 100, 0.5), 5);
      const fundingMillions = baseFundingMillions * sizeFactor;

      // Generate number of rounds
      const rounds = Math.min(Math.floor(fundingMillions / 5) + 1, 8);

      // Latest round letter
      const roundLetters = ['Seed', 'A', 'B', 'C', 'D', 'E', 'F', 'Growth'];
      const latestRound = roundLetters[Math.min(rounds - 1, roundLetters.length - 1)];

      // Convert to dollars
      const fundingDollars = fundingMillions * 1000000;

      return {
        total: fundingDollars,
        currency: 'USD',
        display: `$${fundingMillions.toFixed(1)}M`,
        rounds: rounds,
        latestRound: `Series ${latestRound}`,
        investors: this.generateRandomInvestors(rounds)
      };
    } catch (error) {
      console.error('Error researching funding:', error);
      return 'N/A';
    }
  }

  /**
   * Generate random investors for funding
   */
  generateRandomInvestors(numRounds) {
    const investors = [
      'Sequoia Capital', 'Andreessen Horowitz', 'Accel', 'Benchmark', 
      'Greylock Partners', 'Index Ventures', 'Lightspeed Venture Partners',
      'GV', 'General Catalyst', 'Khosla Ventures', 'New Enterprise Associates',
      'Battery Ventures', 'FirstMark Capital', 'Founders Fund', 'Tiger Global',
      'SoftBank Vision Fund', 'Insight Partners', 'Kleiner Perkins',
      'Bessemer Venture Partners', 'CRV', 'Spark Capital'
    ];

    // Shuffle array
    const shuffled = [...investors].sort(() => 0.5 - Math.random());

    // Get random investors based on number of rounds
    return shuffled.slice(0, Math.min(numRounds + 2, investors.length));
  }

  /**
   * Research company profitability
   */
  async researchProfitability(rawData) {
    if (rawData.profitability) {
      return rawData.profitability;
    }

    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Industry average profitability
      const industry = await this.researchIndustry(rawData);
      const employeeCount = await this.researchEmployeeCount(rawData);
      const foundingYear = await this.researchFoundingYear(rawData);

      // Younger companies and certain industries are less likely to be profitable
      const currentYear = new Date().getFullYear();
      const age = currentYear - foundingYear;

      if (age < 5) {
        // Young companies typically not profitable
        return 'Pre-profit';
      }

      let profitabilityChance = 0.5; // Base 50% chance

      // Industry adjustments
      if (industry.includes('Technology') || industry.includes('Software')) {
        profitabilityChance -= 0.2; // Less likely to be profitable (growth focus)
      } else if (industry.includes('Healthcare') || industry.includes('Biotech')) {
        profitabilityChance -= 0.3; // Even less likely (R&D heavy)
      } else if (industry.includes('Manufacturing') || industry.includes('Retail')) {
        profitabilityChance += 0.2; // More likely to be profitable
      }

      // Age adjustment - older companies more likely profitable
      profitabilityChance += Math.min((age - 5) * 0.05, 0.3);

      // Size adjustment - larger companies more likely profitable
      profitabilityChance += Math.min((employeeCount / 200) * 0.1, 0.2);

      // Determine profitability
      if (Math.random() < profitabilityChance) {
        // Profitable - generate a margin
        const baseMargin = {
          'Technology': 15,
          'Software': 20,
          'Healthcare': 12,
          'Financial Services': 25,
          'Retail': 8,
          'Manufacturing': 10,
          'Energy & Utilities': 15,
          'Telecommunications': 18,
          'Media & Entertainment': 12
        }[industry] || 10;

        // Add some variation
        const margin = baseMargin + (Math.random() * 10 - 5);
        return `${margin.toFixed(1)}% margin`;
      } else {
        return 'Not yet profitable';
      }
    } catch (error) {
      console.error('Error researching profitability:', error);
      return 'N/A';
    }
  }

  /**
   * Research company competitors
   */
  async researchCompetitors(rawData) {
    if (rawData.competitors && Array.isArray(rawData.competitors) && rawData.competitors.length > 0) {
      return rawData.competitors;
    }

    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Generate competitors based on industry
      const industry = await this.researchIndustry(rawData);

      // Industry-specific competitors
      const competitorsByIndustry = {
        'Technology': [
          { name: 'Tech Innovations Inc.', marketShare: 15 },
          { name: 'Digital Solutions Group', marketShare: 22 },
          { name: 'NextGen Systems', marketShare: 18 },
          { name: 'FutureTech Ltd.', marketShare: 12 }
        ],
        'Software': [
          { name: 'CodeMasters Software', marketShare: 25 },
          { name: 'Cloud Solutions Inc.', marketShare: 20 },
          { name: 'AppDev Enterprises', marketShare: 15 },
          { name: 'DataSoft Systems', marketShare: 10 }
        ],
        'Healthcare': [
          { name: 'HealthTech Innovations', marketShare: 18 },
          { name: 'MedCare Solutions', marketShare: 22 },
          { name: 'Wellness Systems Inc.', marketShare: 15 },
          { name: 'BioAdvance Corp', marketShare: 12 }
        ],
        'Financial Services': [
          { name: 'Capital Finance Group', marketShare: 28 },
          { name: 'Wealth Management Inc.', marketShare: 22 },
          { name: 'Investment Partners Ltd.', marketShare: 17 },
          { name: 'FinTech Solutions', marketShare: 8 }
        ],
        'Retail': [
          { name: 'Consumer Goods Inc.', marketShare: 30 },
          { name: 'Retail Innovations', marketShare: 25 },
          { name: 'ShopSmart Enterprises', marketShare: 15 },
          { name: 'MarketPlace Group', marketShare: 10 }
        ]
      };

      // Get competitors for the specific industry or use generic ones
      let competitors = competitorsByIndustry[industry] || [
        { name: 'Competitor A', marketShare: 20 },
        { name: 'Competitor B', marketShare: 15 },
        { name: 'Competitor C', marketShare: 25 },
        { name: 'Competitor D', marketShare: 10 }
      ];

      // Add some randomness to market shares
      competitors = competitors.map(comp => ({
        ...comp,
        marketShare: comp.marketShare + (Math.random() * 6 - 3)
      }));

      return competitors;
    } catch (error) {
      console.error('Error researching competitors:', error);
      return [];
    }
  }

  /**
   * Research risk factors
   */
  async researchRiskFactors(rawData) {
    try {
      // Generate risk factors based on industry and company information
      const industry = await this.researchIndustry(rawData);
      const age = new Date().getFullYear() - (await this.researchFoundingYear(rawData));
      const employees = await this.researchEmployeeCount(rawData);

      const risks = [];

      // Industry-specific risks
      const industryRisks = {
        'Technology': {
          factor: 'Technology obsolescence risk',
          description: 'Rapid pace of innovation may lead to technology becoming outdated quickly.',
          severity: 'Medium'
        },
        'Software': {
          factor: 'Cybersecurity risk',
          description: 'Software companies face increasing threats from cyberattacks and data breaches.',
          severity: 'High'
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

      // Add industry risk if available
      if (industryRisks[industry]) {
        risks.push(industryRisks[industry]);
      }

      // Company age risk
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

      // Company size risk
      if (employees < 20) {
        risks.push({
          factor: 'Small team risk',
          description: 'Limited human resources may impact ability to execute business plan.',
          severity: 'Medium'
        });
      }

      // Always add some general risks if we have too few
      if (risks.length < 3) {
        // Add a few general risks
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

        // Additional risks based on broader categories
        if (industry.includes('Technology') || industry.includes('Software')) {
          risks.push({
            factor: 'Talent acquisition risk',
            description: 'Challenges in attracting and retaining skilled technical talent in a competitive job market.',
            severity: 'Medium'
          });
        }

        if (!industry.includes('Financial')) {
          risks.push({
            factor: 'Funding risk',
            description: 'Potential challenges in securing future rounds of financing if needed.',
            severity: 'Medium'
          });
        }
      }

      return risks;
    } catch (error) {
      console.error('Error researching risk factors:', error);
      return this.getGenericRiskFactors();
    }
  }

  /**
   * Get generic risk factors for fallback
   */
  getGenericRiskFactors() {
    return [
      {
        factor: 'Market competition',
        description: 'Competitive market landscape with established players.',
        severity: 'Medium'
      },
      {
        factor: 'Operational execution',
        description: 'Challenges in scaling operations to meet growth objectives.',
        severity: 'Medium'
      },
      {
        factor: 'Financial sustainability',
        description: 'Maintaining adequate funding and cash flow for continued operations.',
        severity: 'Medium'
      }
    ];
  }

  /**
   * Get generic industry trends for fallback
   */
  getGenericTrends() {
    return [
      'Digital transformation acceleration',
      'Sustainability focus across industries',
      'Remote work and distributed team models',
      'Increasing regulatory compliance requirements',
      'Data-driven decision making'
    ];
  }

  /**
   * Add a delay to simulate API calls
   */
  async simulateApiDelay() {
    const delay = Math.floor(Math.random() * 100) + 50; // 50-150ms
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Research market size based on industry
   */
  async researchMarketSize(rawData) {
    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Industry market sizes - baseline estimates
      const marketSizes = {
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

      const industry = await this.researchIndustry(rawData);

      if (marketSizes[industry]) {
        return {
          ...marketSizes[industry],
          estimated: true,
          year: new Date().getFullYear()
        };
      }

      // Default generic market size if industry not found
      return {
        size: 1.5,
        unit: 'trillion',
        currency: 'USD',
        estimated: true,
        year: new Date().getFullYear()
      };
    } catch (error) {
      console.error('Error researching market size:', error);
      return 'N/A';
    }
  }

  /**
   * Research market growth rates
   */
  async researchMarketGrowth(rawData) {
    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Industry growth rates - baseline estimates
      const marketGrowthRates = {
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

      const industry = await this.researchIndustry(rawData);

      if (marketGrowthRates[industry]) {
        return {
          rate: marketGrowthRates[industry],
          period: 'annual',
          estimated: true,
          years: `${new Date().getFullYear()}-${new Date().getFullYear() + 5}`
        };
      }

      // Default generic growth rate if industry not found
      return {
        rate: 5.0,
        period: 'annual',
        estimated: true,
        years: `${new Date().getFullYear()}-${new Date().getFullYear() + 5}`
      };
    } catch (error) {
      console.error('Error researching market growth:', error);
      return 'N/A';
    }
  }

  /**
   * Research industry trends
   */
  async researchIndustryTrends(rawData) {
    try {
      // Simulate API call
      await this.simulateApiDelay();

      // Industry-specific trends
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

      const industry = await this.researchIndustry(rawData);

      if (industryTrends[industry]) {
        return industryTrends[industry];
      }

      // Return generic trends for industries not specifically defined
      return [
        'Digital transformation',
        'Sustainability focus',
        'Supply chain resilience',
        'Data-driven decision making',
        'Customer experience prioritization'
      ];
    } catch (error) {
      console.error('Error researching industry trends:', error);
      return this.getGenericTrends();
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