import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
  base: '/portal/',
  plugins: [react()],
  resolve: {
    alias: {
      '@aiops/shared': path.resolve(__dirname, '../shared/src'),
      '@aiops/shared/ui': path.resolve(__dirname, '../shared/src/ui.ts'),
      '@aiops/shared/hooks': path.resolve(__dirname, '../shared/src/hooks.ts'),
      '@aiops/shared/store': path.resolve(__dirname, '../shared/src/store.ts'),
      '@aiops/shared/specs': path.resolve(__dirname, '../shared/src/specs.ts'),
      '@aiops/shared/workflow': path.resolve(__dirname, '../shared/src/workflow.ts'),
      '@docs': path.resolve(__dirname, '../../docs'),
    },
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/exceljs')) return 'exceljs';
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) return 'router';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark-gfm') ||
            id.includes('node_modules/unified') ||
            id.includes('node_modules/remark-') ||
            id.includes('node_modules/mdast-') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/hast-') ||
            id.includes('node_modules/unist-')
          ) {
            return 'markdown';
          }
          if (id.includes('/packages/shared/src/components/workflow-shell') || id.includes('/packages/shared/src/lib/workflow-timeline')) {
            return 'workflow';
          }
          if (
            id.includes('/packages/shared/src/store/service-specs') ||
            id.includes('/packages/shared/src/store/orders') ||
            id.includes('/packages/shared/src/store/schema-templates') ||
            id.includes('/packages/shared/src/data/specs') ||
            id.includes('/packages/shared/src/data/spec-combos') ||
            id.includes('/packages/shared/src/data/assemblies')
          ) {
            return 'specs-store';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    open: '/portal/',
    proxy: {
      '/api/dev/orders-sync': {
        target: 'http://127.0.0.1:3011',
        changeOrigin: true,
      },
      '/api/dev/config-sync': {
        target: 'http://127.0.0.1:3011',
        changeOrigin: true,
      },
      '/center': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
    },
  },
}));
