// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'services/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['./tests/setup.js'],
  verbose: true,
  testTimeout: 30000, // Increase timeout for MongoDB Memory Server startup
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Don't reset mocks between tests
  testPathIgnorePatterns: ['/node_modules/'],
  forceExit: true, // Force exit after all tests complete
  detectOpenHandles: true, // Detect open handles
  // Temporarily disable coverage thresholds for initial setup
  /*
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
  */
};