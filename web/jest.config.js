/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' }, diagnostics: false }],
  },
  testMatch: ['**/__tests__/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // ponytail: import.meta.env is Vite-only; stub firebase-config so jest never parses it
    '\\.\\./services/firebase-config': '<rootDir>/src/__tests__/firebase-config-stub.js',
    '\\./firebase-config': '<rootDir>/src/__tests__/firebase-config-stub.js',
  },
};
