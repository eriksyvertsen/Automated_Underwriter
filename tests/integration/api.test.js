// tests/integration/api.test.js
const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');
// Import the app conditionally to handle potential errors
let app;
try {
  app = require('../../index');
} catch (error) {
  console.error('Failed to load app:', error);
  // Create a mock app for tests
  const express = require('express');
  app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
}

const jwt = require('jsonwebtoken');

let db;
let testToken;

// Before all tests
beforeAll(async () => {
  try {
    // Get access to the shared MongoDB instance from the setup file
    db = global.__MONGO_DB__;

    if (!db) {
      console.warn('Integration tests: Database connection not available');
      return; // Skip database operations
    }

    // Generate a valid token for authenticated requests
    testToken = jwt.sign(
      {
        userId: '60d21b4667d0d8992e610c85',
        email: 'test@example.com',
        role: 'user'
      }, 
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: '1h' }
    );
  } catch (error) {
    console.error('Error setting up integration tests:', error);
  }
});

// Before each test
beforeEach(async () => {
  // Clear specific collections before each test to ensure clean state
  if (db) {
    await db.collection('reports').deleteMany({ 
      _id: { $ne: new ObjectId('60d21b4667d0d8992e610c86') } 
    });
  }
});

// After all tests
afterAll(async () => {
  // Close the Express server if it has a close method
  if (app && typeof app.close === 'function') {
    await new Promise(resolve => {
      app.close(resolve);
    });
  }
});

// Test cases
describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('should return 400 if email is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Invalid Email User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 if user already exists', async () => {
      // First make sure the user exists in the database
      if (db) {
        const existingUser = await db.collection('users').findOne({ email: 'test@example.com' });
        if (!existingUser) {
          await db.collection('users').insertOne({
            email: 'test@example.com',
            passwordHash: 'hashed-password',
            name: 'Test User',
            createdAt: new Date()
          });
        }
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com', // Use the email that now exists
          password: 'password123',
          name: 'Duplicate User'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      // Mock the bcrypt.compare to return false for wrong password
      const bcrypt = require('bcryptjs');
      const originalCompare = bcrypt.compare;
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');

      // Restore the original function
      bcrypt.compare = originalCompare;
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile for authenticated user', async () => {
      // Make sure the user exists in the database
      if (db) {
        const userId = '60d21b4667d0d8992e610c85';
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
          await db.collection('users').insertOne({
            _id: new ObjectId(userId),
            email: 'test@example.com',
            passwordHash: 'hashed-password',
            name: 'Test User',
            createdAt: new Date()
          });
        }
      }

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if token is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Reports API', () => {
  let reportId;

  describe('POST /api/reports', () => {
    it('should create a new report for authenticated user', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Company',
          description: 'A company for testing',
          industry: 'Technology',
          foundingYear: 2020
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('status', 'draft');

      // Save for later tests
      reportId = response.body.reportId;
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          name: 'Unauthorized Company'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if validation fails', async () => {
      // We need to ensure the validation middleware is executed
      // by triggering a validation error
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // name is missing intentionally
          description: 'Missing name'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Other test cases remain largely the same, just ensure proper async handling
  // and database state management between tests

  // ... rest of the tests ...
});