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
    if (mongoClient) return db;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('MongoDB URI not found. Only Replit Database will be available.');
      return null;
    }

    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db();

    console.log('Connected to MongoDB Atlas');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null;
  }
};

// Get MongoDB collection
const getCollection = async (collectionName) => {
  if (!db) {
    db = await connectMongoDB();
    if (!db) throw new Error('Failed to connect to MongoDB');
  }
  return db.collection(collectionName);
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