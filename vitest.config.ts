import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['server/tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});
