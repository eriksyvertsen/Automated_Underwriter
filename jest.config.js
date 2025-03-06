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
  testTimeout: 30000, // Increased timeout for MongoDB Memory Server
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Don't reset mocks between tests
  testPathIgnorePatterns: ['/node_modules/'],
  forceExit: true, // Force exit after all tests complete
    detectOpenHandles: true, // Detect open handles
    bail: false, // Don't stop on first test failure
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
    transform: {
      '^.+\\.jsx?$': 'babel-jest',
    },
    // Add this to improve MongoDB error handling
    testSequencer: './tests/testSequencer.js',
    // These flags help with async logging issues
    globals: {
      __SKIP_WAITING_FOR_LOGS__: true
    }
  };