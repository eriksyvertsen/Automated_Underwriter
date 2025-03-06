// public/js/reportEditor.js

/**
 * Enhanced Report Editor
 * 
 * This module provides functionality for editing report content
 * with rich text capabilities and section management.
 */
class ReportEditor {
  constructor(options = {}) {
    this.options = {
      reportId: null,
      containerId: 'editor-container',
      apiBasePath: '/api/reports',
      onSave: null,
      onChange: null,
      readOnly: false,
      ...options
    };

    this.report = null;
    this.currentSection = null;
    this.editingSection = null;
    this.unsavedChanges = false;
    this.editorInstances = {};

    this.init();
  }

  /**
   * Initialize the editor
   */
  async init() {
    try {
      this.container = document.getElementById(this.options.containerId);
      if (!this.container) {
        console.error(`Container element with ID "${this.options.containerId}" not found.`);
        return;
      }

      // Create editor UI
      this.createEditorUI();

      // Load report data
      if (this.options.reportId) {
        await this.loadReport(this.options.reportId);
      }

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing report editor:', error);
      this.showError('Failed to initialize editor. Please try again.');
    }
  }

  /**
   * Create editor UI structure
   */
  createEditorUI() {
    this.container.innerHTML = `
      <div class="editor-container">
        <div class="editor-header">
          <div class="editor-title">
            <h1 id="report-title">Loading report...</h1>
            <span class="status-badge" id="report-status">Draft</span>
          </div>
          <div class="editor-actions">
            ${!this.options.readOnly ? `
              <button id="customize-btn" class="btn btn-sm btn-outline-primary" title="Customize Report">
                <i class="bi bi-sliders"></i> Customize
              </button>
              <button id="generate-btn" class="btn btn-sm btn-primary" title="Generate All Sections">
                <i class="bi bi-magic"></i> Generate
              </button>
              <button id="save-btn" class="btn btn-sm btn-success" title="Save Changes" disabled>
                <i class="bi bi-save"></i> Save
              </button>
            ` : ''}
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="exportDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-download"></i> Export
              </button>
              <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="exportDropdown">
                <li><a class="dropdown-item" href="#" id="export-pdf">PDF</a></li>
                <li><a class="dropdown-item" href="#" id="export-html">HTML</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="editor-content">
          <div class="editor-sidebar" id="editor-sidebar">
            <div class="sidebar-header">
              <h3>Sections</h3>
              ${!this.options.readOnly ? `
                <button id="add-section-btn" class="btn btn-sm btn-outline-primary" title="Add Section">
                  <i class="bi bi-plus"></i>
                </button>
              ` : ''}
            </div>
            <div class="section-list" id="section-list">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Loading sections...</span>
              </div>
            </div>
          </div>

          <div class="editor-main">
            <div id="section-editor-container" class="section-editor-container">
              <div class="text-center my-5 py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading content...</span>
                </div>
                <p class="mt-3">Loading report content...</p>
              </div>
            </div>
          </div>
        </div>

        <div id="editor-overlay" class="editor-overlay" style="display: none;">
          <div class="overlay-content">
            <div class="spinner-border text-light" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-light" id="overlay-message">Processing...</p>
          </div>
        </div>
      </div>
    `;

    // Apply styles if not already in stylesheet
    this.applyStyles();
  }

