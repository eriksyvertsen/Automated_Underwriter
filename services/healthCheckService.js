// services/healthCheckService.js

const os = require('os');
const fs = require('fs').promises;
const { getCollection } = require('../config/db');
const openaiService = require('./openaiService');
const queueService = require('./queueService');

class HealthCheckService {
  constructor() {
    this.healthCache = {
      lastCheck: null,
      result: null,
      ttl: 60000 // 1 minute TTL
    };

    this.metrics = {
      counters: {},
      gauges: {},
      timers: {}
    };

    // Initialize metrics
    this.initializeMetrics();
  }

  initializeMetrics() {
    // System metrics
    this.metrics.gauges.memory_usage = 0;
    this.metrics.gauges.cpu_usage = 0;
    this.metrics.gauges.disk_usage = 0;

    // Application metrics
    this.metrics.counters.api_calls = 0;
    this.metrics.counters.report_generations = 0;
    this.metrics.counters.errors = 0;

    // Service metrics
    this.metrics.gauges.queue_length = 0;
    this.metrics.gauges.active_jobs = 0;
    this.metrics.timers.api_response_time = [];
    this.metrics.timers.report_generation_time = [];
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus() {
    // Use cached result if available and not expired
    if (this.healthCache.result && 
        this.healthCache.lastCheck && 
        Date.now() - this.healthCache.lastCheck < this.healthCache.ttl) {
      return this.healthCache.result;
    }

    try {
      // Get system health
      const systemHealth = await this.checkSystemHealth();

      // Get database health
      const databaseHealth = await this.checkDatabaseHealth();

      // Get API service health
      const apiServiceHealth = await this.checkApiServiceHealth();

      // Get external services health
      const externalServices = await this.checkExternalServices();

      // Combine results
      const result = {
        status: this.calculateOverallStatus([
          systemHealth.status,
          databaseHealth.status,
          apiServiceHealth.status,
          externalServices.status
        ]),
        timestamp: new Date(),
        system: systemHealth,
        database: databaseHealth,
        apiService: apiServiceHealth,
        externalServices: externalServices,
        metrics: this.getCurrentMetrics()
      };

      // Cache result
      this.healthCache.result = result;
      this.healthCache.lastCheck = Date.now();

      return result;
    } catch (error) {
      console.error('Health check error:', error);

      // Return error status
      return {
        status: 'error',
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Check system health (CPU, memory, disk)
   */
  async checkSystemHealth() {
    try {
      // Get memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = Math.round((totalMem - freeMem) / totalMem * 100);

      // Get CPU load average (5 minute)
      const loadAvg = os.loadavg()[1];
      const cpuCount = os.cpus().length;
      const cpuUsage = Math.round((loadAvg / cpuCount) * 100);

      // Get disk usage
      let diskUsage = 0;
      try {
        const diskStats = await this.getDiskUsage();
        diskUsage = diskStats.usagePercent;
      } catch (err) {
        console.warn('Unable to get disk usage:', err);
      }

      // Update metrics
      this.metrics.gauges.memory_usage = memoryUsage;
      this.metrics.gauges.cpu_usage = cpuUsage;
      this.metrics.gauges.disk_usage = diskUsage;

      // Determine status based on resource usage
      let status = 'healthy';
      const issues = [];

      if (memoryUsage > 90) {
        status = 'warning';
        issues.push('High memory usage');
      }

      if (cpuUsage > 80) {
        status = 'warning';
        issues.push('High CPU usage');
      }

      if (diskUsage > 90) {
        status = 'warning';
        issues.push('High disk usage');
      }

      return {
        status: issues.length > 0 ? status : 'healthy',
        memory: {
          total: this.formatBytes(totalMem),
          free: this.formatBytes(freeMem),
          usage: `${memoryUsage}%`
        },
        cpu: {
          count: cpuCount,
          loadAvg: loadAvg,
          usage: `${cpuUsage}%`
        },
        disk: {
          usage: `${diskUsage}%`
        },
        uptime: this.formatUptime(os.uptime()),
        issues
      };
    } catch (error) {
      console.error('System health check error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      // Try to get a collection to test connection
      const collection = await getCollection('health_check');

      // Try a simple operation
      await collection.findOne({ _id: 'test' });

      return {
        status: 'healthy',
        responseTime: '< 100ms' // For simplicity
      };
    } catch (error) {
      console.error('Database health check error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check API service health
   */
  async checkApiServiceHealth() {
    try {
      // Check queue service
      const queueHealth = this.checkQueueServiceHealth();

      return {
        status: queueHealth.status,
        queue: queueHealth,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      console.error('API service health check error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check queue service health
   */
  checkQueueServiceHealth() {
    try {
      const queueLength = queueService.queue.length;
      const activeJobs = queueService.activeJobs;

      // Update metrics
      this.metrics.gauges.queue_length = queueLength;
      this.metrics.gauges.active_jobs = activeJobs;

      // Determine status based on queue size
      let status = 'healthy';
      const issues = [];

      if (queueLength > 20) {
        status = 'warning';
        issues.push('High queue length');
      }

      if (activeJobs >= queueService.maxConcurrentJobs) {
        status = 'warning';
        issues.push('Maximum concurrent jobs reached');
      }

      return {
        status: issues.length > 0 ? status : 'healthy',
        queueLength,
        activeJobs,
        maxConcurrentJobs: queueService.maxConcurrentJobs,
        issues
      };
    } catch (error) {
      console.error('Queue service health check error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check external services health (OpenAI, etc.)
   */
  async checkExternalServices() {
    try {
      // Check OpenAI
      const openaiHealth = await this.checkOpenAIHealth();

      return {
        status: openaiHealth.status,
        openai: openaiHealth
      };
    } catch (error) {
      console.error('External services health check error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check OpenAI connectivity
   */
  async checkOpenAIHealth() {
    try {
      // Try a simple API call
      const startTime = Date.now();

      const response = await openaiService.generateContent(
        'This is a simple health check. Please respond with "ok".',
        {
          maxTokens: 5,
          temperature: 0,
          skipCache: true
        }
      );

      const responseTime = Date.now() - startTime;

      // Check for valid response
      if (response && response.content) {
        return {
          status: 'healthy',
          responseTime: `${responseTime}ms`
        };
      } else {
        return {
          status: 'warning',
          message: 'Unexpected response format'
        };
      }
    } catch (error) {
      console.error('OpenAI health check error:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics() {
    return {
      gauges: { ...this.metrics.gauges },
      counters: { ...this.metrics.counters },
      timers: this.getTimerStats()
    };
  }

  /**
   * Calculate timer statistics
   */
  getTimerStats() {
    const stats = {};

    for (const [name, times] of Object.entries(this.metrics.timers)) {
      if (times.length === 0) {
        stats[name] = { avg: 0, min: 0, max: 0, p95: 0, count: 0 };
        continue;
      }

      const sorted = [...times].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const avg = sum / sorted.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index];

      stats[name] = {
        avg: Math.round(avg),
        min: Math.round(min),
        max: Math.round(max),
        p95: Math.round(p95),
        count: sorted.length
      };
    }

    return stats;
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name, value = 1) {
    if (!this.metrics.counters[name]) {
      this.metrics.counters[name] = 0;
    }

    this.metrics.counters[name] += value;
  }

  /**
   * Set a gauge metric
   */
  setGauge(name, value) {
    this.metrics.gauges[name] = value;
  }

  /**
   * Record a timer metric
   */
  recordTimer(name, timeMs) {
    if (!this.metrics.timers[name]) {
      this.metrics.timers[name] = [];
    }

    this.metrics.timers[name].push(timeMs);

    // Keep only last 100 measurements
    if (this.metrics.timers[name].length > 100) {
      this.metrics.timers[name].shift();
    }
  }

  /**
   * Start a timer and return a function to stop it
   */
  startTimer(name) {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.recordTimer(name, duration);
      return duration;
    };
  }

  /**
   * Helper function to get disk usage
   */
  async getDiskUsage() {
    // This is a simplified implementation for Replit environment
    try {
      // Check /tmp directory usage as a proxy
      const stats = await fs.stat('/tmp');

      // For simplicity, we'll return a fake percentage
      // In a real implementation, you would use a proper disk space check
      return {
        usagePercent: 50 // Mock value
      };
    } catch (error) {
      console.error('Error getting disk usage:', error);
      return {
        usagePercent: 0
      };
    }
  }

  /**
   * Calculate overall status from component statuses
   */
  calculateOverallStatus(statuses) {
    if (statuses.includes('error')) {
      return 'error';
    }

    if (statuses.includes('warning')) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime in days, hours, minutes
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

    return parts.join(', ');
  }
}

module.exports = new HealthCheckService();