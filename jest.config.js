module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/features/**/domain.ts',
    'src/utils/**/*.ts',
    'src/services/validation.ts',
  ],
};
