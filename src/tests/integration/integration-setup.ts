import { vi, type Mock } from 'vitest';
import type { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin';

/**
 * Integration test setup for full workflow testing
 * Simulates a complete Logseq environment with multiple pages and blocks
 */

export type IntegrationTestContext = {
  pages: Map<string, PageEntity>;
  blocks: Map<string, BlockEntity>;
  logseqAPI: ReturnType<typeof createIntegrationLogseqAPI>;
};

/**
 * Create a realistic Logseq environment for integration tests
 */
export const createIntegrationTestContext = (): IntegrationTestContext => {
  const pages = new Map<string, PageEntity>();
  const blocks = new Map<string, BlockEntity>();
  const logseqAPI = createIntegrationLogseqAPI(pages, blocks);

  return {
    pages,
    blocks,
    logseqAPI,
  };
};

/**
 * Create a fully-featured mock Logseq API for integration testing
 */
export const createIntegrationLogseqAPI = (
  pages: Map<string, PageEntity>,
  blocks: Map<string, BlockEntity>
) => {
  return {
    Editor: {
      getCurrentPage: vi.fn(async () => {
        const firstPage = Array.from(pages.values())[0];
        return firstPage || null;
      }),
      getPage: vi.fn(async (name: string) => {
        return pages.get(name) || null;
      }),
      getBlock: vi.fn(async (uuid: string) => {
        return blocks.get(uuid) || null;
      }),
      getPageBlocksTree: vi.fn(async (pageUuid: string) => {
        const pageBlocks: BlockEntity[] = [];
        blocks.forEach(block => {
          if (String(block.page?.id) === pageUuid || block.page?.uuid === pageUuid) {
            pageBlocks.push(block);
          }
        });
        return pageBlocks;
      }),
      insertBlock: vi.fn(async (pageUuid: string, content: string) => {
        const newBlock: BlockEntity = {
          id: Date.now(),
          uuid: `block-${Date.now()}`,
          content,
          children: [],
          properties: {},
          format: 'markdown',
          parent: { id: 1 },
          left: { id: 1 },
          page: { id: 1 },
        };
        blocks.set(newBlock.uuid, newBlock);
        return newBlock;
      }),
      updateBlock: vi.fn(async (uuid: string, content: string) => {
        const block = blocks.get(uuid);
        if (block) {
          block.content = content;
        }
        return block;
      }),
    },
    App: {
      getCurrentGraph: vi.fn(async () => ({
        name: 'test-graph',
        path: '/tmp/test-graph',
      })),
    },
    DB: {
      datascriptQuery: vi.fn(async (query: string) => {
        // Return empty results by default - override in tests as needed
        return [];
      }),
    },
    UI: {
      showMsg: vi.fn(),
      closeMsg: vi.fn(),
    },
  };
};

/**
 * Add a page to the integration test context
 */
export const addPageToContext = (
  context: IntegrationTestContext,
  name: string,
  overrides: Partial<PageEntity> = {}
): PageEntity => {
  const page: PageEntity = {
    uuid: `page-${Date.now()}-${Math.random()}`,
    name,
    originalName: name,
    properties: {},
    file: {
      path: `/test/${name}.md`,
    },
    ...overrides,
  } as PageEntity;

  // Store by UUID as the canonical reference; name is stored in the page object
  context.pages.set(page.uuid, page);
  return page;
};

/**
 * Add blocks to a page in the integration test context
 */
export const addBlocksToPage = (
  context: IntegrationTestContext,
  pageUuid: string,
  blockContents: string[]
): BlockEntity[] => {
  const newBlocks: BlockEntity[] = [];

  blockContents.forEach(content => {
    const block: BlockEntity = {
      id: Date.now() + Math.random(),
      uuid: `block-${Date.now()}-${Math.random()}`,
      content,
      children: [],
      properties: {},
      format: 'markdown',
      parent: { id: 1 },
      left: { id: 1 },
      page: { id: 1, uuid: pageUuid },
    };

    context.blocks.set(block.uuid, block);
    newBlocks.push(block);
  });

  return newBlocks;
};

/**
 * Add nested blocks to simulate hierarchy
 */
export const addNestedBlocksToPage = (
  context: IntegrationTestContext,
  pageUuid: string,
  structure: {
    content: string;
    children?: string[];
  }[]
): BlockEntity[] => {
  const createdBlocks: BlockEntity[] = [];

  structure.forEach(item => {
    const parentBlock: BlockEntity = {
      id: Date.now() + Math.random(),
      uuid: `block-${Date.now()}-${Math.random()}`,
      content: item.content,
      children: [],
      properties: {},
      format: 'markdown',
      parent: { id: 1 },
      left: { id: 1 },
      page: { id: 1, uuid: pageUuid },
    };

    context.blocks.set(parentBlock.uuid, parentBlock);
    createdBlocks.push(parentBlock);

    // Add children if specified
    if (item.children && Array.isArray(item.children)) {
      item.children.forEach(childContent => {
        const childBlock: BlockEntity = {
          id: Date.now() + Math.random(),
          uuid: `block-${Date.now()}-${Math.random()}`,
          content: childContent,
          children: [],
          properties: {},
          format: 'markdown',
          parent: { id: 1 },
          left: { id: 1 },
          page: { id: 1, uuid: pageUuid },
        };

        context.blocks.set(childBlock.uuid, childBlock);
        parentBlock.children?.push(childBlock);
        createdBlocks.push(childBlock);
      });
    }
  });

  return createdBlocks;
};

/**
 * Common integration test fixtures
 */
export const integrationFixtures = {
  simplePage: {
    name: 'Simple Page',
    blocks: ['Block 1', 'Block 2', 'Block 3'],
  },
  pageWithHeadings: {
    name: 'Page with Headings',
    blocks: [
      '# Main Section',
      'Content under main section',
      '## Subsection',
      'Content under subsection',
    ],
  },
  pageWithReferences: {
    name: 'Page with References',
    blocks: [
      'This block has a [[page reference]]',
      'This block has a ((block-uuid-reference))',
      'Normal block content',
    ],
  },
  pageWithAssets: {
    name: 'Page with Assets',
    blocks: [
      'First block with ![image](image.png)',
      'Second block with [file attachment](file.pdf)',
      'Third block with regular content',
    ],
  },
  multiPageGraph: [
    {
      name: 'Index Page',
      blocks: ['[[Page A]]', '[[Page B]]', '[[Page C]]'],
    },
    {
      name: 'Page A',
      blocks: ['Content A1', 'Content A2'],
    },
    {
      name: 'Page B',
      blocks: ['Content B1', 'Content B2'],
    },
    {
      name: 'Page C',
      blocks: ['Content C1', 'Content C2'],
    },
  ],
};

/**
 * Setup integration test context with common fixtures
 */
export const setupIntegrationTest = (
  fixture: keyof typeof integrationFixtures
): IntegrationTestContext => {
  const context = createIntegrationTestContext();
  const fixtureData = integrationFixtures[fixture as keyof typeof integrationFixtures];

  if (Array.isArray(fixtureData)) {
    // Multi-page fixture
    fixtureData.forEach(pageData => {
      const page = addPageToContext(context, pageData.name);
      addBlocksToPage(context, page.uuid, pageData.blocks);
    });
  } else {
    // Single-page fixture
    const page = addPageToContext(context, fixtureData.name);
    addBlocksToPage(context, page.uuid, fixtureData.blocks);
  }

  return context;
};

/**
 * Mock file system for integration tests
 */
export const createMockFileSystem = () => {
  const files = new Map<string, string>();

  return {
    readFile: vi.fn(async (path: string) => {
      return files.get(path) || '';
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    }),
    deleteFile: vi.fn(async (path: string) => {
      files.delete(path);
    }),
    fileExists: vi.fn((path: string) => {
      return files.has(path);
    }),
    getFile: (path: string) => {
      return files.get(path);
    },
    getAllFiles: () => {
      return Array.from(files.entries());
    },
    clear: () => {
      files.clear();
    },
  };
};
