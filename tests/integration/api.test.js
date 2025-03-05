// tests/integration/api.test.js
const request = require('supertest');
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

// Use the shared MongoDB setup from jest setup file
let db;
let testToken;

// Setup and teardown for integration tests
beforeAll(async () => {
  try {
    // Get access to the shared MongoDB instance from the setup file
    db = await global.getTestDb();

    if (!db) {
      console.warn('Integration tests: Database connection not available');
      return; // Skip database operations
    }

    // Seed test user
    const usersCollection = db.collection('users');
    const testUser = {
      _id: '60d21b4667d0d8992e610c85',
      email: 'test@example.com',
      passwordHash: '$2a$10$jAJY9cMUTPe.Gz6FVRq02uOfG1vyqbB5.82xNXzKgdKLYMX21riOi', // hashed 'password123'
      name: 'Test User',
      createdAt: new Date()
    };

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: testUser.email });
    if (!existingUser) {
      await usersCollection.insertOne(testUser);
    }

    // Create token for authenticated requests
    testToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        role: 'user'
      },
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: '1h' }
    );
  } catch (error) {
    console.error('Error setting up integration tests:', error);
  }
});

afterAll(async () => {
  // No need to close connections here as it's handled in the global setup

  // Close the Express server if it has a close method
  if (app && typeof app.close === 'function') {
    await new Promise(resolve => {
      app.close(resolve);
    });
  }
});

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
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com', // Already exists from seed
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
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile for authenticated user', async () => {
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
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // name is missing
          description: 'Missing name'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/reports', () => {
    it('should get all reports for authenticated user', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reports');
      expect(Array.isArray(response.body.reports)).toBe(true);
      expect(response.body.reports.length).toBeGreaterThan(0);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/reports');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should get a specific report by ID', async () => {
      const response = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('report');
      expect(response.body.report).toHaveProperty('_id', reportId);
    });

    it('should return 404 if report not found', async () => {
      const response = await request(app)
        .get('/api/reports/60d21b4667d0d8992e610c99') // Non-existent ID
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/reports/:id', () => {
    it('should update a report', async () => {
      const response = await request(app)
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          companyName: 'Updated Company Name',
          status: 'in_progress'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('report');
      expect(response.body.report).toHaveProperty('companyName', 'Updated Company Name');
      expect(response.body.report).toHaveProperty('status', 'in_progress');
    });

    it('should return 404 if report not found', async () => {
      const response = await request(app)
        .put('/api/reports/60d21b4667d0d8992e610c99') // Non-existent ID
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'in_progress'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/reports/:id/section', () => {
    it('should generate a report section', async () => {
      const response = await request(app)
        .post(`/api/reports/${reportId}/section`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          sectionType: 'executiveSummary',
          companyData: {
            name: 'Test Company',
            description: 'A company for testing'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('section');
      expect(response.body.section).toHaveProperty('type', 'executiveSummary');
      expect(response.body.section).toHaveProperty('content');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post(`/api/reports/${reportId}/section`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // sectionType is missing
          companyData: {
            name: 'Test Company'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/reports/:id/generate', () => {
    it('should queue full report generation', async () => {
      const response = await request(app)
        .post(`/api/reports/${reportId}/generate`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          companyData: {
            name: 'Test Company',
            description: 'A company for testing'
          },
          templateType: 'mvp'
        });

      expect(response.status).toBe(202); // Accepted
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('reportId', reportId);
      expect(response.body).toHaveProperty('status', 'generating');
    });

    it('should return 400 if company data is missing', async () => {
      const response = await request(app)
        .post(`/api/reports/${reportId}/generate`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // companyData is missing
          templateType: 'mvp'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/reports/:id/status', () => {
    it('should get report generation status', async () => {
      const response = await request(app)
        .get(`/api/reports/${reportId}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reportId', reportId);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('progress');
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('should delete a report', async () => {
      const response = await request(app)
        .delete(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Report deleted successfully');
    });

    it('should return 404 if report not found', async () => {
      const response = await request(app)
        .delete(`/api/reports/${reportId}`) // Already deleted
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});