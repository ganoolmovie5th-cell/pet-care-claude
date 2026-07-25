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
  // These suites write documents and then read them back, so they need a real
  // Firestore. jest.setup.js stubs db.collection out, which makes every one of
  // them fail. They are excluded so `npm test` reports real status; run them
  // against `firebase emulators:exec` once emulator config lands.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/__tests__/services/review.test.ts',
    '<rootDir>/src/__tests__/services/notifications.test.ts',
    '<rootDir>/src/__tests__/services/recommendations.test.ts',
    '<rootDir>/src/__tests__/services/playdate.test.ts',
    '<rootDir>/src/__tests__/routes/playdate.test.ts',
    '<rootDir>/src/__tests__/integration/booking-review-notification.test.ts',
    '<rootDir>/src/__tests__/integration/playdate-matching.test.ts',
    '<rootDir>/tests/e2e-analytics.test.ts',
  ],
};
