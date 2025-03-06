# AI-Powered Underwriting Report Generator

An AI-powered web application that generates comprehensive, professional-grade underwriting reports for private companies. This application leverages OpenAI's advanced models to analyze company data and produces structured reports with visualizations.

## Phase 2 Implementation

Phase 2 adds essential functionality to the application, including:

1. Enhanced data integration and normalization
2. Full implementation of all report sections
3. Export features (PDF/HTML)
4. Data visualizations for relevant sections

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Access to OpenAI API (API key required)
- Replit account (for deployment)

### Installation

1. Clone the repository or fork the Replit project
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRATION=24h
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## New Features in Phase 2

### Data Normalization and Integration

The new `dataService.js` provides enhanced data processing capabilities:

- Company data normalization and standardization
- Financial data extraction and formatting
- Market data estimation
- Risk assessment calculation
- Data confidence scoring

Example usage:
```javascript
const dataService = require('./services/dataService');

// Normalize user-provided company data
const normalizedData = await dataService.normalizeCompanyData(rawCompanyData);
```

### Enhanced Report Sections

Phase 2 implements all major report sections:

- Executive Summary
- Company Overview
- Market Analysis
- Financial Analysis
- Risk Assessment
- Investment Recommendation

Additional sections based on template type:
- Competitive Analysis
- Management Analysis
- Valuation Analysis

### Export Functionality

Users can now export reports in both PDF and HTML formats:

- Full report export
- Individual section export
- Properly formatted and styled documents

Export routes:
- GET `/api/reports/:id/export?format=[pdf|html]` - Export full report
- GET `/api/reports/:id/sections/:sectionId/export?format=[pdf|html]` - Export a specific section

### Data Visualizations

Interactive visualizations are now available for relevant report sections:

- Financial metrics and charts
- Market analysis visualizations
- Risk assessment dashboards

The `ReportVisualizations` JavaScript class provides client-side rendering of charts and metrics.

## Usage Guide

### Creating a New Report

1. Log in to your account
2. Navigate to the Dashboard and click "Create New Report"
3. Enter company details in the form
4. Select a report template and click "Create Report"

### Generating Report Content

1. Open an existing report
2. Click "Generate Report" to create all sections
3. Or click "Regenerate" on individual sections

### Exporting Reports

1. Open a report
2. Click "Export" and select a format (PDF or HTML)
3. The report will be downloaded to your device

### Using Visualizations

1. Open a report with generated sections
2. Click the "Visualizations" tab in a section
3. View interactive charts and metrics

## Project Structure

```
├── config/                # Configuration files
├── controllers/           # Request handlers
│   ├── reportController.js
│   ├── authController.js
│   └── exportController.js
├── middleware/            # Express middleware
├── models/                # Database models
├── public/                # Static files
│   ├── css/
│   ├── js/
│   │   └── visualizations.js
│   └── *.html
├── routes/                # API routes
├── services/              # Business logic
│   ├── dataService.js     # Data normalization
│   ├── openaiService.js   # AI integration
│   ├── enhancedReportService.js
│   └── pdfExportService.js
├── utils/                 # Helper functions
├── index.js               # Application entry point
└── package.json
```

## Next Steps (Phase 3)

The upcoming Phase 3 will focus on:

1. Additional report sections (Competitive analysis, Financial projections)
2. Resource optimization for better performance
3. Enhanced UI/UX improvements
4. Interactive report customization options

## Credits

This project is developed using:
- Node.js with Express
- MongoDB for data storage
- OpenAI API for report generation
- Chart.js for data visualization
- Bootstrap for styling