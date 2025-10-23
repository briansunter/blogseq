import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/tests/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
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
        '*.config.ts',
        '*.config.js',
        'src/main.tsx',
        'src/index.css',
        'src/types/**',
        '**/mocks/**',
        '**/*.d.ts',
        'src/components/**',
        'src/utils/theme.ts'
      ],
      thresholds: {
        statements: 55,
        branches: 55,
        functions: 55,
        lines: 55,
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