/**
 * Test setup helper for non-React tests
 * Provides utilities for setting up Logseq context in unit tests
 */

import { MockLogseqAPI } from '../mock-logseq-sdk';
import type { PageEntity, BlockEntity } from '@logseq/libs/dist/LSPlugin';

export interface AssetInfo {
  fileName: string;
  fullPath: string;
  title?: string;
  type?: string;
  size?: number;
}

export interface SetupLogseqTestOptions {
  /**
   * Pages to seed the mock database with
   */
  pages?: PageEntity[];

  /**
   * Blocks to seed the mock database with
   */
  blocks?: BlockEntity[];

  /**
   * Assets to seed the mock database with
   */
  assets?: AssetInfo[];

  /**
   * Graph path (default: '/mock/graph/path')
   */
  graphPath?: string;

  /**
   * Graph name (default: 'mock-graph')
   */
  graphName?: string;

  /**
   * Whether to install globally (default: true)
   */
  installGlobally?: boolean;
}

export interface SetupLogseqTestResult {
  /**
   * Mock Logseq API instance
   */
  mockAPI: MockLogseqAPI;

  /**
   * Cleanup function to reset state and optionally uninstall
   */
  cleanup: () => void;
}

/**
 * Set up Logseq test environment for non-React tests
 *
 * @example
 * ```typescript
 * describe('MarkdownExporter', () => {
 *   let mockAPI: MockLogseqAPI;
 *   let cleanup: () => void;
 *
 *   beforeEach(() => {
 *     const setup = setupLogseqTest({
 *       pages: [{ uuid: '123', name: 'Test Page' }],
 *       blocks: [{ uuid: '456', content: 'Test content' }],
 *     });
 *     mockAPI = setup.mockAPI;
 *     cleanup = setup.cleanup;
 *   });
 *
 *   afterEach(() => {
 *     cleanup();
 *   });
 *
 *   it('should export page', () => {
 *     // Test with mockAPI
 *   });
 * });
 * ```
 */
export function setupLogseqTest(options: SetupLogseqTestOptions = {}): SetupLogseqTestResult {
  const {
    pages = [],
    blocks = [],
    graphPath = '/mock/graph/path',
    graphName = 'mock-graph',
    installGlobally = true,
  } = options;

  const mockAPI = new MockLogseqAPI();

  // Set up graph
  mockAPI.setCurrentGraph({
    path: graphPath,
    name: graphName,
  });

  // Add pages
  pages.forEach(page => {
    mockAPI.addPage(page);
  });

  // Set first page as current
  if (pages.length > 0) {
    mockAPI.setCurrentPage(pages[0]);
  }

  // Add blocks
  blocks.forEach(block => {
    mockAPI.addBlock(block);
  });

  // Install globally if requested
  if (installGlobally) {
    (global as any).logseq = mockAPI;
    (window as any).logseq = mockAPI;
  }

  const cleanup = () => {
    mockAPI.reset();
    if (installGlobally) {
      delete (global as any).logseq;
      delete (window as any).logseq;
    }
    localStorage.clear();
    sessionStorage.clear();
  };

  return {
    mockAPI,
    cleanup,
  };
}

/**
 * Create a sample page entity for testing
 */
export function createSamplePage(overrides: Partial<PageEntity> = {}): PageEntity {
  const uuid = overrides.uuid || `page-${Date.now()}`;
  const name = overrides.name || 'Test Page';

  return {
    uuid,
    name,
    originalName: name,
    'journal?': false,
    properties: {},
    ...overrides,
  } as PageEntity;
}

/**
 * Create a sample block entity for testing
 */
export function createSampleBlock(overrides: Partial<BlockEntity> = {}): BlockEntity {
  const uuid = overrides.uuid || `block-${Date.now()}`;

  return {
    uuid,
    content: 'Test block content',
    properties: {},
    format: 'markdown',
    ...overrides,
  } as BlockEntity;
}

/**
 * Create a sample asset for testing
 */
export function createSampleAsset(overrides: Partial<AssetInfo> = {}): AssetInfo {
  return {
    fileName: 'test-image.png',
    fullPath: '/assets/test-image.png',
    title: 'Test Image',
    type: 'image/png',
    ...overrides,
  };
}

/**
 * Create a block tree structure for testing
 */
export function createBlockTree(depth: number, breadth = 2): BlockEntity[] {
  const blocks: BlockEntity[] = [];
  let blockId = 1;

  function createLevel(level: number, parentId?: number): void {
    if (level >= depth) return;

    for (let i = 0; i < breadth; i++) {
      const block: BlockEntity = {
        uuid: `block-${blockId}`,
        content: `Level ${level} Block ${i + 1}`,
        properties: {},
        format: 'markdown',
      } as BlockEntity;

      if (parentId !== undefined) {
        block.parent = { id: parentId };
      }

      blocks.push(block);
      const currentId = blockId;
      blockId++;

      // Create children
      createLevel(level + 1, currentId);
    }
  }

  createLevel(0);
  return blocks;
}

/**
 * Create a page with blocks for testing
 */
export function createPageWithBlocks(
  pageOverrides: Partial<PageEntity> = {},
  blockCount = 3
): { page: PageEntity; blocks: BlockEntity[] } {
  const page = createSamplePage(pageOverrides);
  const blocks: BlockEntity[] = [];

  for (let i = 0; i < blockCount; i++) {
    blocks.push(
      createSampleBlock({
        uuid: `block-${i + 1}`,
        content: `Block ${i + 1} content`,
      })
    );
  }

  return { page, blocks };
}
