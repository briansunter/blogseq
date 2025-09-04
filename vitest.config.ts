import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/tests/**',
        '*.config.ts',
        '*.config.js',
        'src/main.tsx',
        'src/index.css',
        'src/types/**'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    mockReset: true,
    restoreMocks: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@logseq/libs': resolve(__dirname, './src/tests/mocks/logseq.ts')
    }
  }
});