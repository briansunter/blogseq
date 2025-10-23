/**
 * React Testing Library wrapper with Logseq context
 * Provides a custom render function that sets up all necessary providers
 */

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ToastProvider } from '../../components/Toast';
import { MockLogseqAPI } from '../mock-logseq-sdk';
import type { PageEntity, BlockEntity } from '@logseq/libs/dist/LSPlugin';
import type { ExportSettings } from '../../types';

const DEFAULT_SETTINGS: ExportSettings = {
  includePageName: false,
  flattenNested: true,
  preserveBlockRefs: true,
  includeProperties: true,
  assetPath: 'assets/',
  debug: false,
};

export interface RenderWithLogseqOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Mock Logseq API configuration
   */
  mockLogseq?: {
    pages?: PageEntity[];
    blocks?: BlockEntity[];
    graphPath?: string;
    graphName?: string;
  };

  /**
   * Initial export settings
   */
  initialSettings?: Partial<ExportSettings>;

  /**
   * Whether to wrap with ToastProvider (default: true)
   */
  withToastProvider?: boolean;

  /**
   * Custom wrapper component
   */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;

  /**
   * Use existing mock API instance instead of creating new one
   */
  existingMockAPI?: MockLogseqAPI;
}

export interface RenderWithLogseqResult extends RenderResult {
  /**
   * Mock Logseq API instance for assertions
   */
  mockAPI: MockLogseqAPI;

  /**
   * Cleanup function to remove mock API
   */
  cleanupMockAPI: () => void;
}

/**
 * Custom render function that wraps components with Logseq context
 *
 * @example
 * ```tsx
 * const { mockAPI } = renderWithLogseq(<MyComponent />, {
 *   mockLogseq: {
 *     pages: [{ uuid: '123', name: 'Test Page' }],
 *     blocks: [{ uuid: '456', content: 'Test content' }],
 *   },
 *   withToastProvider: true,
 * });
 *
 * // Make assertions
 * expect(mockAPI.calls.getPage).toHaveLength(1);
 * ```
 */
export function renderWithLogseq(
  ui: React.ReactElement,
  options: RenderWithLogseqOptions = {}
): RenderWithLogseqResult {
  const {
    mockLogseq = {},
    initialSettings,
    withToastProvider = true,
    wrapper,
    existingMockAPI,
    ...renderOptions
  } = options;

  // Create or use existing mock Logseq API
  let mockAPI: MockLogseqAPI;
  if (existingMockAPI) {
    mockAPI = existingMockAPI;
  } else {
    mockAPI = new MockLogseqAPI();

    // Set up mock data
    if (mockLogseq.graphPath) {
      mockAPI.setCurrentGraph({
        path: mockLogseq.graphPath,
        name: mockLogseq.graphName || 'Test Graph',
      });
    }

    if (mockLogseq.pages) {
      mockLogseq.pages.forEach(page => {
        mockAPI.addPage(page);
      });
      if (mockLogseq.pages.length > 0) {
        mockAPI.setCurrentPage(mockLogseq.pages[0]);
      }
    }

    if (mockLogseq.blocks) {
      mockLogseq.blocks.forEach(block => {
        mockAPI.addBlock(block);
      });
    }
  }

  // Install globally
  (global as any).logseq = mockAPI;
  (window as any).logseq = mockAPI;

  // Set up initial settings if provided
  if (initialSettings) {
    const settings = { ...DEFAULT_SETTINGS, ...initialSettings };
    const settingsKey = 'blogseq-export-settings';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  // Create wrapper with providers
  const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const content = withToastProvider ? (
      <ToastProvider>{children}</ToastProvider>
    ) : (
      <>{children}</>
    );

    return wrapper ? React.createElement(wrapper, null, content) : content;
  };

  // Render component
  const renderResult = render(ui, {
    wrapper: AllProviders,
    ...renderOptions,
  });

  // Cleanup function
  const cleanupMockAPI = () => {
    delete (global as any).logseq;
    delete (window as any).logseq;
    localStorage.clear();
  };

  return {
    ...renderResult,
    mockAPI,
    cleanupMockAPI,
  };
}

/**
 * Cleanup helper for afterEach hooks
 *
 * @example
 * ```tsx
 * let mockAPI: MockLogseqAPI;
 *
 * afterEach(() => {
 *   cleanupLogseqMocks(mockAPI);
 * });
 * ```
 */
export function cleanupLogseqMocks(mockAPI?: MockLogseqAPI): void {
  if (mockAPI) {
    mockAPI.reset();
  }
  delete (global as any).logseq;
  delete (window as any).logseq;
  localStorage.clear();
}

/**
 * Re-export testing utilities for convenience
 */
export { screen, waitFor, within, fireEvent } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
