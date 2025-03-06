// index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectMongoDB } = require('./config/db');
const { errorHandler } = require('./utils/errorHandler');
const queueService = require('./services/queueService');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    services: {
      database: !!global.db,
      queue: {
        active: queueService.activeJobs,
        queued: queueService.queue.length
      }
    }
  };

  res.status(200).json(health);
});

// Basic route for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Admin routes
app.get('/admin/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Admin users page
app.get('/admin/users.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'users.html'));
});

// Admin reports page
app.get('/admin/reports.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'reports.html'));
});

// Admin settings page
app.get('/admin/settings.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'settings.html'));
});

// Route for viewing a specific report
app.get('/reports/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

// Route for editing a specific report
app.get('/reports/:id/edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report-edit.html'));
});

// Route for customizing a specific report
app.get('/reports/:id/customize', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report-customize.html'));
});

// Default 404 handling
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Error handling middleware
app.use(errorHandler);

// Database connection and server start
async function startServer() {
  try {
    // Start the server before trying to connect to MongoDB
    // This ensures the server is responsive even during DB connection issues
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });

    // Add server close method for testing
    app.close = () => {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error('Error closing server:', err);
            reject(err);
          } else {
            console.log('Server closed successfully');
            resolve();
          }
        });
      });
    };

    // Try to connect to MongoDB in the background
    // This will initialize the connection for later use
    connectMongoDB().then(dbInstance => {
      if (dbInstance) {
        console.log('MongoDB connection established successfully');
      } else {
        console.warn('MongoDB connection failed, using Replit Database as fallback');
      }
    }).catch(err => {
      console.error('Error initializing MongoDB connection:', err);
      console.log('Server will continue running with limited functionality');
    });

    // Schedule regular cleanup tasks
    scheduleMaintenanceTasks();

    // Return the server instance for testing
    return server;
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

/**
 * Schedule regular maintenance tasks
 */
function scheduleMaintenanceTasks() {
  // Clean up old export files every day
  const exportCleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(() => {
    try {
      const pdfExportService = require('./services/pdfExportService');
      pdfExportService.cleanupExports();
      console.log('Cleaned up old export files');
    } catch (error) {
      console.error('Error cleaning up export files:', error);
    }
  }, exportCleanupInterval);

  // Log system stats every hour
  const statsInterval = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    try {
      const memoryUsage = process.memoryUsage();
      console.log('System stats:', {
        memory: {
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        queue: {
          active: queueService.activeJobs,
          queued: queueService.queue.length
        }
      });
    } catch (error) {
      console.error('Error logging system stats:', error);
    }
  }, statsInterval);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In a production environment, you might want to implement 
  // a graceful shutdown here, but for development we'll keep it running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In a production environment, you might want to implement 
  // a graceful shutdown here, but for development we'll keep it running
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app; // Export for testing