// public/js/templateSelector.js

class TemplateSelector {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = {
      onSelect: null,
      initialTemplate: 'standard',
      ...options
    };

    this.templates = [];
    this.selectedTemplate = this.options.initialTemplate;

    this.init();
  }

  async init() {
    try {
      // Fetch available templates
      await this.fetchTemplates();

      // Render template selector
      this.render();

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing template selector:', error);
      this.container.innerHTML = '<div class="alert alert-danger">Error loading templates</div>';
    }
  }

  async fetchTemplates() {
    // In a real implementation, this would call an API
    // For now, we'll use a static list
    this.templates = [
      { id: 'standard', name: 'Standard', description: 'General purpose balanced template' },
      { id: 'conservative', name: 'Conservative', description: 'Risk-focused template emphasizing downside protection' },
      { id: 'technology', name: 'Technology', description: 'Specialized for tech companies' },
      { id: 'healthcare', name: 'Healthcare', description: 'Specialized for healthcare companies' },
      { id: 'earlyStage', name: 'Early Stage', description: 'For pre-revenue or early revenue companies' }
    ];
  }

  render() {
    this.container.innerHTML = `
      <div class="template-selector">
        <label class="form-label">Report Template Style</label>
        <div class="template-options">
          ${this.templates.map(template => `
            <div class="template-option ${this.selectedTemplate === template.id ? 'selected' : ''}">
              <input type="radio" name="template" id="template-${template.id}" 
                     value="${template.id}" ${this.selectedTemplate === template.id ? 'checked' : ''}>
              <label for="template-${template.id}">
                <strong>${template.name}</strong>
                <span class="description">${template.description}</span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const templateOptions = this.container.querySelectorAll('input[name="template"]');
    templateOptions.forEach(option => {
      option.addEventListener('change', () => {
        this.selectedTemplate = option.value;

        // Update selected class
        this.container.querySelectorAll('.template-option').forEach(el => {
          el.classList.remove('selected');
        });
        option.closest('.template-option').classList.add('selected');

        // Call onSelect callback if provided
        if (typeof this.options.onSelect === 'function') {
          this.options.onSelect(this.selectedTemplate);
        }
      });
    });
  }

  getSelectedTemplate() {
    return this.selectedTemplate;
  }
}

// Make available globally
window.TemplateSelector = TemplateSelector;