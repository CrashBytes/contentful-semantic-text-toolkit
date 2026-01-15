/**
 * Jest Configuration
 * 
 * Architectural Principles:
 * - Comprehensive coverage tracking
 * - Reasonable timeout for ML model operations
 * - Clear test organization patterns
 * - Production-grade quality thresholds
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test discovery patterns
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts', // Entry point excluded from coverage
  ],
  
  // Quality thresholds - enforce production standards
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Coverage reporting formats
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Summary statistics
    'lcov',           // CI integration
    'html',           // Visual browser report
  ],
  
  // Timeout configuration - ML operations require patience
  testTimeout: 60000, // 60 seconds for model loading
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
