// services/errorTrackingService.js

class ErrorTrackingService {
  constructor() {
    this.errors = [];
    this.maxStoredErrors = 1000; // Maximum number of errors to store
    this.errorCounts = new Map(); // Track error counts by type
  }

  /**
   * Track an error
   */
  trackError(error, context = {}) {
    try {
      // Create error entry
      const errorEntry = {
        message: error.message,
        stack: error.stack,
        type: error.name || 'Error',
        timestamp: new Date(),
        context: {
          ...context,
          url: context.url || null,
          method: context.method || null,
          userId: context.userId || null,
          reportId: context.reportId || null
        }
      };

      // Add to error log
      this.errors.unshift(errorEntry);

      // Trim error log if needed
      if (this.errors.length > this.maxStoredErrors) {
        this.errors = this.errors.slice(0, this.maxStoredErrors);
      }

      // Update error count
      const errorType = errorEntry.type;
      this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);

      // Log to console
      console.error('Tracked error:', errorEntry.message, context);

      return errorEntry;
    } catch (err) {
      // Prevent infinite loop if error in error tracking
      console.error('Error in error tracking:', err);
      return null;
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 50) {
    return this.errors.slice(0, limit);
  }

  /**
   * Get error counts by type
   */
  getErrorCounts() {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = [];
    this.errorCounts.clear();
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type, limit = 50) {
    return this.errors
      .filter(error => error.type === type)
      .slice(0, limit);
  }

  /**
   * Search errors
   */
  searchErrors(query, limit = 50) {
    if (!query) return this.getRecentErrors(limit);

    const lowerQuery = query.toLowerCase();

    return this.errors
      .filter(error => 
        error.message.toLowerCase().includes(lowerQuery) ||
        (error.context.userId && error.context.userId.toLowerCase().includes(lowerQuery)) ||
        (error.context.reportId && error.context.reportId.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }
}

module.exports = new ErrorTrackingService();