import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react({ fastRefresh: false })],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/tests/setup.ts',
    include: [
      'src/tests/unit/**/*.test.{ts,tsx}',
      'src/tests/component/**/*.test.{ts,tsx}',
      'src/tests/integration/**/*.test.{ts,tsx}',
      'src/tests/e2e/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov', 'json-summary'],
      reportOnFailure: true,
      all: true,
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/tests/**',
        'src/testing/**',
        '*.config.ts',
        '*.config.js',
        'src/main.tsx',
        'src/index.css',
        'src/types/**',
        '**/mocks/**',
        '**/*.d.ts',
        'src/utils/theme.ts'
      ],
      thresholds: {
        statements: 40,
        branches: 85,
        functions: 75,
        lines: 40,
        perFile: false,
        autoUpdate: false
      },
      include: [
        'src/**/*.ts',
        'src/**/*.tsx'
      ]
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    isolate: true,
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@logseq/libs': resolve(__dirname, './src/tests/mocks/logseq.ts')
    }
  }
});