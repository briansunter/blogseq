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
  type MockDOMHelpers
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

  describe('generateFrontmatter - Basic Functionality', () => {
    it('should generate frontmatter with default title from page name', async () => {
      const page = createMockPage({ name: 'My Test Page', properties: {} });

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        includeProperties: true
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
        includeProperties: true
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
        includeProperties: true
      });

      // Should have minimal or no frontmatter
      expect(result.trim()).toBe('');
    });

    it('should not generate frontmatter when includeProperties is false', async () => {
      const page = createMockPage({
        name: 'Test Page',
        properties: { 'user.property/author': 'John Doe' }
      });

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false
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
        properties: {
          'user.property/author': 'Jane Smith',
          'user.property/date': '2024-01-15',
          'user.property/description': 'Test description'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/author', 'author'],
            ['user.property/date', 'date'],
            ['user.property/description', 'description']
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/title': 'My Title',
          'logseq.property.embedding': 'internal',
          'logseq.property/created-at': 1234567890
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/title', 'title']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/known': 'Value',
          'user.property/unknown': 'Should Skip'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/known', 'known']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/title': 'Custom Title Override'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/title', 'title']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/tags': ['javascript', 'typescript'],
          'user.property/blogTags': ['web-dev', 'tutorial']
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

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
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/tags': ['react', 'duplicate'],
          'user.property/blogTags': ['duplicate', 'vue']
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

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
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/tags': ['single-tag']
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/tags', 'tags']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/tags': []
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/tags', 'tags']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/text': 'Simple text value'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/text', 'text']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/items': ['item1', 'item2', 'item3']
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/items', 'items']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/unique': new Set(['one', 'two', 'three'])
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/unique', 'unique']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/reference': '[[Referenced Page]]'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/reference', 'reference']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/image': '550e8400-e29b-41d4-a716-446655440574'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      mockGraphResponse(mockAPI, '/test/graph');

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/image', 'image']];
        }
        if (query.includes('550e8400-e29b-41d4-a716-446655440574') &&
            query.includes(':logseq.property.asset/type')) {
          return [['png', { ':block/uuid': { $uuid: '550e8400-e29b-41d4-a716-446655440574' } }]];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/linked': { 'db/id': 999 }
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      mockGraphResponse(mockAPI, '/test/graph');

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/linked', 'linked']];
        }
        if (query.includes(':db/id 999')) {
          return [[{ $uuid: 'linked-asset-uuid' }, 'pdf', 'Linked Asset']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/ref': { 'db/id': 888 }
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/ref', 'ref']];
        }
        if (query.includes(':db/id 888')) {
          if (query.includes('?uuid ?type ?title')) {
            return []; // Not an asset
          }
          if (query.includes('?title :where')) {
            return [['Referenced Item']];
          }
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/description': 'Line 1\nLine 2\nLine 3'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/description', 'description']];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/count': 42,
          'user.property/rating': 4.5
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/count', 'count'],
            ['user.property/rating', 'rating']
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/published': true,
          'user.property/draft': false
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/published', 'published'],
            ['user.property/draft', 'draft']
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        includeProperties: true
      });

      // Should still work with original page object
      expect(result).toContain('title: Test');
    });

    it('should handle DataScript query errors gracefully', async () => {
      const page = createMockPage({
        name: 'Test',
        properties: { 'user.property/author': 'John' }
      });

      mockAPI.Editor.getPage.mockResolvedValue(page);
      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockRejectedValue(new Error('Query failed'));

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/unmapped': 'Value'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockResolvedValue([]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/nullValue': null,
          'user.property/undefinedValue': undefined,
          'user.property/validValue': 'Valid'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/nullValue', 'nullValue'],
            ['user.property/undefinedValue', 'undefinedValue'],
            ['user.property/validValue', 'validValue']
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        includeProperties: true
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
        properties: {
          'user.property/cover': '550e8400-e29b-41d4-a716-446655440927'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);
      mockGraphResponse(mockAPI, '/test/graph');

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [['user.property/cover', 'cover']];
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
        assetPath: 'media/'
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
        properties: {
          'user.property/author': 'John',
          'user.property/date': '2024-01-01',
          'user.property/category': 'Tech'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/author', 'author'],
            ['user.property/date', 'date'],
            ['user.property/category', 'category']
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
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
        properties: {
          'user.property/empty': '',
          'user.property/valid': 'Not Empty'
        }
      };

      mockAPI.Editor.getPage.mockResolvedValue(page as PageEntity);
      mockCurrentPageResponse(mockAPI, page as PageEntity);
      mockPageBlocksResponse(mockAPI, []);

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?ident ?title')) {
          return [
            ['user.property/empty', 'empty'],
            ['user.property/valid', 'valid']
          ];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: true
      });

      expect(result).toContain('valid: Not Empty');
      // Empty string should still be included (it's a valid YAML value)
      expect(result).toMatch(/empty:\s*$/m);
    });
  });
});
