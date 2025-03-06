// tests/simplified.test.js
// This is a simplified test file to verify that our test setup works

describe('Simplified Test Suite', () => {
  // Basic test that doesn't require MongoDB
  it('should pass a simple arithmetic test', () => {
    expect(1 + 1).toBe(2);
  });

  // Test that verifies environment variables are loaded
  it('should have properly loaded environment variables', () => {
    // Verify NODE_ENV is set (could be 'test' or 'development' depending on setup)
    expect(['test', 'development']).toContain(process.env.NODE_ENV);

    // Verify JWT_SECRET is set in .env.test
    expect(process.env.JWT_SECRET).toBeTruthy();
  });

  // Simple test using mocks
  it('should use our mocked jsonwebtoken', () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 'test' });

    // Our mock always returns 'mock-jwt-token'
    expect(token).toBe('mock-jwt-token');
  });

  // Simple test for bcrypt mock
  it('should use our mocked bcryptjs', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password', 'salt');

    // Our mock always returns 'hashed-password'
    expect(hash).toBe('hashed-password');
  });

  // Verify MongoDB connections
  it('should provide MongoDB test helpers', () => {
    expect(global.getTestDb).toBeDefined();
    expect(global.clearCollection).toBeDefined();
    expect(global.__MONGO_URI__).toBeDefined();
  });
});