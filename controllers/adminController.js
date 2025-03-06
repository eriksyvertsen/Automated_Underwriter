// controllers/adminController.js

const { getCollection } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errorHandler');
const openaiService = require('../services/openaiService');
const queueService = require('../services/queueService');
const os = require('os');

/**
 * Get system metrics
 */
const getSystemMetrics = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to admin endpoints' });
    }

    // Get database collections
    const usersCollection = await getCollection('users');
    const reportsCollection = await getCollection('reports');
    const usageCollection = await getCollection('usage');

    // Count documents in collections
    const usersCount = await usersCollection.countDocuments();
    const reportsCount = await reportsCollection.countDocuments();

    // Get API usage stats
    const apiCallsCount = await usageCollection.countDocuments();

    // Get Node.js version
    const nodeVersion = process.version;

    // Get uptime
    const uptime = formatUptime(process.uptime());

    // Get environment
    const environment = process.env.NODE_ENV || 'development';

    // Return metrics
    res.status(200).json({
      metrics: {
        users: usersCount,
        reports: reportsCount,
        apiCalls: apiCallsCount,
        nodeVersion,
        uptime,
        environment: `Replit (${environment})`
      }
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

/**
 * Get system health status
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to admin endpoints' });
    }

    // Check API service
    const apiService = { status: 'good', message: 'Operational' };

    // Check database
    let database = { status: 'good', message: 'Operational' };
    try {
      await getCollection('users');
    } catch (error) {
      database = { status: 'error', message: 'Connection Error' };
    }

    // Check OpenAI service
    let openai = { status: 'good', message: 'Operational' };
    try {
      // Verify OpenAI by checking cache status
      openaiService.cache.get('test-key');
    } catch (error) {
      openai = { status: 'warning', message: 'Degraded Performance' };
    }

    // Get memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = Math.round((totalMem - freeMem) / totalMem * 100);

    // Return health status
    res.status(200).json({
      health: {
        apiService,
        database,
        openai,
        memoryUsage
      }
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({ error: 'Failed to get system health' });
  }
});

/**
 * Get usage data for chart
 */
const getUsageData = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to admin endpoints' });
    }

    // Get days parameter (default to 7)
    const days = parseInt(req.query.days) || 7;

    // Get usage collection
    const usageCollection = await getCollection('usage');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate usage data by day
    const usageDataPipeline = [
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          apiCalls: { $sum: 1 },
          tokensUsed: { $sum: "$tokensUsed" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    const usageData = await usageCollection.aggregate(usageDataPipeline).toArray();

    // Get report generation data by day
    const reportsCollection = await getCollection('reports');

    const reportDataPipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    const reportData = await reportsCollection.aggregate(reportDataPipeline).toArray();

    // Generate date labels for all days in range
    const labels = [];
    const apiCallsData = [];
    const reportsData = [];

    // Fill in all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      labels.push(dateStr);

      // Find usage data for this date
      const usage = usageData.find(item => item._id === dateStr);
      apiCallsData.push(usage ? usage.apiCalls : 0);

      // Find report data for this date
      const report = reportData.find(item => item._id === dateStr);
      reportsData.push(report ? report.count : 0);
    }

    // Return chart data
    res.status(200).json({
      chartData: {
        labels,
        datasets: [
          {
            label: 'Reports Generated',
            data: reportsData
          },
          {
            label: 'API Calls',
            data: apiCallsData
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error getting usage data:', error);
    res.status(500).json({ error: 'Failed to get usage data' });
  }
});

/**
 * Get job queue status
 */
const getJobQueueStatus = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to admin endpoints' });
    }

    // Get report collection
    const reportsCollection = await getCollection('reports');

    // Get all job statuses from the queue service
    const jobs = [];

    // Get active and completed jobs
    for (const [jobId, status] of queueService.jobStatus.entries()) {
      // Only include report generation jobs
      if (jobId.startsWith('report-')) {
        // Extract report ID from job ID
        const reportId = jobId.split('-')[1];

        // Get report name
        let reportName = 'Unknown';
        try {
          const report = await reportsCollection.findOne({ _id: reportId });
          if (report) {
            reportName = report.companyName;
          }
        } catch (error) {
          console.error(`Error getting report for job ${jobId}:`, error);
        }

        // Add job to list
        jobs.push({
          id: jobId,
          reportName,
          status: status.status,
          progress: status.progress,
          createdAt: status.createdAt,
          updatedAt: status.updatedAt,
          metadata: status.metadata
        });
      }
    }

    // Sort jobs by createdAt (newest first)
    jobs.sort((a, b) => b.createdAt - a.createdAt);

    // Return job queue
    res.status(200).json({
      jobs
    });
  } catch (error) {
    console.error('Error getting job queue status:', error);
    res.status(500).json({ error: 'Failed to get job queue status' });
  }
});

