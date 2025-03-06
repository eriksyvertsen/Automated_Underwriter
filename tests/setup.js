// tests/setup.js
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock the Replit Database
jest.mock('@replit/database', () => {
  const mockData = {};
  return jest.fn().mockImplementation(() => {
    return {
      set: jest.fn(async (key, value) => {
        mockData[key] = value;
        return true;
      }),
      get: jest.fn(async (key) => {
        return mockData[key];
      }),
      delete: jest.fn(async (key) => {
        delete mockData[key];
        return true;
      }),
      list: jest.fn(async () => {
        return Object.keys(mockData);
      }),
      empty: jest.fn(async () => {
        Object.keys(mockData).forEach(key => delete mockData[key]);
        return true;
      })
    };
  });
});

// Mock OpenAI
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      post: jest.fn(async (endpoint, data) => {
        if (endpoint.includes('chat/completions')) {
          return {
            data: {
              choices: [{
                message: {
                  content: 'This is a mock OpenAI response for testing.'
                }
              }],
              usage: {
                total_tokens: 100
              },
              model: 'gpt-4-turbo'
            }
          };
        }
        return { data: {} };
      }),
      interceptors: {
        response: {
          use: jest.fn((successFn, errorFn) => ({ success: successFn, error: errorFn }))
        }
      }
    }))
  };
});

// Setup MongoDB Memory Server for testing
let mongoServer;
let mongoClient;
let db;

// Set a longer timeout for MongoDB operations
jest.setTimeout(30000);

// Initialize database connection for all tests
beforeAll(async () => {
  try {
    dotenv.config({ path: '.env.test' });

    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Set the MongoDB URI environment variable
    process.env.MONGODB_URI = mongoUri;

    // Connect to the in-memory database
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db();

    // Clear existing collections if any
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }

    // Set up test data in the database
    await setupTestData(db);

    // Set global variables for test helpers
    global.__MONGO_URI__ = mongoUri;
    global.__MONGO_DB_NAME__ = 'jest-test-db';
    global.__MONGO_DB__ = db;

    console.log('MongoDB Memory Server started successfully');
  } catch (error) {
    console.error('Failed to start MongoDB Memory Server:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Clean up resources
    if (mongoClient) {
      await mongoClient.close();
      console.log('MongoDB client connection closed');
    }
    if (mongoServer) {
      await mongoServer.stop();
      console.log('MongoDB Memory Server stopped');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

// Setup test data
async function setupTestData(db) {
  // Create test user
  const usersCollection = db.collection('users');
  const testUser = {
    _id: db.command({ convertToPOJO: true }).ObjectId('60d21b4667d0d8992e610c85'),
    email: 'test@example.com',
    passwordHash: '$2a$10$jAJY9cMUTPe.Gz6FVRq02uOfG1vyqbB5.82xNXzKgdKLYMX21riOi', // password123
    name: 'Test User',
    createdAt: new Date(),
    lastLogin: null,
    usageCount: 0
  };

  await usersCollection.insertOne(testUser);

  // Create test report
  const reportsCollection = db.collection('reports');
  const testReport = {
    _id: db.command({ convertToPOJO: true }).ObjectId('60d21b4667d0d8992e610c86'),
    userId: '60d21b4667d0d8992e610c85',
    companyName: 'Test Company',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'draft',
    templateType: 'standard',
    sections: [],
    storageLocation: null
  };

  await reportsCollection.insertOne(testReport);
}

// Global mock for JWT
jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(() => 'mock-jwt-token'),
    verify: jest.fn((token) => {
      if (token === 'invalid-token') {
        throw new Error('Invalid token');
      }
      return {
        userId: '60d21b4667d0d8992e610c85',
        email: 'test@example.com',
        role: 'user'
      };
    })
  };
});

// Mock bcryptjs
jest.mock('bcryptjs', () => {
  return {
    genSalt: jest.fn(async () => 'mock-salt'),
    hash: jest.fn(async () => 'hashed-password'),
    compare: jest.fn(async (password, hash) => {
      // For testing, consider 'wrong-password' as invalid
      return password !== 'wrong-password';
    })
  };
});

// Mock MongoDB ObjectId
jest.mock('mongodb', () => {
  const actual = jest.requireActual('mongodb');
  return {
    ...actual,
    ObjectId: jest.fn((str) => {
      return { toString: () => str || 'mock-object-id' };
    })
  };
});

// Helper to get test database connection
global.getTestDb = async () => {
  return db;
};

// Helper to clear collections between tests
global.clearCollection = async (collectionName) => {
  if (db) {
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
  }
};

// Export MongoDB client for use in tests
module.exports = { mongoClient, db };