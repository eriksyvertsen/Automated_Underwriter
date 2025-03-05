require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectMongoDB } = require('./config/db');
const { errorHandler } = require('./utils/errorHandler');

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

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic route for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

    // Return the server instance for testing
    return server;
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
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

module.exports = app; // Export for testing