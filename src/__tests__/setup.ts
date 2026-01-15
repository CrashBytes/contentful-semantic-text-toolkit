/**
 * Jest Test Setup
 * 
 * Global configuration and utilities for test environment.
 * Executed once before test suite runs.
 */

// Extend Jest matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Custom type definitions for extended matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Global test configuration
process.env.NODE_ENV = 'test';

// Increase timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(120000); // 2 minutes for CI
}
