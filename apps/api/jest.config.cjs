module.exports = {
  testEnvironment: 'node',
  cacheDirectory: '<rootDir>/../../.cache/jest',
  testMatch: ['**/test/**/*.spec.ts'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
};
