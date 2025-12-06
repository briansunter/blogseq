import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter, DEFAULT_OPTIONS } from '../../../markdownExporter';
import type { PageEntity } from '@logseq/libs/dist/LSPlugin';
import {
  createMockLogseqAPI,
  createMockPage,
  createMockBlock,
  setupGlobalMocks,
  resetAllMocks,
  mockCurrentPageResponse,
  mockPageBlocksResponse,
  mockGraphResponse,
  type MockLogseqAPI,
  type MockFileAPI,
  type MockDOMHelpers,
} from '../../test-utils';
import { vi } from 'vitest';

describe('MarkdownExporter - Frontmatter Generation', () => {
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
      writeToClipboard: vi.fn(),
    };

    mockDOMHelpers = {
      createElement: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };

    exporter = new MarkdownExporter(mockAPI, mockFileAPI, mockDOMHelpers);
    setupGlobalMocks(mockAPI);
  });

  afterEach(() => {
    resetAllMocks(mockAPI);
    vi.clearAllMocks();
  });

  describe('generateFrontmatter - Basic Functionality', () => {
    it('should generate frontmatter with default title from page name', async () => {
      const page = createMockPage({ name: 'My Test Page', properties: {} });

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('---');
      expect(result).toContain('title: My Test Page');
    });

    it('should generate slug from page name', async () => {
      const page = createMockPage({ name: 'My Test Page!', properties: {} });

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('slug: my-test-page');
    });

    it('should generate slug with special characters removed', async () => {
      const page = createMockPage({ name: 'Test@#$%Page & More!', properties: {} });

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('slug: testpage--more');
    });

    it('should return empty string when page has no properties and no name', async () => {
      const page = createMockPage({ properties: {} });
      delete (page as Partial<PageEntity>).name;

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      // Should have minimal or no frontmatter
      expect(result.trim()).toBe('');
    });

    it('should not generate frontmatter when includeProperties is false', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        ':user.property/author-abc123': 'John Doe',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
      });

      expect(result).not.toContain('---');
      expect(result).not.toContain('author:');
    });
  });

  describe('generateFrontmatter - Property Processing', () => {
    it('should include mapped user properties in frontmatter', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        ':user.property/author-abc123': 'Jane Smith',
        ':user.property/date-xyz789': '2024-01-15',
        ':user.property/description-def456': 'Test description',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/author-abc123', 'author'],
            [':user.property/date-xyz789', 'date'],
            [':user.property/description-def456', 'description'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('author: Jane Smith');
      expect(result).toContain('date: 2024-01-15');
      expect(result).toContain('description: Test description');
    });

    it('should skip system properties (logseq.property.*)', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/title-abc123': 'My Title',
        ':logseq.property.embedding-xyz789': 'internal',
        ':logseq.property/created-at-def456': 1234567890,
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/title-abc123', 'title']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('title: My Title');
      expect(result).not.toContain('embedding');
      expect(result).not.toContain('created-at');
    });

    it('should skip properties without mapped titles', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/known-abc123': 'Value',
        ':user.property/unknown-xyz789': 'Should Skip',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/known-abc123', 'known']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('known: Value');
      expect(result).not.toContain('unknown');
    });

    it('should override default title with custom title property', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Default Title',
        originalName: 'Default Title',
        'journal?': false,
        ':user.property/title-abc123': 'Custom Title Override',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/title-abc123', 'title']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('title: Custom Title Override');
      expect(result).not.toContain('title: Default Title');
    });
  });

  describe('generateFrontmatter - Tags Processing', () => {
    it('should merge tags and blogTags into single tags array', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/tags-abc123': ['javascript', 'typescript'],
        ':user.property/blogTags-xyz789': ['web-dev', 'tutorial'],
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/tags-abc123', 'tags'],
            [':user.property/blogTags-xyz789', 'blogTags'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('tags:');
      expect(result).toContain('- javascript');
      expect(result).toContain('- typescript');
      expect(result).toContain('- web-dev');
      expect(result).toContain('- tutorial');
      expect(result).not.toContain('blogTags:');
    });

    it('should deduplicate tags when merging tags and blogTags', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/tags-abc123': ['react', 'duplicate'],
        ':user.property/blogTags-xyz789': ['duplicate', 'vue'],
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/tags-abc123', 'tags'],
            [':user.property/blogTags-xyz789', 'blogTags'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      const duplicateMatches = result.match(/- duplicate/g);
      expect(duplicateMatches?.length).toBe(1);
    });

    it('should handle tags as single string value', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/tags-abc123': ['single-tag'],
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/tags-abc123', 'tags']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('tags:');
      expect(result).toContain('- single-tag');
    });

    it('should handle empty tags array', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/tags-abc123': [],
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/tags-abc123', 'tags']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).not.toContain('tags:');
    });
  });

  describe('processPropertyValue - Value Type Handling', () => {
    it('should process string values as-is', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/text-abc123': 'Simple text value',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/text-abc123', 'text']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('text: Simple text value');
    });

    it('should process array values as YAML array', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/items-abc123': ['item1', 'item2', 'item3'],
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/items-abc123', 'items']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('items:');
      expect(result).toContain('- item1');
      expect(result).toContain('- item2');
      expect(result).toContain('- item3');
    });

    it('should convert Set to array', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/unique-abc123': new Set(['one', 'two', 'three']),
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/unique-abc123', 'unique']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('unique:');
      expect(result).toContain('- one');
      expect(result).toContain('- two');
      expect(result).toContain('- three');
    });

    it('should unwrap [[Page]] references to page names', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/reference-abc123': '[[Referenced Page]]',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/reference-abc123', 'reference']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('reference: Referenced Page');
      expect(result).not.toContain('[[');
    });

    it('should resolve UUID string to asset path', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/image-abc123': '550e8400-e29b-41d4-a716-446655440574',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      mockGraphResponse(mockAPI, '/test/graph');

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/image-abc123', 'image']];
        }
        if (
          query.includes('550e8400-e29b-41d4-a716-446655440574') &&
          query.includes(':logseq.property.asset/type')
        ) {
          return [['png', { ':block/uuid': { $uuid: '550e8400-e29b-41d4-a716-446655440574' } }]];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('image: assets/550e8400-e29b-41d4-a716-446655440574.png');
    });

    it('should resolve db/id reference to asset or page', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/linked-abc123': { 'db/id': 999 },
      };

      mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
        if (id === 'page-uuid' || id === 1) return page as PageEntity;
        return null;
      });
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      mockGraphResponse(mockAPI, '/test/graph');

      // Mock getBlock for db/id resolution
      mockAPI.Editor.getBlock.mockImplementation(async (id: string | number) => {
        if (id === 999) return createMockBlock({ uuid: 'linked-asset-uuid' });
        return null;
      });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/linked-abc123', 'linked']];
        }

        // Match the query used in resolveDbReference for assets
        // [:find ?uuid ?type ?title :where [999 :block/uuid ?uuid] ...]
        if (
          query.includes('[999 :block/uuid ?uuid]') &&
          query.includes(':logseq.property.asset/type')
        ) {
          // Return [uuid, type, title]
          // Note: The code expects [uuid, type, title]
          // result[0][0] is uuid (string or {$uuid}), result[0][1] is type, result[0][2] is title
          return [['linked-asset-uuid', 'pdf', 'Linked Asset']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('linked: assets/linked-asset-uuid.pdf');
    });

    it('should resolve db/id to title when not an asset', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/ref-abc123': { 'db/id': 888 },
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      // Mock getBlock for db/id resolution
      mockAPI.Editor.getBlock.mockImplementation(async (id: string | number) => {
        if (id === 888) return createMockBlock({ content: 'Referenced Item' });
        return null;
      });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/ref-abc123', 'ref']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('ref: Referenced Item');
    });
  });

  describe('generateFrontmatter - Multi-line and Special Values', () => {
    it('should format multi-line string as YAML block', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/description-abc123': 'Line 1\nLine 2\nLine 3',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/description-abc123', 'description']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('description: |');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('should handle numeric values', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/count-abc123': 42,
        ':user.property/rating-xyz789': 4.5,
      };

      mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
        if (id === 'page-uuid' || id === 1) return page as PageEntity;
        return null;
      });
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/count-abc123', 'count'],
            [':user.property/rating-xyz789', 'rating'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('count: 42');
      expect(result).toContain('rating: 4.5');
    });

    it('should handle boolean values', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/published-abc123': true,
        ':user.property/draft-xyz789': false,
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/published-abc123', 'published'],
            [':user.property/draft-xyz789', 'draft'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('published: true');
      expect(result).toContain('draft: false');
    });
  });

  describe('generateFrontmatter - Error Handling', () => {
    it('should handle getPage errors gracefully', async () => {
      const page = createMockPage({ name: 'Test' });

      mockAPI.Editor.getPage.mockRejectedValue(new Error('API Error'));
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      // Should still work with original page object
      expect(result).toContain('title: Test');
    });

    it('should handle DataScript query errors gracefully', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/author-abc123': 'John',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockRejectedValue(new Error('Query failed'));

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      // Should still generate basic frontmatter
      expect(result).toContain('title: Test');
    });

    it('should handle missing property map gracefully', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/unmapped-abc123': 'Value',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockResolvedValue([]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      // Should skip unmapped properties
      expect(result).not.toContain('unmapped');
    });

    it('should handle null or undefined property values', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/nullValue-abc123': null,
        ':user.property/undefinedValue-xyz789': undefined,
        ':user.property/validValue-def456': 'Valid',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/nullValue-abc123', 'nullValue'],
            [':user.property/undefinedValue-xyz789', 'undefinedValue'],
            [':user.property/validValue-def456', 'validValue'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).not.toContain('nullValue');
      expect(result).not.toContain('undefinedValue');
      expect(result).toContain('validValue: Valid');
    });
  });

  describe('generateFrontmatter - Edge Cases', () => {
    it('should handle page with no properties object', async () => {
      const page = createMockPage({ name: 'Test' });
      delete (page as Partial<PageEntity>).properties;

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('title: Test');
      expect(result).toContain('slug: test');
    });

    it('should handle custom assetPath in property values', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/cover-abc123': '550e8400-e29b-41d4-a716-446655440927',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      mockGraphResponse(mockAPI, '/test/graph');

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/cover-abc123', 'cover']];
        }
        if (query.includes('550e8400-e29b-41d4-a716-446655440927')) {
          return [['jpg', {}]];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
        assetPath: 'media/',
      });

      expect(result).toContain('cover: media/550e8400-e29b-41d4-a716-446655440927.jpg');
    });

    it('should preserve property order in frontmatter', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/author-abc123': 'John',
        ':user.property/date-xyz789': '2024-01-01',
        ':user.property/category-def456': 'Tech',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/author-abc123', 'author'],
            [':user.property/date-xyz789', 'date'],
            [':user.property/category-def456', 'category'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('author: John');
      expect(result).toContain('date: 2024-01-01');
      expect(result).toContain('category: Tech');
    });

    it('should handle empty string property values', async () => {
      const page = {
        uuid: 'page-uuid',
        id: 1,
        name: 'Test',
        originalName: 'Test',
        'journal?': false,
        ':user.property/empty-abc123': '',
        ':user.property/valid-xyz789': 'Not Empty',
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/empty-abc123', 'empty'],
            [':user.property/valid-xyz789', 'valid'],
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true,
      });

      expect(result).toContain('valid: Not Empty');
      // Empty string should still be included (it's a valid YAML value)
      expect(result).toMatch(/empty:\s*$/m);
    });
  });
});
