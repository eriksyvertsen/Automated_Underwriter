import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Move, Check, X, Save, AlertCircle, Settings, Layout, FileText, PenTool } from 'lucide-react';

// Main customization component
const ReportCustomizer = ({ reportId, onSave, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [customization, setCustomization] = useState({
    enabledSections: [],
    sectionOrder: [],
    theme: 'standard',
    includeTOC: true,
    includeVisualizations: true
  });
  const [availableSections, setAvailableSections] = useState([]);
  const [availableThemes, setAvailableThemes] = useState([]);
  const [activeTab, setActiveTab] = useState('sections');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get available options
        const optionsResponse = await fetch('/api/reports/options/sections', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!optionsResponse.ok) {
          throw new Error('Failed to fetch options');
        }

        const optionsData = await optionsResponse.json();
        setAvailableSections(optionsData.sections);
        setAvailableThemes(optionsData.themes);

        // Get current customization
        const customizationResponse = await fetch(`/api/reports/${reportId}/customization`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!customizationResponse.ok) {
          throw new Error('Failed to fetch customization');
        }

        const customizationData = await customizationResponse.json();

        // Initialize section order if it's empty
        let customizationSettings = customizationData.customization;
        if (!customizationSettings.sectionOrder || customizationSettings.sectionOrder.length === 0) {
          customizationSettings.sectionOrder = [...customizationSettings.enabledSections];
        }

        setCustomization(customizationSettings);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching customization data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [reportId]);

  // Save customization
  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch(`/api/reports/${reportId}/customization`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customization)
      });

      if (!response.ok) {
        throw new Error('Failed to save customization');
      }

      setSaving(false);
      if (onSave) onSave(customization);
    } catch (error) {
      console.error('Error saving customization:', error);
      setError(error.message);
      setSaving(false);
    }
  };

  // Toggle a section on/off
  const toggleSection = (sectionId) => {
    setCustomization(prev => {
      let newEnabledSections = [...prev.enabledSections];

      if (newEnabledSections.includes(sectionId)) {
        // Remove section
        newEnabledSections = newEnabledSections.filter(id => id !== sectionId);

        // Also remove from section order
        const newSectionOrder = prev.sectionOrder.filter(id => id !== sectionId);
        return {
          ...prev,
          enabledSections: newEnabledSections,
          sectionOrder: newSectionOrder
        };
      } else {
        // Add section
        newEnabledSections.push(sectionId);

        // Add to end of section order
        const newSectionOrder = [...prev.sectionOrder, sectionId];
        return {
          ...prev,
          enabledSections: newEnabledSections,
          sectionOrder: newSectionOrder
        };
      }
    });
  };

  // Move a section up or down in order
  const moveSection = (sectionId, direction) => {
    setCustomization(prev => {
      const newSectionOrder = [...prev.sectionOrder];
      const index = newSectionOrder.indexOf(sectionId);

      if (index === -1) return prev;

      if (direction === 'up' && index > 0) {
        // Swap with previous item
        [newSectionOrder[index], newSectionOrder[index - 1]] = 
        [newSectionOrder[index - 1], newSectionOrder[index]];
      } else if (direction === 'down' && index < newSectionOrder.length - 1) {
        // Swap with next item
        [newSectionOrder[index], newSectionOrder[index + 1]] = 
        [newSectionOrder[index + 1], newSectionOrder[index]];
      }

      return { ...prev, sectionOrder: newSectionOrder };
    });
  };

  // Change theme
  const changeTheme = (themeId) => {
    setCustomization(prev => ({
      ...prev,
      theme: themeId
    }));
  };

  // Toggle a setting
  const toggleSetting = (setting) => {
    setCustomization(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-2">Loading customization options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center mb-4">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error: {error}</span>
        </div>
        <button 
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={onCancel}
        >
          Back
        </button>
      </div>
    );
  }

  // Group sections by category
  const sectionsByCategory = availableSections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {});

  // Helper function to find section title
  const getSectionTitle = (sectionId) => {
    const section = availableSections.find(s => s.id === sectionId);
    return section ? section.title : sectionId;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
        <h2 className="text-xl font-semibold">Report Customization</h2>
        <div className="flex space-x-2">
          <button 
            className="px-3 py-1.5 bg-white text-blue-600 rounded hover:bg-blue-50 flex items-center"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-r-transparent rounded-full mr-2"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                <span>Save</span>
              </>
            )}
          </button>
          <button 
            className="px-3 py-1.5 bg-transparent text-white border border-white rounded hover:bg-blue-700"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex" aria-label="Tabs">
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'sections' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('sections')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Sections
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'appearance' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('appearance')}
          >
            <Layout className="h-4 w-4 mr-2" />
            Appearance
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'settings' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </nav>
      </div>

      <div className="p-4">
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Report Sections</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select the sections you want to include in your report and drag to reorder them.
              </p>

              {/* Enabled Sections (for ordering) */}
              <div className="mb-6 border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="font-medium">Enabled Sections (drag to reorder)</h4>
                </div>
                <div className="divide-y">
                  {customization.sectionOrder.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No sections enabled. Select sections below to include them in your report.
                    </div>
                  ) : (
                    customization.sectionOrder.map((sectionId, index) => (
                      <div key={sectionId} className="flex items-center p-3 group hover:bg-gray-50">
                        <span className="mr-3 text-gray-400 w-6 text-center">{index + 1}</span>
                        <Move className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="flex-1">{getSectionTitle(sectionId)}</span>
                        <div className="flex space-x-1">
                          <button 
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            onClick={() => moveSection(sectionId, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            onClick={() => moveSection(sectionId, 'down')}
                            disabled={index === customization.sectionOrder.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 text-gray-400 hover:text-red-600"
                            onClick={() => toggleSection(sectionId)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Available Sections */}
              <div>
                <h4 className="font-medium mb-2">Available Sections</h4>
                {Object.entries(sectionsByCategory).map(([category, sections]) => (
                  <div key={category} className="mb-4">
                    <h5 className="text-sm font-medium text-gray-500 uppercase mb-2">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h5>
                    <div className="space-y-2">
                      {sections.map(section => (
                        <div 
                          key={section.id}
                          className={`p-3 border rounded-md flex items-center ${
                            customization.enabledSections.includes(section.id)
                              ? 'bg-blue-50 border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{section.title}</div>
                            <div className="text-sm text-gray-500">{section.description}</div>
                          </div>
                          <button
                            className={`ml-4 p-1.5 rounded-md ${
                              customization.enabledSections.includes(section.id) 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            onClick={() => toggleSection(section.id)}
                          >
                            {customization.enabledSections.includes(section.id) ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Report Appearance</h3>
              <p className="text-sm text-gray-500 mb-4">
                Customize the visual style of your report.
              </p>

              {/* Theme Selection */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Theme</h4>
                <div className="grid grid-cols-2 gap-4">
                  {availableThemes.map(theme => (
                    <div 
                      key={theme.id}
                      className={`border rounded-lg overflow-hidden cursor-pointer ${
                        customization.theme === theme.id 
                          ? 'ring-2 ring-blue-500 border-blue-500' 
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => changeTheme(theme.id)}
                    >
                      <div className="h-32 bg-gray-100 flex items-center justify-center">
                        {theme.preview ? (
                          <img 
                            src={theme.preview} 
                            alt={theme.name} 
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="p-4 text-center">
                            <Layout className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                            <span className="text-sm text-gray-500">Preview not available</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center">
                          {customization.theme === theme.id && (
                            <Check className="h-4 w-4 text-blue-500 mr-1" />
                          )}
                          <span className="font-medium">{theme.name}</span>
                        </div>
                        <div className="text-sm text-gray-500">{theme.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Report Settings</h3>
              <p className="text-sm text-gray-500 mb-4">
                Additional configuration options for your report.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Table of Contents</div>
                    <div className="text-sm text-gray-500">Include an automatic table of contents</div>
                  </div>
                  <div className="relative inline-block w-12 h-6 mr-2">
                    <input 
                      type="checkbox" 
                      className="opacity-0 w-0 h-0"
                      checked={customization.includeTOC}
                      onChange={() => toggleSetting('includeTOC')}
                      id="toc-toggle"
                    />
                    <label 
                      htmlFor="toc-toggle"
                      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                        customization.includeTOC ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span 
                        className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                          customization.includeTOC ? 'translate-x-6' : 'translate-x-0'
                        }`} 
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Data Visualizations</div>
                    <div className="text-sm text-gray-500">Include charts and data visualizations</div>
                  </div>
                  <div className="relative inline-block w-12 h-6 mr-2">
                    <input 
                      type="checkbox" 
                      className="opacity-0 w-0 h-0"
                      checked={customization.includeVisualizations}
                      onChange={() => toggleSetting('includeVisualizations')}
                      id="viz-toggle"
                    />
                    <label 
                      htmlFor="viz-toggle"
                      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                        customization.includeVisualizations ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span 
                        className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                          customization.includeVisualizations ? 'translate-x-6' : 'translate-x-0'
                        }`} 
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t flex justify-end">
        <div className="space-x-3">
          <button 
            className="px-4 py-2 border bg-white rounded-md hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Customization'}
          </button>
        </div>
      </div>
    </div>
  );
};

// For Lucide-React compatibility
const Plus = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default ReportCustomizer;