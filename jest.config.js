// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  // ✅ Add module resolution
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['js', 'json', 'node'],
  roots: ['<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // ✅ Ensure Jest uses the correct resolver
  resolver: undefined,
  // ✅ Transform CommonJS modules properly
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(better-sqlite3)/)',
  ],
};