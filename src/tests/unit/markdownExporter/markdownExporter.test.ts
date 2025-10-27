import { describe, it, expect, vi, beforeEach, afterEach, type MockedClass } from 'vitest';
import { MarkdownExporter, MarkdownHelpers } from '../../../markdownExporter';
import type { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin';
import JSZip from 'jszip';
import {
  createMockLogseqAPI,
  createMockPage,
  createMockBlock,
  setupGlobalMocks,
  resetAllMocks,
  expectMarkdownHeading,
  mockCurrentPageResponse,
  mockPageBlocksResponse,
  mockGraphResponse,
  mockAssetQuery,
  FIXTURES,
  MockLogseqAPI,
  MockFileAPI,
  MockDOMHelpers
} from '../../test-utils';

// Shared mocks
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}));

vi.mock('jszip', () => {
  const mockFile = vi.fn().mockReturnThis();
  const mockFolder = vi.fn(() => ({ file: mockFile }));
  return {
    default: vi.fn(() => ({
      file: mockFile,
      folder: mockFolder,
      generateAsync: vi.fn().mockResolvedValue(new Blob(['test']))
    }))
  };
});

describe('MarkdownExporter', () => {
  let exporter: MarkdownExporter;
  let mockAPI: MockLogseqAPI;
  let mockFileAPI: MockFileAPI;
  let mockDOMHelpers: MockDOMHelpers;
  
  beforeEach(() => {
    mockAPI = createMockLogseqAPI();
    
    mockFileAPI = {
      fetch: vi.fn(),
      saveAs: vi.fn(),
      createObjectURL: vi.fn(() => 'blob://test-url'),
      revokeObjectURL: vi.fn(),
      writeToClipboard: vi.fn()
    };
    
    mockDOMHelpers = {
      createElement: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn()
    };
    
    exporter = new MarkdownExporter(mockAPI, mockFileAPI, mockDOMHelpers);
    setupGlobalMocks(mockAPI);
  });
  
  afterEach(() => {
    resetAllMocks(mockAPI);
    vi.clearAllMocks();
  });

  describe('Core Export Functionality', () => {
    it('should export page with content and default options', async () => {
      const page = createMockPage({ name: 'Test Page' });
      const blocks = [FIXTURES.simpleBlock];
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, blocks);
      
      const result = await exporter.exportCurrentPage();
      
      expect(result).toContain('Simple content');
      expect(result).toContain('# Test Page');
    });

    it('should throw error when no active page', async () => {
      mockCurrentPageResponse(mockAPI, null);
      await expect(exporter.exportCurrentPage()).rejects.toThrow('NO_ACTIVE_PAGE');
    });

    it('should handle empty page blocks', async () => {
      const page = createMockPage({ name: 'Test Page' });
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage();
      // Empty page just returns the page name as heading (no "No content" message)
      expect(result).toBe('# Test Page');
    });

    it('should handle blocks without UUID', async () => {
      const page = createMockPage();
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [
        { content: 'No UUID block' } as BlockEntity,
        createMockBlock({ content: 'Has UUID' })
      ]);
      
      const result = await exporter.exportCurrentPage();
      expect(result).toContain('No UUID block');
      expect(result).toContain('Has UUID');
    });
  });

  describe('Block Processing & Headings', () => {
    it('should convert heading properties to markdown headers', async () => {
      const page = createMockPage();
      const blocks = [
        FIXTURES.blockWithHeading(1),
        FIXTURES.blockWithHeading(2),
        FIXTURES.blockWithHeading(3)
      ];
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, blocks);
      
      const result = await exporter.exportCurrentPage();
      
      expectMarkdownHeading(result, 1, 'Heading level 1');
      expectMarkdownHeading(result, 2, 'Heading level 2');
      expectMarkdownHeading(result, 3, 'Heading level 3');
    });
    
    it('should handle Health heading with level 2 from Logseq data', async () => {
      const healthBlock: BlockEntity = {
        uuid: '30b32ab7-0ac3-428c-bc92-2132a4b190d7',
        content: 'Health',
        'logseq.property/heading': 2,
        children: [
          createMockBlock({ 
            uuid: 'child-1', 
            content: 'This is under Health heading' 
          })
        ],
        properties: {},
        parent: { id: 1 },
        left: { id: 1 },
        format: 'markdown',
        page: { id: 1 },
        id: 1
      } as BlockEntity;
      
      const blocks = [
        healthBlock,
        createMockBlock({ content: 'Regular content after heading' })
      ];
      
      mockCurrentPageResponse(mockAPI, createMockPage());
      mockPageBlocksResponse(mockAPI, blocks);
      
      const result = await exporter.exportCurrentPage({ flattenNested: true });
      
      // Check H2 heading is present
      expect(result).toContain('## Health');
      
      // Check child content appears after heading
      expect(result).toContain('This is under Health heading');
      
      // Check regular content appears
      expect(result).toContain('Regular content after heading');
      
      // Verify the order
      const lines = result.split('\n');
      const headingIndex = lines.findIndex(l => l === '## Health');
      const childIndex = lines.findIndex(l => l.includes('This is under Health heading'));
      const regularIndex = lines.findIndex(l => l.includes('Regular content after heading'));
      
      expect(headingIndex).toBeLessThan(childIndex);
      expect(childIndex).toBeLessThan(regularIndex);
    });

    it('should handle nested blocks with flattening', async () => {
      const page = createMockPage();
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [FIXTURES.nestedBlocks]);
      
      const result = await exporter.exportCurrentPage({ flattenNested: true });
      
      expect(result).toContain('Parent content');
      expect(result).toContain('Child 1');
      expect(result).toContain('Grandchild 1');
      expect(result).not.toMatch(/^\s+- /m);
    });

    it('should skip property-only blocks', async () => {
      const page = createMockPage();
      const propertyBlock = createMockBlock({
        content: 'property:: value\nanother:: value2'
      });
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [propertyBlock, FIXTURES.simpleBlock]);
      
      const result = await exporter.exportCurrentPage();
      
      expect(result).not.toContain('property::');
      expect(result).toContain('Simple content');
    });

    it('should prevent infinite recursion with cyclic blocks', async () => {
      const page = createMockPage();
      const block1: BlockEntity = { uuid: 'block1', content: 'Block 1', children: [], properties: {}, parent: { id: 1 }, left: { id: 1 }, format: 'markdown', page: { id: 1 }, id: 1 } as BlockEntity;
      const block2: BlockEntity = { uuid: 'block2', content: 'Block 2', children: [], properties: {}, parent: { id: 1 }, left: { id: 1 }, format: 'markdown', page: { id: 1 }, id: 2 } as BlockEntity;
      
      // Create circular reference
      block1.children = [block2];
      block2.children = [block1];
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block1]);
      
      const result = await exporter.exportCurrentPage();
      
      // Should process each block only once
      expect(result.match(/Block 1/g)?.length).toBe(1);
      expect(result.match(/Block 2/g)?.length).toBe(1);
    });
  });

  describe('Reference Resolution', () => {
    it('should handle page references', async () => {
      const page = createMockPage();
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [FIXTURES.blockWithPageRef]);
      
      const result = await exporter.exportCurrentPage();
      
      expect(result).toContain('Link to Another Page');
      expect(result).not.toContain('[[');
    });

    it('should handle UUID in different contexts', async () => {
      const page = createMockPage();
      const uuid = 'context12-3456-7890-abcd-ef0123456789';
      
      const content = `
        Plain UUID: ${uuid}
        In URL: https://example.com/${uuid}/page
        In path: /assets/${uuid}.png
      `;
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content })]);
      mockAPI.Editor.getBlock.mockResolvedValue({
        uuid,
        content: 'Resolved',
        properties: {}
      });
      
      const result = await exporter.exportCurrentPage({ 
        preserveBlockRefs: true,
        resolvePlainUuids: true
      });
      
      // Should not resolve UUID in URLs or paths
      expect(result).toContain(`https://example.com/${uuid}/page`);
      expect(result).toContain(`/assets/${uuid}.png`);
    });
  });

  describe('Asset Handling', () => {
    it('should detect and track multiple assets', async () => {
      const page = createMockPage();
      const content = `
        ![Image 1](../assets/a1234567-89ab-cdef-0123-111111111111.png)
        [Document](../assets/b1234567-89ab-cdef-0123-222222222222.pdf)
        ![Image 2](../assets/c1234567-89ab-cdef-0123-333333333333.jpg)
      `;
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content })]);
      mockGraphResponse(mockAPI, '/test/graph');
      
      const result = await exporter.exportCurrentPage();
      
      expect(result).toContain('![Image 1](assets/a1234567-89ab-cdef-0123-111111111111.png)');
      expect(result).toContain('[Document](assets/b1234567-89ab-cdef-0123-222222222222.pdf)');
      
      const assets = exporter.getReferencedAssets();
      expect(assets.size).toBe(3);
    });

    it('should handle custom asset paths', async () => {
      const page = createMockPage();
      const assetContent = '![Image](../assets/abc12345-6789-0abc-def0-123456789abc.png)';
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: assetContent })]);
      
      const result = await exporter.exportCurrentPage({ assetPath: 'custom/path/' });
      expect(result).toContain('![Image](custom/path/abc12345-6789-0abc-def0-123456789abc.png)');
    });

    it('should clear assets between exports', async () => {
      const page = createMockPage();
      
      // First export with assets
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [
        createMockBlock({ content: '![](../assets/a1234567-89ab-cdef-0123-456789abcde1.png)' })
      ]);
      
      await exporter.exportCurrentPage();
      let assets = exporter.getReferencedAssets();
      expect(assets.size).toBe(1);
      
      // Second export with different assets
      mockPageBlocksResponse(mockAPI, [
        createMockBlock({ content: '![](../assets/b1234567-89ab-cdef-0123-456789abcde2.png)' })
      ]);
      
      await exporter.exportCurrentPage();
      assets = exporter.getReferencedAssets();
      expect(assets.size).toBe(1);
      expect(assets.has('b1234567-89ab-cdef-0123-456789abcde2')).toBe(true);
    });

    it('should detect asset type from DataScript query', async () => {
      const page = createMockPage();
      const assetUuid = 'a1234567-89ab-cdef-0123-456789abcde0';
      
      mockAPI.DB.datascriptQuery.mockResolvedValueOnce([
        ['png', { ':block/uuid': { $uuid: assetUuid }, ':logseq.property.asset/type': 'png' }]
      ]);
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: assetUuid })]);
      
      await exporter.exportCurrentPage({ resolvePlainUuids: true });
      expect(mockAPI.DB.datascriptQuery).toHaveBeenCalled();
    });

    it('should detect asset type from page entity', async () => {
      const page = createMockPage();
      
      mockAPI.DB.datascriptQuery.mockResolvedValueOnce([]);
      mockAPI.Editor.getPage.mockResolvedValueOnce({
        uuid: 'page-asset',
        'logseq.property.asset/type': 'pdf',
        ':block/properties': { 'asset/type': 'pdf' }
      });
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: '[[page-asset]]' })]);
      
      const result = await exporter.exportCurrentPage();
      expect(result).toBeTruthy();
    });

    it('should create asset markdown with title', async () => {
      const page = createMockPage();
      const imageUuid = 'img-uuid-1234';
      
      mockAPI.DB.datascriptQuery.mockResolvedValueOnce([
        ['png', { ':block/uuid': { $uuid: imageUuid }, ':block/title': 'My Image' }]
      ]);
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: imageUuid })]);
      mockGraphResponse(mockAPI, '/graph/path');
      
      await exporter.exportCurrentPage({ resolvePlainUuids: true });
      
      const assets = exporter.getReferencedAssets();
      if (assets.has(imageUuid)) {
        const assetInfo = assets.get(imageUuid);
        expect(assetInfo?.title).toBe('My Image');
      }
    });

    it('should preserve asset titles in references', async () => {
      const page = createMockPage();
      const content = '![My Custom Title](../assets/abcd1234-5678-90ab-cdef-123456789abc.png)';
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content })]);
      
      await exporter.exportCurrentPage();
      
      const assets = exporter.getReferencedAssets();
      const assetInfo = assets.get('abcd1234-5678-90ab-cdef-123456789abc');
      expect(assetInfo?.title).toBe('My Custom Title');
    });

    it('should find asset by title', async () => {
      const page = createMockPage();
      
      mockAPI.DB.datascriptQuery.mockImplementation((query: string) => {
        if (query.includes(':block/title "Test Asset"')) {
          return Promise.resolve([
            [{ $uuid: 'title-asset-uuid' }, 'png', { ':block/title': 'Test Asset' }]
          ]);
        }
        return Promise.resolve([]);
      });
      
      mockAPI.Editor.getPage.mockResolvedValue({
        uuid: 'page-uuid',
        name: 'Page',
        properties: { image: 'Test Asset' }
      });
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);
      
      await exporter.exportCurrentPage({ includeProperties: true });
      expect(mockAPI.DB.datascriptQuery).toHaveBeenCalled();
    });

    it('should handle direct asset blocks (asset as the block itself)', async () => {
      const page = createMockPage();
      const assetBlock = createMockBlock({ 
        uuid: '68b5604a-2344-41fd-b509-858d8df23a3b',
        content: 'NextJS Framework'
      });
      
      // Mock detectAsset to recognize this block as an asset
      mockAPI.DB.datascriptQuery.mockImplementation((query: string) => {
        if (query.includes('68b5604a-2344-41fd-b509-858d8df23a3b')) {
          return Promise.resolve([
            ['png', { ':block/title': 'NextJS Framework', 'title': 'NextJS Framework' }]
          ]);
        }
        return Promise.resolve([]);
      });
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [assetBlock]);
      mockGraphResponse(mockAPI, '/graph/path');
      
      const result = await exporter.exportCurrentPage();
      
      // Should contain image markdown instead of just the title
      expect(result).toContain('![NextJS Framework](assets/68b5604a-2344-41fd-b509-858d8df23a3b.png)');
      expect(result).not.toContain('NextJS Framework\n\n'); // Should not output as plain text
      
      // Asset should be tracked
      const assets = exporter.getReferencedAssets();
      expect(assets.has('68b5604a-2344-41fd-b509-858d8df23a3b')).toBe(true);
    });
  });

  describe('Frontmatter & Properties', () => {
    it('should generate YAML frontmatter from page properties', async () => {
      const pageWithProps = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        properties: {
          'user.property/title': 'My Article',
          'user.property/date': '2024-01-15',
          'user.property/tags': ['javascript', 'typescript'],
          'user.property/author': 'John Doe'
        }
      };
      
      mockAPI.Editor.getPage.mockResolvedValue(pageWithProps);
      mockAPI.getPage.mockResolvedValue(pageWithProps);
      mockCurrentPageResponse(mockAPI, pageWithProps as PageEntity);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: 'Content' })]);
      
      // Mock the DataScript queries for property mapping
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/title', 'title'],
            ['user.property/date', 'date'],
            ['user.property/tags', 'tags'],
            ['user.property/author', 'author']
          ];
        }
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            ['user.property/title', 'title'],
            ['user.property/date', 'date'],
            ['user.property/tags', 'tags'],
            ['user.property/author', 'author']
          ];
        }
        return [];
      });
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      expect(result).toContain('---');
      expect(result).toContain('title: My Article');
      expect(result).toContain('date: 2024-01-15');
      expect(result).toContain('author: John Doe');
    });

    it('should merge blogTags into tags and remove duplicates', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Page',
        originalName: 'Page',
        'journal?': false,
        properties: {
          'user.property/tags': ['duplicate', 'unique1'],
          'user.property/blogTags': ['duplicate', 'unique2']
        }
      };
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      
      // Mock DataScript queries for property mapping
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/tags', 'tags'],
            ['user.property/blogTags', 'blogTags']
          ];
        }
        return [];
      });
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      // Count occurrences of 'duplicate' - should only appear once
      const duplicateCount = (result.match(/duplicate/g) || []).length;
      expect(duplicateCount).toBe(1);
      expect(result).not.toContain('blogTags:');
    });

    it('should skip internal properties', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Page',
        originalName: 'Page',
        'journal?': false,
        properties: {
          'user.property/title': 'Keep this',
          'logseq.property.embedding': 'internal',
          'db/id': 123,
          'user.property/author': 'Keep this too'
        }
      };
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockAPI.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      
      // Mock DataScript queries for property mapping
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/title', 'title'],
            ['user.property/author', 'author']
          ];
        }
        return [];
      });
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      expect(result).toContain('title: Keep this');
      expect(result).toContain('author: Keep this too');
      expect(result).not.toContain('embedding');
      expect(result).not.toContain('db/id');
    });

    it('should handle UUID properties as assets', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Page',
        originalName: 'Page',
        'journal?': false,
        properties: {
          'user.property/coverImage': 'a1234567-89ab-cdef-0123-456789abcdef'
        }
      };
      
      // Mock asset type detection and property queries
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/coverImage', 'coverImage']];
        }
        if (query.includes(':block/uuid #uuid "a1234567-89ab-cdef-0123-456789abcdef"') && 
            query.includes(':logseq.property.asset/type')) {
          return [
            ['jpg', { ':block/uuid': { $uuid: 'a1234567-89ab-cdef-0123-456789abcdef' } }]
          ];
        }
        return [];
      });
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockAPI.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      expect(result).toContain('coverImage: assets/a1234567-89ab-cdef-0123-456789abcdef.jpg');
    });

    it('should handle page references in properties', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Page',
        originalName: 'Page',
        'journal?': false,
        properties: {
          'user.property/relatedPage': '[[Another Page]]',
          'user.property/category': '[[Category/Subcategory]]'
        }
      };
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      
      // Mock DataScript queries for property mapping
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/relatedPage', 'relatedPage'],
            ['user.property/category', 'category']
          ];
        }
        return [];
      });
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      expect(result).toContain('relatedPage: Another Page');
      expect(result).toContain('category: Category/Subcategory');
    });

    it('should handle Set properties', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Page',
        originalName: 'Page',
        'journal?': false,
        properties: {
          'user.property/uniqueTags': new Set(['unique1', 'unique2'])
        }
      };
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      
      // Mock property mapping queries
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/uniqueTags', 'uniqueTags']
          ];
        }
        return [];
      });
      
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      expect(result).toContain('uniqueTags:');
      expect(result).toContain('unique1');
      expect(result).toContain('unique2');
    });

    it('should resolve database references', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Page',
        originalName: 'Page',
        'journal?': false,
        properties: {
          'user.property/linkedAsset': { 'db/id': 999 }
        }
      };
      
      // Mock property mapping and database reference queries
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/linkedAsset', 'linkedAsset']];
        }
        if (query.includes(':db/id 999')) {
          return [
            [{ $uuid: 'linked-asset-uuid' }, 'pdf', 'Asset Title']
          ];
        }
        return [];
      });
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      mockGraphResponse(mockAPI, '/test/graph');
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      expect(result).toContain('linkedAsset: assets/linked-asset-uuid.pdf');
    });

    it('should generate slug from page name', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'My Test Page Name!',
        originalName: 'My Test Page Name!',
        'journal?': false,
        properties: {}
      };
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: 'Content' })]);
      
      const result = await exporter.exportCurrentPage({ 
        includeProperties: true,
        includePageName: false
      });
      
      expect(result).toContain('title: My Test Page Name!');
      expect(result).toContain('slug: my-test-page-name');
    });

    it('should collect property values to skip', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Page',
        originalName: 'Page',
        'journal?': false,
        properties: {
          prop1: 'value1',
          prop2: ['value2', 'value3'],
          prop3: new Set(['value4'])
        }
      };
      
      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, [
        createMockBlock({ content: 'value1' }), // Should be skipped
        createMockBlock({ content: 'value2' }), // Should be skipped
        createMockBlock({ content: 'value5' })  // Should be included
      ]);
      
      const result = await exporter.exportCurrentPage();
      
      expect(result).not.toContain('value1');
      expect(result).not.toContain('value2');
      expect(result).toContain('value5');
    });
  });

  describe('File Operations', () => {
    it('should copy to clipboard', async () => {
      mockFileAPI.writeToClipboard.mockResolvedValue(undefined);
      
      const content = '# Test Content';
      await exporter.copyToClipboard(content);
      
      expect(mockFileAPI.writeToClipboard).toHaveBeenCalledWith(content);
      expect(mockAPI.UI.showMsg).toHaveBeenCalledWith('Markdown copied to clipboard!', 'success');
    });

    it('should handle clipboard errors', async () => {
      mockFileAPI.writeToClipboard.mockRejectedValue(new Error('Permission denied'));
      
      await exporter.copyToClipboard('# Test');
      
      expect(mockAPI.UI.showMsg).toHaveBeenCalledWith('Failed to copy to clipboard', 'error');
    });

    it('should download markdown with proper filename', async () => {
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      mockDOMHelpers.createElement.mockReturnValue(mockLink);
      
      await exporter.downloadMarkdown('# Content', 'custom-file.md');
      
      expect(mockLink.download).toBe('custom-file.md');
      expect(mockLink.click).toHaveBeenCalled();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockDOMHelpers.removeChild).toHaveBeenCalledWith(mockLink);
    });

    it('should export as ZIP with assets', async () => {
      const mockZipFile = vi.fn();
      const mockAssetsFile = vi.fn();
      const mockZipFolder = vi.fn().mockReturnValue({ file: mockAssetsFile });
      
      (JSZip as unknown as MockedClass<typeof JSZip>).mockImplementation(() => ({
        file: mockZipFile,
        folder: mockZipFolder,
        generateAsync: vi.fn().mockResolvedValue(new Blob(['zip']))
      } as unknown as JSZip));
      
      const page = createMockPage({ name: 'Page With Assets' });
      const assetBlock = createMockBlock({
        content: '![Image](../assets/a1234567-89ab-cdef-0123-456789abcde1.png)'
      });
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [assetBlock]);
      mockGraphResponse(mockAPI, '/test/graph');
      
      mockFileAPI.fetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['image-data']))
      } as Response);
      
      const content = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(content, undefined, 'assets/');
      
      expect(mockZipFolder).toHaveBeenCalledWith('assets');
      expect(mockAssetsFile).toHaveBeenCalledWith(
        'a1234567-89ab-cdef-0123-456789abcde1.png',
        expect.any(Blob)
      );
      expect(mockAPI.UI.showMsg).toHaveBeenCalledWith(
        expect.stringContaining('1 assets'),
        'success'
      );
    });
  });

  describe('Logseq Syntax Removal', () => {
    it('should remove Logseq-specific syntax', async () => {
      const page = createMockPage();
      const block = createMockBlock({
        content: 'TODO NOW [#A] Task with [[page]] and #tag'
      });
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      
      const result = await exporter.exportCurrentPage({ 
        removeLogseqSyntax: true,
        includeTags: false 
      });
      
      expect(result).not.toContain('TODO');
      expect(result).not.toContain('NOW');
      expect(result).not.toContain('[#A]');
      expect(result).not.toContain('#tag');
      expect(result).toContain('Task with page');
    });
  });

  describe('Custom Queries', () => {
    it('should export query results as markdown', async () => {
      const queryResults = [
        { 'block/content': 'Result 1 content' },
        { 'db/id': 123, 'block/title': 'Result 2' }
      ];
      
      mockAPI.DB.datascriptQuery.mockResolvedValue(queryResults);
      
      const result = await exporter.exportWithCustomQuery('[:find ?content]');
      
      expect(result).toContain('# Query Results');
      expect(result).toContain('Result 1 content');
      expect(result).toContain('"db/id": 123');
    });

    it('should handle empty query results', async () => {
      mockAPI.DB.datascriptQuery.mockResolvedValue([]);
      
      const result = await exporter.exportWithCustomQuery('[:find ?x]');
      
      expect(result).toContain('_No results found for the query._');
    });
  });

  describe('Helper Functions', () => {
    it('should validate UUID formats', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      expect(MarkdownHelpers.isUuid(uuid)).toBe(true);
      expect(MarkdownHelpers.isUuid('not-a-uuid')).toBe(false);
      expect(MarkdownHelpers.isUuid('')).toBe(false);
      expect(MarkdownHelpers.isUuid('g1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(false);
    });

    it('should extract UUID from various formats', () => {
      const uuid = 'test1234-5678-90ab-cdef-000000000001';
      expect(MarkdownHelpers.extractUuid(uuid)).toBe(uuid);
      expect(MarkdownHelpers.extractUuid({ $uuid: uuid })).toBe(uuid);
      expect(MarkdownHelpers.extractUuid(undefined)).toBeUndefined();
      expect(MarkdownHelpers.extractUuid('')).toBeUndefined();
    });

    it('should identify property-only blocks', () => {
      expect(MarkdownHelpers.isPropertyOnlyBlock('property:: value')).toBe(true);
      expect(MarkdownHelpers.isPropertyOnlyBlock('prop1:: val1\nprop2:: val2')).toBe(true);
      expect(MarkdownHelpers.isPropertyOnlyBlock('  property:: value  ')).toBe(true);
      expect(MarkdownHelpers.isPropertyOnlyBlock('Content\nproperty:: value')).toBe(false);
      expect(MarkdownHelpers.isPropertyOnlyBlock('')).toBe(false);
      expect(MarkdownHelpers.isPropertyOnlyBlock(null as unknown as string)).toBe(false);
    });

    it('should clean up markdown formatting', () => {
      const markdown = `# Title\n\n\n\n## Subtitle\nContent`;
      const result = MarkdownHelpers.postProcessMarkdown(markdown);
      
      expect(result).not.toContain('\n\n\n');
      expect(result).toContain('# Title\n\n## Subtitle');
      
      // Test edge cases
      expect(MarkdownHelpers.postProcessMarkdown('')).toBe('');
      expect(MarkdownHelpers.postProcessMarkdown('   \n\n\n   ')).toBe('');
      expect(MarkdownHelpers.postProcessMarkdown('Single line')).toBe('Single line');
    });

    it('should identify image assets', () => {
      expect(MarkdownHelpers.isImageAsset('png')).toBe(true);
      expect(MarkdownHelpers.isImageAsset('PDF')).toBe(false);
      expect(MarkdownHelpers.isImageAsset('JPG')).toBe(true);
      expect(MarkdownHelpers.isImageAsset('webp')).toBe(true);
      expect(MarkdownHelpers.isImageAsset('BMP')).toBe(true);
    });

    it('should process asset paths correctly', () => {
      const content = '![Test](../assets/test.png)';
      expect(MarkdownHelpers.processAssetPaths(content, 'assets')).toContain('(assets/test.png)');
      expect(MarkdownHelpers.processAssetPaths(content, 'assets/')).toContain('(assets/test.png)');
      expect(MarkdownHelpers.processAssetPaths(content, '/assets')).toContain('(/assets/test.png)');
    });

    // cleanPropertyKey and isSystemProperty tests removed - now using DataScript queries

    it('should format YAML correctly', () => {
      const data = {
        title: 'Test',
        tags: ['tag1', 'tag2'],
        description: 'Line 1\nLine 2'
      };
      const yaml = MarkdownHelpers.formatYaml(data);
      
      expect(yaml).toContain('---\n');
      expect(yaml).toContain('title: Test');
      expect(yaml).toContain('tags:\n  - tag1\n  - tag2');
      expect(yaml).toContain('description: |');
    });

    it('should handle complex Logseq syntax cleaning', () => {
      const content = `TODO NOW [#A] Task with [[[[nested]] page]]
{{query (and [[page1]] [[page2]])}}
{{renderer :wordcount}}
Normal text #tag1 #[[complex tag]]`;
      
      const cleaned = MarkdownHelpers.cleanLogseqSyntax(content, {
        includeTags: false,
        includeProperties: false,
        removeLogseqSyntax: true
      });
      
      expect(cleaned).not.toContain('TODO');
      expect(cleaned).not.toContain('{{');
      expect(cleaned).not.toContain('#tag1');
      expect(cleaned).toContain('Task with nested page');
      expect(cleaned).toContain('Normal text');
    });

    it('should get heading level from block', () => {
      const block1 = { 'logseq.property/heading': 1 } as unknown as BlockEntity;
      const block2 = { 'logseq.property/heading': 6 } as unknown as BlockEntity;
      const block3 = { 'logseq.property/heading': 7 } as unknown as BlockEntity;
      const block4 = { 'logseq.property/heading': 'invalid' } as unknown as BlockEntity;
      const block5 = {} as unknown as BlockEntity;
      
      expect(MarkdownHelpers.getHeadingLevel(block1)).toBe(1);
      expect(MarkdownHelpers.getHeadingLevel(block2)).toBe(6);
      expect(MarkdownHelpers.getHeadingLevel(block3)).toBeNull();
      expect(MarkdownHelpers.getHeadingLevel(block4)).toBeNull();
      expect(MarkdownHelpers.getHeadingLevel(block5)).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing after DataScript errors', async () => {
      const page = createMockPage();
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: 'Content' })]);
      
      mockAPI.DB.datascriptQuery.mockRejectedValue(new Error('Query failed'));
      
      const result = await exporter.exportCurrentPage();
      expect(result).toContain('Content');
    });

    it('should handle getCurrentGraph returning null', async () => {
      const page = createMockPage();
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ content: 'Content' })]);
      mockAPI.App.getCurrentGraph.mockResolvedValue(null);
      
      const result = await exporter.exportCurrentPage();
      expect(result).toContain('Content');
      expect(exporter.getGraphPath()).toBe('');
    });
  });

  describe('Performance', () => {
    it('should handle many blocks efficiently', async () => {
      const page = createMockPage();
      const manyBlocks = Array.from({ length: 100 }, (_, i) => 
        createMockBlock({ 
          uuid: `block-${i}`,
          content: `Block ${i}` 
        })
      );
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, manyBlocks);
      
      const result = await exporter.exportCurrentPage();
      
      expect(result).toContain('Block 0');
      expect(result).toContain('Block 99');
    });
  });

  describe('Integration', () => {
    it('should handle complex page with all features', async () => {
      const page = createMockPage({
        name: 'Complex Page',
        properties: {
          title: 'Complex Export Test',
          tags: ['test', 'export']
        }
      });
      
      const blocks = [
        FIXTURES.blockWithHeading(1),
        FIXTURES.blockWithPageRef,
        FIXTURES.blockWithAsset,
        FIXTURES.nestedBlocks
      ];
      
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, blocks);
      mockAssetQuery(mockAPI, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'png');
      
      const result = await exporter.exportCurrentPage({
        includePageName: true,
        includeProperties: true,
        preserveBlockRefs: true,
        flattenNested: true
      });
      
      expectMarkdownHeading(result, 1, 'Complex Page');
      expectMarkdownHeading(result, 1, 'Heading level 1');
      expect(result).toContain('Link to Another Page');
      expect(result).toContain('![Image](assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png)');
      expect(result).toContain('Parent content');
    });
  });
});