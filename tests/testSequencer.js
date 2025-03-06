// tests/testSequencer.js
const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Return a new array of tests sorted in proper order
    return tests.sort((testA, testB) => {
      // Run basic tests first
      if (testA.path.includes('basic.test.js')) return -1;
      if (testB.path.includes('basic.test.js')) return 1;

      // Run validation and error handler tests second
      if (testA.path.includes('utils/')) return -1;
      if (testB.path.includes('utils/')) return 1;

      // Run middleware tests third
      if (testA.path.includes('middleware/')) return -1;
      if (testB.path.includes('middleware/')) return 1;

      // Run service tests fourth
      if (testA.path.includes('services/')) return -1;
      if (testB.path.includes('services/')) return 1;

      // Run controller tests fifth
      if (testA.path.includes('controllers/')) return -1;
      if (testB.path.includes('controllers/')) return 1;

      // Run integration tests last
      if (testA.path.includes('integration/')) return 1;
      if (testB.path.includes('integration/')) return -1;

      return 0;
    });
  }
}

module.exports = CustomSequencer;