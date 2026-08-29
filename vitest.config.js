// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.cjs'],
    testTimeout: 10000,
    globals: true,
  },
});