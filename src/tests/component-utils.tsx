import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * Custom render function that wraps components with required providers
 * (ToastProvider, ErrorBoundary)
 */
export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ErrorBoundary>
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Mock Logseq context for component testing
 */
export const createMockLogseqContext = () => {
  return {
    Editor: {
      getCurrentPage: vi.fn(),
      getPage: vi.fn(),
      getBlock: vi.fn(),
      getPageBlocksTree: vi.fn(),
      insertBlock: vi.fn(),
      updateBlock: vi.fn(),
      removeBlock: vi.fn(),
    },
    App: {
      getCurrentGraph: vi.fn(),
      relaunch: vi.fn(),
    },
    DB: {
      datascriptQuery: vi.fn(),
    },
    UI: {
      showMsg: vi.fn(),
      closeMsg: vi.fn(),
      removeNotification: vi.fn(),
    },
    File: {
      read: vi.fn(),
      write: vi.fn(),
      delete: vi.fn(),
    },
  };
};

/**
 * Setup global logseq mock for component tests
 */
export const setupLogseqMock = () => {
  const mockContext = createMockLogseqContext();
  (global as any).logseq = mockContext;
  return mockContext;
};

/**
 * Common test fixtures for components
 */
export const componentFixtures = {
  simpleBlock: {
    uuid: 'block-123',
    content: 'Test block content',
    children: [],
    properties: {},
  },
  blockWithProperties: {
    uuid: 'block-456',
    content: 'Block with properties',
    children: [],
    properties: {
      'custom-prop': 'value',
    },
  },
  nestedBlocks: {
    uuid: 'parent-block',
    content: 'Parent block',
    children: [
      {
        uuid: 'child-1',
        content: 'Child 1',
        children: [],
        properties: {},
      },
      {
        uuid: 'child-2',
        content: 'Child 2',
        children: [
          {
            uuid: 'grandchild-1',
            content: 'Grandchild 1',
            children: [],
            properties: {},
          },
        ],
        properties: {},
      },
    ],
    properties: {},
  },
};

/**
 * Create mock page for component testing
 */
export const createMockPageForComponent = (overrides = {}) => ({
  uuid: 'page-uuid-test',
  name: 'Test Page',
  originalName: 'Test Page',
  properties: {},
  file: {
    path: '/test/path.md',
  },
  ...overrides,
});

/**
 * Export all utilities
 */
export * from '@testing-library/react';
export { vi } from 'vitest';