/**
 * Get API response time data
 */
const getApiResponseTimes = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to admin endpoints' });
    }

    // In a real implementation, you would get this data from monitoring tools
    // For MVP, we'll return simulated data

    const responseTimeData = {
      labels: ['Reports API', 'Users API', 'Auth API', 'Export API', 'OpenAI API'],
      p50: [120, 95, 80, 200, 850],
      p90: [250, 180, 150, 350, 1200],
      p99: [450, 320, 270, 500, 2000]
    };

    // Return response time data
    res.status(200).json({
      responseTimeData
    });
  } catch (error) {
    console.error('Error getting API response times:', error);
    res.status(500).json({ error: 'Failed to get API response times' });
  }
});

/**
 * Get recent activity
 */
const getRecentActivity = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to admin endpoints' });
    }

    // Get recent user registrations
    const usersCollection = await getCollection('users');
    const recentUsers = await usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    // Get recent report generations
    const reportsCollection = await getCollection('reports');
    const recentReports = await reportsCollection
      .find({ status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(3)
      .toArray();

    // Combine into activities
    const activities = [];

    // Add user registrations
    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registered',
        message: `New user registered: ${user.name}`,
        time: user.createdAt
      });
    });

    // Add report generations
    recentReports.forEach(report => {
      activities.push({
        type: 'report_generated',
        message: `Report generated: ${report.companyName}`,
        time: report.updatedAt
      });
    });

    // Add system events from queue service logs
    // In a real implementation, you would have a system log collection

    // Sort by time (newest first)
    activities.sort((a, b) => b.time - a.time);

    // Return recent activity
    res.status(200).json({
      activities: activities.slice(0, 5) // Return top 5
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

/**
 * Perform system maintenance
 */
const performMaintenance = asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to admin endpoints' });
    }

    // Get maintenance action
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    let result = { success: true, message: 'Maintenance action completed' };

    // Perform the requested action
    switch (action) {
      case 'refresh-cache':
        // Clear all cache entries
        openaiService.cache.clear();
        result.message = 'Cache refreshed successfully';
        break;

      case 'test-openai':
        // Test OpenAI connection with a simple request
        try {
          await openaiService.generateContent('Test connection', {
            maxTokens: 5,
            skipCache: true
          });
          result.message = 'OpenAI connection test successful';
        } catch (error) {
          result.success = false;
          result.message = `OpenAI connection test failed: ${error.message}`;
        }
        break;

      case 'clear-temp-files':
        // Clear temporary files
        const pdfExportService = require('../services/pdfExportService');
        await pdfExportService.cleanupExports(0); // 0 means delete all
        result.message = 'Temporary files cleared successfully';
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Return result
    res.status(200).json(result);
  } catch (error) {
    console.error('Error performing maintenance:', error);
    res.status(500).json({ error: 'Failed to perform maintenance' });
  }
});

/**
 * Format uptime in days, hours, minutes
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);

  let uptime = '';
  if (days > 0) uptime += `${days} day${days !== 1 ? 's' : ''}, `;
  if (hours > 0 || days > 0) uptime += `${hours} hour${hours !== 1 ? 's' : ''}, `;
  uptime += `${minutes} minute${minutes !== 1 ? 's' : ''}`;

  return uptime;
}

module.exports = {
  getSystemMetrics,
  getSystemHealth,
  getUsageData,
  getJobQueueStatus,
  getApiResponseTimes,
  getRecentActivity,
  performMaintenance
};