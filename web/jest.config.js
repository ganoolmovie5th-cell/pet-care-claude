/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  globals: {
    // ponytail: replace vite define constant for jest
    __ANALYTICS_API_BASE__: 'http://localhost:5000',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
  },
};
