// services/queueService.js

class RequestQueueService {
  constructor() {
    this.queue = [];
    this.activeJobs = 0;
    this.maxConcurrentJobs = 3; // Adjust based on Replit resources
    this.listeners = {};
    this.jobStatus = new Map();

    // Start processing the queue
    this.processQueue();

    // Setup cleanup interval
    setInterval(() => {
      this.cleanupCompletedJobs();
    }, 30 * 60 * 1000); // Cleanup every 30 minutes
  }

  /**
   * Add a job to the queue
   * @param {String} jobId - Unique identifier for the job
   * @param {Function} taskFn - Async function to execute
   * @param {Object} data - Data required by the task
   * @param {Object} options - Job options like priority
   * @returns {String} jobId for tracking
   */
  enqueue(jobId, taskFn, data, options = {}) {
    if (!jobId) {
      jobId = `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const priority = options.priority || 1; // Default priority

    // Create the job
    const job = {
      id: jobId,
      taskFn,
      data,
      priority,
      status: 'queued',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 2,
      lastError: null
    };

    // Add to job status map
    this.jobStatus.set(jobId, {
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Insert based on priority (higher number = higher priority)
    const insertIndex = this.queue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    console.log(`Job ${jobId} added to queue. Queue length: ${this.queue.length}`);
    return jobId;
  }

  /**
   * Update job progress
   * @param {String} jobId - Job identifier
   * @param {Number} progress - Progress percentage (0-100)
   * @param {String} status - Current status
   * @param {Object} metadata - Additional status information
   */
  updateJobProgress(jobId, progress, status = 'processing', metadata = {}) {
    const jobStatus = this.jobStatus.get(jobId);
    if (jobStatus) {
      jobStatus.progress = progress;
      jobStatus.status = status;
      jobStatus.updatedAt = new Date();

      if (metadata) {
        jobStatus.metadata = {
          ...jobStatus.metadata,
          ...metadata
        };
      }

      // Notify listeners
      this.notifyJobUpdate(jobId, jobStatus);
    }
  }

  /**
   * Get the current status of a job
   * @param {String} jobId - Job identifier
   * @returns {Object|null} Job status or null if not found
   */
  getJobStatus(jobId) {
    return this.jobStatus.get(jobId) || null;
  }

  /**
   * Process the next job in the queue
   */
  async processQueue() {
    // If at max capacity or queue is empty, wait
    if (this.activeJobs >= this.maxConcurrentJobs || this.queue.length === 0) {
      // Schedule next check
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    // Get the next job
    const job = this.queue.shift();
    this.activeJobs++;

    try {
      // Update status
      job.status = 'processing';
      job.startedAt = new Date();
      job.attempts++;

      this.updateJobProgress(job.id, 0, 'processing');

      // Process the job with a progress callback
      const progressCallback = (progress, metadata) => {
        this.updateJobProgress(job.id, progress, 'processing', metadata);
      };

      // Execute the task
      const result = await job.taskFn(job.data, progressCallback);

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      this.updateJobProgress(job.id, 100, 'completed', { result });

      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);

      // Handle retry logic
      if (job.attempts < job.maxAttempts) {
        // Re-queue the job with increased priority to avoid starvation
        this.queue.unshift({
          ...job,
          priority: job.priority + 1,
          status: 'queued'
        });

        this.updateJobProgress(job.id, 0, 'retrying', {
          error: error.message,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts
        });
      } else {
        // Job failed after max attempts
        job.status = 'failed';
        job.failedAt = new Date();
        job.lastError = error.message;

        this.updateJobProgress(job.id, 0, 'failed', {
          error: error.message,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts
        });
      }
    } finally {
      // Decrement active jobs count
      this.activeJobs--;

      // Continue processing queue
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Subscribe to job updates
   * @param {String} jobId - Job identifier
   * @param {Function} callback - Function to call when job status changes
   */
  subscribeToJobUpdates(jobId, callback) {
    if (!this.listeners[jobId]) {
      this.listeners[jobId] = [];
    }

    this.listeners[jobId].push(callback);

    // Immediately notify with current status
    const currentStatus = this.getJobStatus(jobId);
    if (currentStatus) {
      callback(currentStatus);
    }

    // Return unsubscribe function
    return () => {
      this.listeners[jobId] = this.listeners[jobId].filter(cb => cb !== callback);
      if (this.listeners[jobId].length === 0) {
        delete this.listeners[jobId];
      }
    };
  }

  /**
   * Notify all job listeners
   * @param {String} jobId - Job identifier
   * @param {Object} status - Job status
   */
  notifyJobUpdate(jobId, status) {
    if (this.listeners[jobId]) {
      this.listeners[jobId].forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error(`Error in job listener for ${jobId}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup completed and failed jobs
   */
  cleanupCompletedJobs() {
    const now = Date.now();
    const maxAge = 12 * 60 * 60 * 1000; // 12 hours

    // Cleanup job status map
    for (const [jobId, status] of this.jobStatus.entries()) {
      if (
        (status.status === 'completed' || status.status === 'failed') &&
        now - status.updatedAt > maxAge
      ) {
        this.jobStatus.delete(jobId);
        delete this.listeners[jobId];
      }
    }
  }
}

// Export a singleton instance
const queueService = new RequestQueueService();
module.exports = queueService;