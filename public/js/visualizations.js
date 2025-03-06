// public/js/visualizations.js

/**
 * Report Visualization Library
 * 
 * This library provides functionality for rendering visualizations 
 * based on report data sections.
 */
class ReportVisualizations {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container element with ID "${containerId}" not found.`);
    }

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
      this.loadChartJS();
    }
  }

  /**
   * Load Chart.js from CDN if not already available
   */
  loadChartJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
      script.integrity = 'sha256-+8RZJua0aEWg+QVVKg4LEzEEm/8RFez5Tb4JBNiV5xA=';
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Render visualizations for a specific section
   * @param {Object} sectionData - The data for the section
   * @param {string} sectionType - The type of section (e.g., 'financialAnalysis')
   */
  renderVisualizations(sectionData, sectionType) {
    if (!sectionData || !sectionData.data) {
      console.warn(`No visualization data available for ${sectionType}`);
      return;
    }

    // Clear the container
    this.container.innerHTML = '';

    // Render metrics (if available)
    if (sectionData.data.metrics && sectionData.data.metrics.length > 0) {
      this.renderMetrics(sectionData.data.metrics);
    }

    // Render charts (if available)
    if (sectionData.data.charts) {
      for (const [chartName, chartData] of Object.entries(sectionData.data.charts)) {
        this.renderChart(chartName, chartData);
      }
    }
  }

  /**
   * Render key metrics as a metric panel
   * @param {Array} metrics - Array of metric objects
   */
  renderMetrics(metrics) {
    const metricsContainer = document.createElement('div');
    metricsContainer.className = 'metrics-container';

    metrics.forEach(metric => {
      const metricBox = document.createElement('div');
      metricBox.className = 'metric-box';

      const metricTitle = document.createElement('div');
      metricTitle.className = 'metric-title';
      metricTitle.textContent = metric.name;

      const metricValue = document.createElement('div');
      metricValue.className = 'metric-value';
      metricValue.textContent = metric.value;

      // Apply styling based on metric type
      if (metric.type === 'percentage') {
        metricValue.classList.add('percentage');
      } else if (metric.type === 'currency') {
        metricValue.classList.add('currency');
      } else if (metric.type === 'score') {
        metricValue.classList.add('score');

        // Add visual indicator for risk scores
        if (metric.name.toLowerCase().includes('risk')) {
          if (metric.value > 70) metricValue.classList.add('risk-high');
          else if (metric.value > 30) metricValue.classList.add('risk-medium');
          else metricValue.classList.add('risk-low');
        }
      }

      const metricDesc = document.createElement('div');
      metricDesc.className = 'metric-desc';
      metricDesc.textContent = metric.description || '';

      metricBox.appendChild(metricTitle);
      metricBox.appendChild(metricValue);
      metricBox.appendChild(metricDesc);

      metricsContainer.appendChild(metricBox);
    });

    this.container.appendChild(metricsContainer);
  }

  /**
   * Render a chart based on chart data
   * @param {string} chartName - The name/id for the chart
   * @param {Object} chartData - The data for the chart
   */
  renderChart(chartName, chartData) {
    // Create a container for the chart
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';

    // Create a header for the chart
    const chartHeader = document.createElement('h4');
    chartHeader.className = 'chart-title';
    chartHeader.textContent = chartData.title || chartName;

    // Create canvas for the chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${chartName}`;

    // Add elements to the DOM
    chartContainer.appendChild(chartHeader);
    chartContainer.appendChild(canvas);
    this.container.appendChild(chartContainer);

    // Create the chart
    this.createChart(canvas.id, chartData);
  }

  /**
   * Create a Chart.js chart from the provided data
   * @param {string} canvasId - The ID of the canvas element
   * @param {Object} chartData - The data for the chart
   */
  createChart(canvasId, chartData) {
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }

    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    let chart;

    // Determine chart type
    switch (chartData.type) {
      case 'line':
        chart = this.createLineChart(ctx, chartData);
        break;
      case 'bar':
        chart = this.createBarChart(ctx, chartData);
        break;
      case 'horizontal-bar':
        chart = this.createHorizontalBarChart(ctx, chartData);
        break;
      case 'pie':
        chart = this.createPieChart(ctx, chartData);
        break;
      case 'radar':
        chart = this.createRadarChart(ctx, chartData);
        break;
      default:
        console.warn(`Unsupported chart type: ${chartData.type}`);
        return;
    }

    // Store the chart instance for potential updates
    canvas.chart = chart;
  }

  /**
   * Create a line chart
   */
  createLineChart(ctx, chartData) {
    const labels = chartData.data.map(item => item.year || item.name || item.label);
    const values = chartData.data.map(item => item.value);

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: chartData.title || 'Value',
          data: values,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false,
            text: chartData.title || ''
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: chartData.startAtZero !== false
          }
        }
      }
    });
  }

  /**
   * Create a bar chart
   */
  createBarChart(ctx, chartData) {
    const labels = chartData.data.map(item => item.name || item.label);
    const values = chartData.data.map(item => item.value);

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: chartData.title || 'Value',
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false,
            text: chartData.title || ''
          },
          legend: {
            display: chartData.showLegend !== false,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * Create a horizontal bar chart
   */
  createHorizontalBarChart(ctx, chartData) {
    const labels = chartData.data.map(item => item.name || item.label);
    const values = chartData.data.map(item => item.value);

    // Create color array based on values for risk factors
    const backgroundColors = values.map(value => {
      if (value > 70) return 'rgba(220, 53, 69, 0.5)'; // high risk - red
      if (value > 30) return 'rgba(255, 193, 7, 0.5)'; // medium risk - yellow
      return 'rgba(40, 167, 69, 0.5)'; // low risk - green
    });

    const borderColors = values.map(value => {
      if (value > 70) return 'rgb(220, 53, 69)'; // high risk - red
      if (value > 30) return 'rgb(255, 193, 7)'; // medium risk - yellow
      return 'rgb(40, 167, 69)'; // low risk - green
    });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: chartData.title || 'Value',
          data: values,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false,
            text: chartData.title || ''
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }

  /**
   * Create a pie chart
   */
  createPieChart(ctx, chartData) {
    const labels = chartData.data.map(item => item.name || item.label);
    const values = chartData.data.map(item => item.value);

    // Generate colors
    const backgroundColors = this.generateColors(labels.length);

    return new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false,
            text: chartData.title || ''
          },
          legend: {
            position: 'right'
          }
        }
      }
    });
  }

  /**
   * Create a radar chart
   */
  createRadarChart(ctx, chartData) {
    const labels = chartData.data.map(item => item.name || item.label);
    const values = chartData.data.map(item => item.value);

    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: chartData.title || 'Value',
          data: values,
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(54, 162, 235)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
          line: {
            borderWidth: 3
          }
        }
      }
    });
  }

  /**
   * Generate an array of colors for charts
   * @param {number} count - The number of colors to generate
   */
  generateColors(count) {
    const baseColors = [
      'rgba(54, 162, 235, 0.5)',  // blue
      'rgba(255, 99, 132, 0.5)',   // red
      'rgba(255, 206, 86, 0.5)',   // yellow
      'rgba(75, 192, 192, 0.5)',   // green
      'rgba(153, 102, 255, 0.5)',  // purple
      'rgba(255, 159, 64, 0.5)',   // orange
      'rgba(199, 199, 199, 0.5)'   // gray
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }

    return colors;
  }
}

// Make available globally
window.ReportVisualizations = ReportVisualizations;