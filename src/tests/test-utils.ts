import { vi, type Mock } from 'vitest';
import type { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin';

export type MockLogseqAPI = {
  getCurrentPage: Mock;
  getPage: Mock;
  getBlock: Mock;
  getPageBlocksTree: Mock;
  getCurrentGraph: Mock;
  datascriptQuery: Mock;
  showMsg: Mock;
  Editor: { getCurrentPage: Mock; getPage: Mock; getBlock: Mock; getPageBlocksTree: Mock };
  App: { getCurrentGraph: Mock };
  DB: { datascriptQuery: Mock };
  UI: { showMsg: Mock };
}

export type MockFileAPI = {
  fetch: Mock;
  saveAs: Mock;
  createObjectURL: Mock;
  revokeObjectURL: Mock;
  writeToClipboard: Mock;
}

export type MockDOMHelpers = {
  createElement: Mock;
  appendChild: Mock;
  removeChild: Mock;
}

export const createMockLogseqAPI = (): MockLogseqAPI => {
  const api = {
    getCurrentPage: vi.fn(),
    getPage: vi.fn(),
    getBlock: vi.fn(),
    getPageBlocksTree: vi.fn(),
    getCurrentGraph: vi.fn(),
    datascriptQuery: vi.fn(),
    showMsg: vi.fn(),
    Editor: {} as MockLogseqAPI['Editor'],
    App: {} as MockLogseqAPI['App'],
    DB: {} as MockLogseqAPI['DB'],
    UI: {} as MockLogseqAPI['UI']
  };
  
  // Set up the namespaced references
  api.Editor = { 
    getCurrentPage: api.getCurrentPage, 
    getPage: api.getPage, 
    getBlock: api.getBlock, 
    getPageBlocksTree: api.getPageBlocksTree 
  };
  api.App = { getCurrentGraph: api.getCurrentGraph };
  api.DB = { datascriptQuery: api.datascriptQuery };
  api.UI = { showMsg: api.showMsg };
  
  return api;
};

export const createMockPage = (overrides: Partial<PageEntity> = {}): PageEntity => ({
  uuid: 'page-uuid-123', 
  name: 'Test Page', 
  originalName: 'Test Page',
  properties: {}, 
  file: { path: '/test/path.md' }, 
  ...overrides
} as PageEntity);

export const createMockBlock = (overrides: Partial<BlockEntity> = {}): BlockEntity => ({
  uuid: 'block-uuid-123', 
  content: 'Test content', 
  children: [], 
  properties: {},
  parent: { id: 1 }, 
  left: { id: 1 }, 
  format: 'markdown', 
  page: { id: 1 }, 
  ...overrides
} as BlockEntity);

export const createAssetQueryResponse = (uuid: string, type: string, title: string): unknown[][] => [[uuid, type, title]];

export const FIXTURES = {
  simpleBlock: createMockBlock({ 
    uuid: 'simple-block', 
    content: 'Simple content' 
  }),
  blockWithHeading: (level: number) => ({
    ...createMockBlock({
      uuid: `heading-${level}`, 
      content: `Heading level ${level}`
    }),
    'logseq.property/heading': level
  }),
  nestedBlocks: createMockBlock({
    uuid: 'parent-block', 
    content: 'Parent content',
    children: [
      createMockBlock({ uuid: 'child-1', content: 'Child 1' }),
      createMockBlock({ 
        uuid: 'child-2', 
        content: 'Child 2', 
        children: [createMockBlock({ uuid: 'grandchild-1', content: 'Grandchild 1' })]
      })
    ]
  }),
  blockWithAsset: createMockBlock({ 
    uuid: 'asset-block', 
    content: '![Image](../assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png)' 
  }),
  blockWithReference: createMockBlock({ 
    uuid: 'ref-block', 
    content: 'Content with ((referenced-uuid)) reference' 
  }),
  blockWithPageRef: createMockBlock({ 
    uuid: 'page-ref-block', 
    content: 'Link to [[Another Page]]' 
  }),
  blockWithProperties: createMockBlock({
    uuid: 'prop-block', 
    content: 'Block with properties',
    properties: { title: 'Test Title', tags: ['tag1', 'tag2'], date: '2024-01-01' }
  })
};

export const setupGlobalMocks = (mockAPI: MockLogseqAPI): void => {
  (global as unknown as { logseq: unknown }).logseq = mockAPI;
  global.fetch = vi.fn();
  global.URL.createObjectURL = vi.fn(() => 'blob:test');
  global.URL.revokeObjectURL = vi.fn();
  
  const mockElement = { 
    href: '', 
    download: '', 
    style: { display: '' }, 
    click: vi.fn(), 
    remove: vi.fn() 
  };
  global.document.createElement = vi.fn(() => mockElement) as unknown as typeof document.createElement;
  global.document.body.appendChild = vi.fn();
  global.document.body.removeChild = vi.fn();
};

export const resetAllMocks = (mockAPI: MockLogseqAPI): void => {
  vi.clearAllMocks();
  Object.values(mockAPI.Editor).forEach(m => m.mockReset());
  Object.values(mockAPI.App).forEach(m => m.mockReset());
  Object.values(mockAPI.DB).forEach(m => m.mockReset());
  Object.values(mockAPI.UI).forEach(m => m.mockReset());
  (global.fetch as Mock).mockReset();
};

export const expectMarkdownHeading = (content: string, level: number, text: string): void => 
  expect(content).toMatch(new RegExp(`^${'#'.repeat(level)} ${text}`, 'm'));

export const expectAssetPath = (content: string, assetPath: string, filename: string): void => 
  expect(content).toContain(`${assetPath}${filename}`);

export const mockCurrentPageResponse = (mockAPI: MockLogseqAPI, page: PageEntity | null): void => {
  mockAPI.Editor.getCurrentPage.mockResolvedValue(page);
};

export const mockPageBlocksResponse = (mockAPI: MockLogseqAPI, blocks: BlockEntity[]): void => {
  mockAPI.Editor.getPageBlocksTree.mockResolvedValue(blocks);
};

export const mockGraphResponse = (mockAPI: MockLogseqAPI, path: string | null): void => {
  mockAPI.App.getCurrentGraph.mockResolvedValue(path ? { path } : null);
};

export const mockAssetQuery = (mockAPI: MockLogseqAPI, uuid: string, type: string | null = null): void => {
  mockAPI.DB.datascriptQuery.mockImplementation((query: string) => 
    query.includes(uuid) && query.includes(':logseq.property.asset/type') 
      ? Promise.resolve(type ? [[uuid, type, 'Asset']] : [])
      : Promise.resolve([])
  );
};

export const mockBlockReference = (mockAPI: MockLogseqAPI, uuid: string, block: BlockEntity | null): void => {
  mockAPI.Editor.getBlock.mockImplementation((id: string) => 
    id === uuid ? Promise.resolve(block) : Promise.resolve(null)
  );
};

export const mockFetchResponse = (status: number, arrayBuffer?: ArrayBuffer): void => {
  const ab = arrayBuffer ?? new ArrayBuffer(0);
  (global.fetch as Mock).mockResolvedValue({
    ok: status === 200, 
    status,
    arrayBuffer: vi.fn().mockResolvedValue(ab),
    blob: vi.fn().mockResolvedValue(new Blob([ab]))
  });
};