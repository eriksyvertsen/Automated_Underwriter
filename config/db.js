const { MongoClient } = require('mongodb');
const Client = require('@replit/database');

// MongoDB Atlas connection
let mongoClient = null;
let db = null;

// Replit Database
const replitDb = new Client();

// Connect to MongoDB Atlas
const connectMongoDB = async () => {
  try {
    if (mongoClient && db) {
      console.log('Reusing existing MongoDB connection');
      return db;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MongoDB URI not found. Only Replit Database will be available.');
      return null;
    }

    console.log('Attempting to connect to MongoDB Atlas...');
    // Close any existing connection before creating a new one
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch (e) {
        console.error('Error closing existing MongoDB client:', e);
      }
      mongoClient = null;
      db = null;
    }

    mongoClient = new MongoClient(uri, {
      connectTimeoutMS: 15000,
      socketTimeoutMS: 60000,
    });

    await mongoClient.connect();
    db = mongoClient.db();

    console.log('Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Cleanup if there was an error during connection
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch (e) {
        console.error('Error closing MongoDB client:', e);
      }
      mongoClient = null;
      db = null;
    }
    return null;
  }
};

// Get MongoDB collection with improved retry logic
const getCollection = async (collectionName) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  let retries = 0;
  let lastError = null;

  while (retries < MAX_RETRIES) {
    try {
      if (!db) {
        console.log(`Connecting to MongoDB (attempt ${retries + 1}/${MAX_RETRIES})...`);
        db = await connectMongoDB();
        if (!db) {
          throw new Error('Connection returned null');
        }
      }

      // Get the collection
      const collection = db.collection(collectionName);

      // Don't use stats() - it's not reliable. Instead, do a simple read operation
      // that doesn't require any actual data
      await collection.findOne({ _id: 'test-connection' }, { projection: { _id: 1 } });

      return collection;
    } catch (error) {
      lastError = error;
      console.error(`MongoDB connection attempt ${retries + 1}/${MAX_RETRIES} failed:`, error.message);

      // Reset connection for retry
      if (mongoClient) {
        try {
          await mongoClient.close();
        } catch (e) {
          console.error('Error closing MongoDB client:', e);
        }
        mongoClient = null;
        db = null;
      }

      retries++;
      if (retries < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY * retries}ms...`);
        await sleep(RETRY_DELAY * retries); // Exponential backoff
      }
    }
  }

  console.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
  throw new Error(`Failed to connect to MongoDB: ${lastError ? lastError.message : 'Unknown error'}`);
};

// Replit DB wrapper for session storage
const sessions = {
  async set(sessionId, data, expiryInMinutes = 60) {
    const expiry = Date.now() + (expiryInMinutes * 60 * 1000);
    await replitDb.set(`session:${sessionId}`, { ...data, expiry });
  },

  async get(sessionId) {
    try {
      const session = await replitDb.get(`session:${sessionId}`);
      if (!session) return null;

      // Check if session has expired
      if (session.expiry && session.expiry < Date.now()) {
        await replitDb.delete(`session:${sessionId}`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  },

  async delete(sessionId) {
    await replitDb.delete(`session:${sessionId}`);
  }
};

// Replit DB wrapper for rate limiting
const rateLimits = {
  async increment(key, windowMs = 60000) {
    try {
      const now = Date.now();
      const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;

      const current = await replitDb.get(windowKey) || 0;
      await replitDb.set(windowKey, current + 1);

      // Set expiry for the rate limit key
      const ttl = windowMs - (now % windowMs);
      setTimeout(async () => {
        await replitDb.delete(windowKey);
      }, ttl);

      return current + 1;
    } catch (error) {
      console.error('Error updating rate limit:', error);
      return 1;
    }
  },

  async get(key, windowMs = 60000) {
    try {
      const now = Date.now();
      const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
      return await replitDb.get(windowKey) || 0;
    } catch (error) {
      console.error('Error getting rate limit:', error);
      return 0;
    }
  }
};

module.exports = {
  connectMongoDB,
  getCollection,
  sessions,
  rateLimits,
  replitDb
};