module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Most suites now run against the in-memory fake in jest.setup.js. These three
  // still assume a real Firestore (cross-collection writes read back through
  // paths the fake does not model yet); run them under `firebase emulators:exec`.
  testPathIgnorePatterns: [
    '/node_modules/',
    // Shared fakes, not suites — testMatch globs the whole __tests__ tree.
    '<rootDir>/src/__tests__/helpers/',
    '<rootDir>/src/__tests__/integration/booking-review-notification.test.ts',
    '<rootDir>/src/__tests__/integration/playdate-matching.test.ts',
    '<rootDir>/tests/e2e-analytics.test.ts',
  ],
};