  /**
   * Apply custom styles for the editor
   */
  applyStyles() {
    // Check if styles already exist
    if (document.getElementById('report-editor-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'report-editor-styles';
    styleEl.textContent = `
      .editor-container {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 600px;
        background-color: #fff;
        border-radius: 0.5rem;
        box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        overflow: hidden;
      }

      .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #dee2e6;
        background-color: #f8f9fa;
      }

      .editor-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .editor-title h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .status-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        border-radius: 0.25rem;
        background-color: #6c757d;
        color: #fff;
      }

      .status-badge.draft { background-color: #6c757d; }
      .status-badge.generating { background-color: #ffc107; color: #212529; }
      .status-badge.in_progress { background-color: #17a2b8; }
      .status-badge.completed { background-color: #28a745; }
      .status-badge.failed { background-color: #dc3545; }

      .editor-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .editor-content {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .editor-sidebar {
        width: 250px;
        border-right: 1px solid #dee2e6;
        background-color: #f8f9fa;
        overflow-y: auto;
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #dee2e6;
      }

      .sidebar-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .section-list {
        padding: 1rem;
      }

      .section-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        margin-bottom: 0.5rem;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: background-color 0.15s ease-in-out;
      }

      .section-item:hover {
        background-color: #e9ecef;
      }

      .section-item.active {
        background-color: #007bff;
        color: #fff;
      }

      .section-item.active .section-actions .btn {
        color: #fff;
      }

      .section-item.unsaved {
        position: relative;
      }

      .section-item.unsaved::after {
        content: '';
        display: block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #dc3545;
        position: absolute;
        top: 50%;
        right: 0.5rem;
        transform: translateY(-50%);
      }

      .section-name {
        font-weight: 500;
        margin-right: auto;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .section-actions {
        display: flex;
        gap: 0.25rem;
      }

      .section-actions .btn {
        padding: 0.25rem;
        font-size: 0.75rem;
        color: #6c757d;
        background: transparent;
        border: none;
      }

      .section-actions .btn:hover {
        color: #212529;
      }

      .editor-main {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
      }

      .section-editor-container {
        max-width: 800px;
        margin: 0 auto;
      }

      .section-editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .section-editor-title {
        font-size: 1.25rem;
        font-weight: 600;
      }

      .section-editor-actions {
        display: flex;
        gap: 0.5rem;
      }

      .section-content-container {
        margin-bottom: 1rem;
      }

      .section-content {
        min-height: 300px;
        padding: 1rem;
        border: 1px solid #dee2e6;
        border-radius: 0.25rem;
        background-color: #fff;
        white-space: pre-wrap;
      }

      .section-content-editor {
        min-height: 300px;
        border: 1px solid #dee2e6;
        border-radius: 0.25rem;
        background-color: #fff;
      }

      .section-metadata {
        margin-top: 1rem;
        padding: 0.75rem;
        background-color: #f8f9fa;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        color: #6c757d;
      }

      .section-metadata-item {
        display: flex;
        margin-bottom: 0.25rem;
      }

      .section-metadata-label {
        font-weight: 500;
        margin-right: 0.5rem;
      }

      .section-visualizations {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: #f8f9fa;
        border-radius: 0.25rem;
      }

      .section-visualization-title {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
      }

      .metrics-container {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .metric-box {
        flex: 1;
        min-width: 120px;
        padding: 1rem;
        background-color: #fff;
        border: 1px solid #dee2e6;
        border-radius: 0.25rem;
        text-align: center;
      }

      .metric-title {
        font-size: 0.75rem;
        color: #6c757d;
        margin-bottom: 0.5rem;
      }

      .metric-value {
        font-size: 1.5rem;
        font-weight: 600;
        color: #007bff;
        margin-bottom: 0.25rem;
      }

      .metric-desc {
        font-size: 0.75rem;
        color: #6c757d;
      }

      .chart-container {
        height: 300px;
        margin-bottom: 1.5rem;
      }

      .editor-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .overlay-content {
        text-align: center;
      }

      .empty-section-message {
        text-align: center;
        padding: 3rem;
        background-color: #f8f9fa;
        border-radius: 0.25rem;
        color: #6c757d;
      }

      .empty-section-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: #adb5bd;
      }

      .add-section-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 1000;
        min-width: 200px;
        padding: 0.5rem 0;
        background-color: #fff;
        border: 1px solid #dee2e6;
        border-radius: 0.25rem;
        box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
      }

      .add-section-dropdown-header {
        padding: 0.5rem 1rem;
        font-weight: 600;
        color: #6c757d;
        font-size: 0.875rem;
      }

      .add-section-dropdown-item {
        display: block;
        width: 100%;
        padding: 0.5rem 1rem;
        text-align: left;
        background-color: transparent;
        border: 0;
        cursor: pointer;
        transition: background-color 0.15s ease-in-out;
      }

      .add-section-dropdown-item:hover {
        background-color: #f8f9fa;
      }

      .tox-tinymce {
        border-radius: 0.25rem;
        border-color: #dee2e6 !important;
      }

      .unsaved-warning {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        padding: 1rem;
        background-color: #fff3cd;
        color: #856404;
        border-left: 4px solid #ffc107;
        border-radius: 0.25rem;
        box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        z-index: 1050;
        display: none;
      }

      @media (max-width: 768px) {
        .editor-content {
          flex-direction: column;
        }

        .editor-sidebar {
          width: 100%;
          border-right: none;
          border-bottom: 1px solid #dee2e6;
          max-height: 200px;
        }
      }
    `;

    document.head.appendChild(styleEl);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle save button click
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveCurrentSection());
    }

    // Handle customize button click
    const customizeBtn = document.getElementById('customize-btn');
    if (customizeBtn) {
      customizeBtn.addEventListener('click', () => this.showCustomizationModal());
    }

    // Handle generate button click
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateAllSections());
    }

    // Handle export buttons
    const exportPdfBtn = document.getElementById('export-pdf');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => this.exportReport('pdf'));
    }

    const exportHtmlBtn = document.getElementById('export-html');
    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', () => this.exportReport('html'));
    }

    // Handle add section button click
    const addSectionBtn = document.getElementById('add-section-btn');
    if (addSectionBtn) {
      addSectionBtn.addEventListener('click', (e) => this.showAddSectionDropdown(e));
    }

    // Handle window beforeunload event to warn about unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  /**
   * Load report data from the API
   */
  async loadReport(reportId) {
    try {
      this.showOverlay('Loading report...');

      // Fetch report data
      const response = await fetch(`${this.options.apiBasePath}/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load report');
      }

      const data = await response.json();
      this.report = data.report;

      // Update UI
      this.updateReportHeader();
      this.renderSectionList();

      // Select first section by default
      if (this.report.sections && this.report.sections.length > 0) {
        this.selectSection(this.report.sections[0].id);
      } else {
        this.renderEmptySectionEditor();
      }

      this.hideOverlay();
    } catch (error) {
      console.error('Error loading report:', error);
      this.hideOverlay();
      this.showError('Failed to load report. Please try again.');
    }
  }

  /**
   * Update report header with title and status
   */
  updateReportHeader() {
    const titleEl = document.getElementById('report-title');
    const statusEl = document.getElementById('report-status');

    if (titleEl) titleEl.textContent = this.report.companyName;

    if (statusEl) {
      statusEl.textContent = this.formatStatus(this.report.status);
      statusEl.className = `status-badge ${this.report.status}`;
    }

    // Update save button state
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.disabled = !this.unsavedChanges;
    }
  }

  /**
   * Format status string for display
   */
  formatStatus(status) {
    if (!status) return 'Draft';

    // Convert snake_case to Title Case
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Render section list in sidebar
   */
  renderSectionList() {
    const sectionList = document.getElementById('section-list');
    if (!sectionList) return;

    if (!this.report.sections || this.report.sections.length === 0) {
      sectionList.innerHTML = `
        <div class="text-center p-3 text-muted">
          <p>No sections yet</p>
          ${!this.options.readOnly ? `
            <button id="add-first-section-btn" class="btn btn-sm btn-outline-primary">
              <i class="bi bi-plus"></i> Add Section
            </button>
          ` : ''}
        </div>
      `;

      // Add event listener for the add first section button
      const addFirstSectionBtn = document.getElementById('add-first-section-btn');
      if (addFirstSectionBtn) {
        addFirstSectionBtn.addEventListener('click', (e) => this.showAddSectionDropdown(e));
      }

      return;
    }

    // Sort sections based on customization order if available
    let sortedSections = [...this.report.sections];
    if (this.report.customization && this.report.customization.sectionOrder && this.report.customization.sectionOrder.length > 0) {
      const orderMap = new Map();
      this.report.customization.sectionOrder.forEach((sectionType, index) => {
        orderMap.set(sectionType, index);
      });

      sortedSections.sort((a, b) => {
        const aOrder = orderMap.has(a.type) ? orderMap.get(a.type) : 999;
        const bOrder = orderMap.has(b.type) ? orderMap.get(b.type) : 999;
        return aOrder - bOrder;
      });
    }

    // Create the section list HTML
    const sectionsHtml = sortedSections.map(section => {
      const isActive = this.currentSection && this.currentSection.id === section.id;
      const isUnsaved = this.editingSection && this.editingSection.id === section.id && this.unsavedChanges;

      return `
        <div class="section-item ${isActive ? 'active' : ''} ${isUnsaved ? 'unsaved' : ''}" data-section-id="${section.id}">
          <span class="section-name">${section.title}</span>
          <div class="section-actions">
            ${!this.options.readOnly ? `
              <button class="btn regenerate-btn" title="Regenerate Section">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            ` : ''}
            <button class="btn view-btn" title="View Section">
              <i class="bi bi-eye"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    sectionList.innerHTML = sectionsHtml;

    // Add event listeners
    document.querySelectorAll('.section-item').forEach(item => {
      // Click on section item to select
      item.addEventListener('click', (e) => {
        // Ignore if clicking on buttons
        if (e.target.closest('.section-actions')) return;

        const sectionId = item.dataset.sectionId;
        this.selectSection(sectionId);
      });

      // View button
      const viewBtn = item.querySelector('.view-btn');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          const sectionId = item.dataset.sectionId;
          this.selectSection(sectionId);
        });
      }

      // Regenerate button
      const regenerateBtn = item.querySelector('.regenerate-btn');
      if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
          const sectionId = item.dataset.sectionId;
          this.regenerateSection(sectionId);
        });
      }
    });
  }

  /**
   * Select a section to display in the editor
   */
  async selectSection(sectionId) {
    // Check for unsaved changes first
    if (this.unsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Do you want to save them before switching sections?');
      if (confirm) {
        await this.saveCurrentSection();
      } else {
        this.unsavedChanges = false;
      }
    }

    // Find the section
    const section = this.report.sections.find(s => s.id === sectionId);
    if (!section) {
      console.error(`Section with ID ${sectionId} not found`);
      return;
    }

    this.currentSection = section;

    // Update active section in list
    document.querySelectorAll('.section-item').forEach(item => {
      if (item.dataset.sectionId === sectionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Render the section editor
    this.renderSectionEditor(section);
  }

  /**
   * Render the section editor
   */
  renderSectionEditor(section) {
    const editorContainer = document.getElementById('section-editor-container');
    if (!editorContainer) return;

    // Destroy any existing editor instances
    if (this.editorInstances[section.id]) {
      this.editorInstances[section.id].remove();
      delete this.editorInstances[section.id];
    }

    // Reset editing state
    this.editingSection = null;
    this.unsavedChanges = false;

    // Create the section editor HTML
    editorContainer.innerHTML = `
      <div class="section-editor-header">
        <h2 class="section-editor-title">${section.title}</h2>
        <div class="section-editor-actions">
          ${!this.options.readOnly ? `
            <button id="edit-section-btn" class="btn btn-sm btn-outline-primary">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button id="regenerate-section-btn" class="btn btn-sm btn-outline-secondary">
              <i class="bi bi-arrow-clockwise"></i> Regenerate
            </button>
          ` : ''}
        </div>
      </div>

      <div class="section-content-container">
        <div id="section-content" class="section-content">${section.content}</div>
      </div>

      ${section.metadata ? `
        <div class="section-metadata">
          <div class="section-metadata-item">
            <span class="section-metadata-label">Generated:</span>
            <span>${new Date(section.generatedAt).toLocaleString()}</span>
          </div>
          ${section.metadata.model ? `
            <div class="section-metadata-item">
              <span class="section-metadata-label">Model:</span>
              <span>${section.metadata.model}</span>
            </div>
          ` : ''}
          ${section.metadata.tokensUsed ? `
            <div class="section-metadata-item">
              <span class="section-metadata-label">Tokens:</span>
              <span>${section.metadata.tokensUsed.toLocaleString()}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${section.data ? `
        <div class="section-visualizations">
          <h3 class="section-visualization-title">Visualizations</h3>
          <div id="visualizations-container-${section.id}"></div>
        </div>
      ` : ''}
    `;

    // Add event listeners for action buttons
    const editBtn = document.getElementById('edit-section-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.editSection(section));
    }

    const regenerateBtn = document.getElementById('regenerate-section-btn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => this.regenerateSection(section.id));
    }

    // Initialize visualizations if available
    if (section.data) {
      this.initializeVisualizations(section);
    }

    // Update save button state
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
    }
  }

  /**
   * Initialize visualizations for a section
   */
  initializeVisualizations(section) {
    const visualizationsContainer = document.getElementById(`visualizations-container-${section.id}`);
    if (!visualizationsContainer || !section.data) return;

    // Check if ReportVisualizations is available
    if (typeof window.ReportVisualizations === 'undefined') {
      visualizationsContainer.innerHTML = `
        <div class="alert alert-warning">
          Visualization library not loaded. Please refresh the page.
        </div>
      `;
      return;
    }

    // Initialize metrics if available
    if (section.data.metrics && section.data.metrics.length > 0) {
      const metricsContainer = document.createElement('div');
      metricsContainer.className = 'metrics-container';

      section.data.metrics.forEach(metric => {
        const metricBox = document.createElement('div');
        metricBox.className = 'metric-box';

        metricBox.innerHTML = `
          <div class="metric-title">${metric.name}</div>
          <div class="metric-value ${this.getMetricClass(metric)}">${metric.value}</div>
          <div class="metric-desc">${metric.description || ''}</div>
        `;

        metricsContainer.appendChild(metricBox);
      });

      visualizationsContainer.appendChild(metricsContainer);
    }

    // Initialize charts if available
    if (section.data.charts) {
      for (const [chartName, chartData] of Object.entries(section.data.charts)) {
        const chartTitle = document.createElement('h4');
        chartTitle.className = 'mt-4 mb-2';
        chartTitle.textContent = chartData.title || chartName;

        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.id = `chart-${section.id}-${chartName}`;

        visualizationsContainer.appendChild(chartTitle);
        visualizationsContainer.appendChild(chartContainer);

        // Initialize chart (after DOM is ready)
        setTimeout(() => {
          const visualizer = new ReportVisualizations(`chart-${section.id}-${chartName}`);
          visualizer.renderChart(chartName, chartData);
        }, 0);
      }
    }
  }

  /**
   * Get CSS class for a metric based on type
   */
  getMetricClass(metric) {
    if (metric.type === 'risk') {
      if (metric.value > 70) return 'text-danger';
      if (metric.value > 30) return 'text-warning';
      return 'text-success';
    } else if (metric.type === 'percentage') {
      return 'text-primary';
    } else if (metric.type === 'currency') {
      return 'text-success';
    }
    return '';
  }

  /**
   * Enter edit mode for a section
   */
  editSection(section) {
    this.editingSection = section;

    const contentContainer = document.querySelector('.section-content-container');
    if (!contentContainer) return;

    // Replace content div with editor
    contentContainer.innerHTML = `
      <div id="section-editor" class="section-content-editor"></div>
    `;

    // Initialize TinyMCE if available
    if (typeof tinymce !== 'undefined') {
      tinymce.init({
        selector: '#section-editor',
        plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table paste help wordcount',
        toolbar: 'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        height: 400,
        menubar: false,
        branding: false,
        setup: (editor) => {
          editor.on('init', () => {
            editor.setContent(section.content);
          });

          editor.on('change', () => {
            this.unsavedChanges = true;
            this.updateSaveButtonState();
          });

          this.editorInstances[section.id] = editor;
        }
      });
    } else {
      // Fallback to textarea if TinyMCE is not available
      const textareaEl = document.createElement('textarea');
      textareaEl.id = 'section-editor-fallback';
      textareaEl.className = 'form-control';
      textareaEl.style.height = '400px';
      textareaEl.value = section.content;

      document.getElementById('section-editor').appendChild(textareaEl);

      textareaEl.addEventListener('input', () => {
        this.unsavedChanges = true;
        this.updateSaveButtonState();
      });
    }

    // Update buttons in editor header
    const editorHeader = document.querySelector('.section-editor-header');
    if (editorHeader) {
      editorHeader.querySelector('.section-editor-actions').innerHTML = `
        <button id="cancel-edit-btn" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-x"></i> Cancel
        </button>
        <button id="save-section-btn" class="btn btn-sm btn-primary">
          <i class="bi bi-save"></i> Save
        </button>
      `;

      // Add event listeners
      document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        this.cancelEdit();
      });

      document.getElementById('save-section-btn').addEventListener('click', () => {
        this.saveCurrentSection();
      });
    }
  }

  /**
   * Cancel editing and revert to view mode
   */
  cancelEdit() {
    if (this.unsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirm) return;
    }

    this.unsavedChanges = false;
    this.renderSectionEditor(this.currentSection);
  }

  /**
   * Save the current section being edited
   */
  async saveCurrentSection() {
    if (!this.editingSection) return;

    try {
      this.showOverlay('Saving...');

      // Get content from editor
      let content;
      if (this.editorInstances[this.editingSection.id]) {
        content = this.editorInstances[this.editingSection.id].getContent();
      } else {
        const textareaEl = document.getElementById('section-editor-fallback');
        if (textareaEl) {
          content = textareaEl.value;
        } else {
          throw new Error('Editor instance not found');
        }
      }

      // Update section in report
      const updatedSection = {
        ...this.editingSection,
        content,
        edited: true,
        updatedAt: new Date()
      };

      // Find and update the section in the report
      const sectionIndex = this.report.sections.findIndex(s => s.id === updatedSection.id);
      if (sectionIndex !== -1) {
        this.report.sections[sectionIndex] = updatedSection;
      }

      // Send update to server
      const response = await fetch(`${this.options.apiBasePath}/${this.report._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sections: this.report.sections
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save section');
      }

      // Reset state
      this.unsavedChanges = false;
      this.currentSection = updatedSection;
      this.editingSection = null;

      // Update UI
      this.renderSectionList();
      this.renderSectionEditor(updatedSection);
      this.updateSaveButtonState();

      this.hideOverlay();

      // Notify change if callback is provided
      if (typeof this.options.onSave === 'function') {
        this.options.onSave(updatedSection);
      }
    } catch (error) {
      console.error('Error saving section:', error);
      this.hideOverlay();
      this.showError('Failed to save section. Please try again.');
    }
  }

  /**
   * Update save button state based on unsaved changes
   */
  updateSaveButtonState() {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.disabled = !this.unsavedChanges;
    }

    // Update section item in list to show unsaved indicator
    document.querySelectorAll('.section-item').forEach(item => {
      if (this.editingSection && item.dataset.sectionId === this.editingSection.id) {
        if (this.unsavedChanges) {
          item.classList.add('unsaved');
        } else {
          item.classList.remove('unsaved');
        }
      } else {
        item.classList.remove('unsaved');
      }
    });
  }

  /**
   * Regenerate a section
   */
  async regenerateSection(sectionId) {
    // Find the section
    const section = this.report.sections.find(s => s.id === sectionId);
    if (!section) {
      console.error(`Section with ID ${sectionId} not found`);
      return;
    }

    const confirm = window.confirm(`Are you sure you want to regenerate the "${section.title}" section? This will replace the current content.`);
    if (!confirm) return;

    try {
      this.showOverlay(`Regenerating ${section.title}...`);

      // Call the API to regenerate the section
      const response = await fetch(`${this.options.apiBasePath}/${this.report._id}/section`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sectionType: section.type,
          // For demo purposes, we're not sending real company data
          companyData: {
            name: this.report.companyName
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate section');
      }

      const data = await response.json();

      // Update the report with the new section
      const sectionIndex = this.report.sections.findIndex(s => s.id === section.id);
      if (sectionIndex !== -1) {
        this.report.sections[sectionIndex] = data.section;
      }

      // Update UI
      this.renderSectionList();

      // If this was the current section, update the editor
      if (this.currentSection && this.currentSection.id === section.id) {
        this.currentSection = data.section;
        this.renderSectionEditor(data.section);
      }

      this.hideOverlay();
    } catch (error) {
      console.error('Error regenerating section:', error);
      this.hideOverlay();
      this.showError('Failed to regenerate section. Please try again.');
    }
  }

  /**
   * Show the customization modal
   */
  showCustomizationModal() {
    // For MVP, redirect to the customization page
    window.location.href = `/reports/${this.report._id}/customize`;
  }

  /**
   * Generate all sections for the report
   */
  async generateAllSections() {
    const confirm = window.confirm('Are you sure you want to generate all sections? This might take a few minutes.');
    if (!confirm) return;

    try {
      this.showOverlay('Generating report...');

      // Call the API to generate the report
      const response = await fetch(`${this.options.apiBasePath}/${this.report._id}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyData: {
            name: this.report.companyName
          },
          templateType: this.report.templateType || 'standard'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start report generation');
      }

      const data = await response.json();

      this.hideOverlay();

      // Show a message about background processing
      alert('Report generation has started. This process runs in the background and may take a few minutes. You can check the status in the dashboard or refresh this page later.');

      // Redirect to dashboard or status page
      window.location.href = '/dashboard.html';
    } catch (error) {
      console.error('Error generating report:', error);
      this.hideOverlay();
      this.showError('Failed to start report generation. Please try again.');
    }
  }

  /**
   * Export the report as PDF or HTML
   */
  async exportReport(format) {
    try {
      this.showOverlay(`Preparing ${format.toUpperCase()} export...`);

      // Call the export API
      const response = await fetch(`${this.options.apiBasePath}/${this.report._id}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to export report as ${format}`);
      }

      const data = await response.json();

      this.hideOverlay();

      // Open the download URL in a new tab
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        this.showError('Export URL not available. Please try again.');
      }
    } catch (error) {
      console.error(`Error exporting report as ${format}:`, error);
      this.hideOverlay();
      this.showError(`Failed to export report as ${format}. Please try again.`);
    }
  }

  /**
   * Show the add section dropdown
   */
  showAddSectionDropdown(event) {
    // Create dropdown if it doesn't exist
    let dropdown = document.querySelector('.add-section-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'add-section-dropdown';
      document.body.appendChild(dropdown);

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.add-section-dropdown') && !e.target.closest('#add-section-btn') && !e.target.closest('#add-first-section-btn')) {
          dropdown.style.display = 'none';
        }
      });
    }

    // Position dropdown relative to button
    const buttonRect = event.target.closest('button').getBoundingClientRect();
    dropdown.style.top = `${buttonRect.bottom}px`;
    dropdown.style.left = `${buttonRect.left}px`;

    // Get available section types
    this.getAvailableSections().then(sections => {
      // Group sections by category
      const sectionsByCategory = sections.reduce((acc, section) => {
        if (!acc[section.category]) {
          acc[section.category] = [];
        }
        acc[section.category].push(section);
        return acc;
      }, {});

      // Create dropdown content
      let dropdownContent = '';

      Object.entries(sectionsByCategory).forEach(([category, sections]) => {
        dropdownContent += `
          <div class="add-section-dropdown-header">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
        `;

        sections.forEach(section => {
          // Check if section already exists in report
          const sectionExists = this.report.sections.some(s => s.type === section.id);

          dropdownContent += `
            <button class="add-section-dropdown-item" data-section-type="${section.id}" ${sectionExists ? 'disabled' : ''}>
              ${section.title}
              ${sectionExists ? ' (already added)' : ''}
            </button>
          `;
        });
      });

      dropdown.innerHTML = dropdownContent;

      // Add event listeners for dropdown items
      dropdown.querySelectorAll('.add-section-dropdown-item:not([disabled])').forEach(item => {
        item.addEventListener('click', () => {
          const sectionType = item.dataset.sectionType;
          this.addSection(sectionType);
          dropdown.style.display = 'none';
        });
      });

      // Show dropdown
      dropdown.style.display = 'block';
    })
    .catch(error => {
      console.error('Error loading available sections:', error);
      dropdown.innerHTML = `
        <div class="p-3 text-danger">
          Failed to load available sections
        </div>
      `;
      dropdown.style.display = 'block';
    });
  }

  /**
   * Get available section types from the API
   */
  async getAvailableSections() {
    const response = await fetch(`${this.options.apiBasePath}/options/sections`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load available sections');
    }

    const data = await response.json();
    return data.sections;
  }

  /**
   * Add a new section to the report
   */
  async addSection(sectionType) {
    try {
      this.showOverlay('Adding section...');

      // Call the API to generate the section
      const response = await fetch(`${this.options.apiBasePath}/${this.report._id}/section`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sectionType,
          companyData: {
            name: this.report.companyName
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add section');
      }

      const data = await response.json();

      // Add the new section to the report
      this.report.sections.push(data.section);

      // Update UI
      this.renderSectionList();

      // Select the new section
      this.selectSection(data.section.id);

      this.hideOverlay();
    } catch (error) {
      console.error('Error adding section:', error);
      this.hideOverlay();
      this.showError('Failed to add section. Please try again.');
    }
  }

  /**
   * Render empty state when no section is selected
   */
  renderEmptySectionEditor() {
    const editorContainer = document.getElementById('section-editor-container');
    if (!editorContainer) return;

    editorContainer.innerHTML = `
      <div class="empty-section-message">
        <div class="empty-section-icon">
          <i class="bi bi-file-earmark-text"></i>
        </div>
        <h3>No sections found</h3>
        <p>Add sections to your report using the sidebar.</p>
        ${!this.options.readOnly ? `
          <button id="add-first-section-btn" class="btn btn-primary mt-3">
            <i class="bi bi-plus"></i> Add Section
          </button>
        ` : ''}
      </div>
    `;

    // Add event listener for the add first section button
    const addFirstSectionBtn = document.getElementById('add-first-section-btn');
    if (addFirstSectionBtn) {
      addFirstSectionBtn.addEventListener('click', (e) => this.showAddSectionDropdown(e));
    }
  }

  /**
   * Show the loading overlay
   */
  showOverlay(message = 'Loading...') {
    const overlay = document.getElementById('editor-overlay');
    const overlayMessage = document.getElementById('overlay-message');

    if (overlayMessage) overlayMessage.textContent = message;
    if (overlay) overlay.style.display = 'flex';
  }

  /**
   * Hide the loading overlay
   */
  hideOverlay() {
    const overlay = document.getElementById('editor-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /**
   * Show an error message
   */
  showError(message) {
    // Create error alert if it doesn't exist
    let errorAlert = document.querySelector('.editor-error-alert');
    if (!errorAlert) {
      errorAlert = document.createElement('div');
      errorAlert.className = 'alert alert-danger editor-error-alert fixed-bottom m-3';
      errorAlert.style.maxWidth = '400px';
      document.body.appendChild(errorAlert);

      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'btn-close';
      closeBtn.setAttribute('data-bs-dismiss', 'alert');
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.addEventListener('click', () => {
        errorAlert.style.display = 'none';
      });

      errorAlert.appendChild(closeBtn);
    }

    // Set message
    errorAlert.innerHTML = `
      <div>${message}</div>
      <button type="button" class="btn-close" onclick="this.parentElement.style.display='none'"></button>
    `;

    // Show alert
    errorAlert.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorAlert) errorAlert.style.display = 'none';
    }, 5000);
  }
}

// Make available globally
window.ReportEditor = ReportEditor;