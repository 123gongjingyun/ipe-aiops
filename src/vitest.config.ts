import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@aiops/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@docs': path.resolve(__dirname, '../docs'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx'],
  },
});
