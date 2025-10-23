import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Setup global mocks with proper typing
// We only mock the methods we actually use in tests
interface GlobalWithLogseq {
  logseq: unknown;
}

(global as unknown as GlobalWithLogseq).logseq = {
  Editor: {
    getCurrentPage: vi.fn(),
    getPage: vi.fn(),
    getBlock: vi.fn(),
    getPageBlocksTree: vi.fn()
  },
  App: {
    getCurrentGraph: vi.fn()
  },
  DB: {
    datascriptQuery: vi.fn()
  },
  UI: {
    showMsg: vi.fn()
  },
  on: vi.fn(),
  off: vi.fn()
};

// Mock fetch for asset tests
global.fetch = vi.fn();

// Mock navigator.clipboard - use configurable: true to allow tests to override
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(),
      write: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}