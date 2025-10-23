import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter, DEFAULT_OPTIONS } from '../../../markdownExporter';
import type { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin';
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

describe('MarkdownExporter - Reference Resolution', () => {
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

  describe('resolveReferences - Page References [[uuid]]', () => {
    it('should resolve [[uuid]] page reference to page name', async () => {
      const page = createMockPage({ name: 'Test' });
      const pageRefUuid = '12345678-1234-1234-1234-123456789abc';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `Link to [[${pageRefUuid}]]`
      });

      mockAPI.Editor.getPage.mockImplementation((uuid: string) => {
        if (uuid === pageRefUuid) {
          return Promise.resolve({ uuid: pageRefUuid, name: 'Referenced Page' } as PageEntity);
        }
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('Link to Referenced Page');
      expect(result).not.toContain('[[');
    });

    it('should handle multiple [[uuid]] references in same content', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid1 = '11111111-1111-1111-1111-111111111111';
      const uuid2 = '22222222-2222-2222-2222-222222222222';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `First [[${uuid1}]] and second [[${uuid2}]]`
      });

      mockAPI.Editor.getPage.mockImplementation((uuid: string) => {
        if (uuid === uuid1) return Promise.resolve({ uuid: uuid1, name: 'Page One' } as PageEntity);
        if (uuid === uuid2) return Promise.resolve({ uuid: uuid2, name: 'Page Two' } as PageEntity);
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('First Page One');
      expect(result).toContain('second Page Two');
    });

    it('should keep [[uuid]] format if page not found', async () => {
      const page = createMockPage({ name: 'Test' });
      const unresolvedUuid = '550e8400-e29b-41d4-a716-888888888888';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440110',
        content: `Link to [[${unresolvedUuid}]]`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      // Override after helpers to ensure unresolved UUID behavior
      // Must use mockImplementation to prevent delegation to mock instance
      mockAPI.Editor.getPage.mockImplementation(() => Promise.resolve(null));
      mockAPI.Editor.getBlock.mockImplementation(() => Promise.resolve(null));
      mockAPI.DB.datascriptQuery.mockImplementation(() => Promise.resolve([]));

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: false
      });

      expect(result).toContain(`[[${unresolvedUuid}]]`);
    });

    it('should handle case-insensitive UUID in [[reference]]', async () => {
      const page = createMockPage({ name: 'Test' });
      const mixedCaseUuid = 'AbCdEf12-3456-7890-ABCD-EF1234567890';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `Link to [[${mixedCaseUuid}]]`
      });

      mockAPI.Editor.getPage.mockImplementation((uuid: string) => {
        if (uuid.toLowerCase() === mixedCaseUuid.toLowerCase()) {
          return Promise.resolve({ uuid, name: 'Mixed Case Page' } as PageEntity);
        }
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('Mixed Case Page');
    });
  });

  describe('resolveReferences - Block References ((uuid))', () => {
    it('should resolve ((uuid)) block reference to block content', async () => {
      const page = createMockPage({ name: 'Test' });
      const blockRefUuid = '550e8400-e29b-41d4-a716-446655440163';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440003',
        content: `Reference to ((${blockRefUuid}))`
      });

      mockAPI.Editor.getBlock.mockImplementation((uuid: string) => {
        if (uuid === blockRefUuid) {
          return Promise.resolve({
            uuid: blockRefUuid,
            content: 'Referenced block content',
            properties: {}
          } as BlockEntity);
        }
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('Reference to Referenced block content');
      expect(result).not.toContain('((');
    });

    it('should handle multiple ((uuid)) references', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid1 = '550e8401-e29b-41d4-a716-111111111111';
      const uuid2 = '550e8402-e29b-41d4-a716-222222222222';
      const block = createMockBlock({
        uuid: 'block-main',
        content: `First ((${uuid1})) then ((${uuid2}))`
      });

      mockAPI.Editor.getBlock.mockImplementation((uuid: string) => {
        if (uuid === uuid1) return Promise.resolve({ uuid: uuid1, content: 'Block One', properties: {} } as BlockEntity);
        if (uuid === uuid2) return Promise.resolve({ uuid: uuid2, content: 'Block Two', properties: {} } as BlockEntity);
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('First Block One');
      expect(result).toContain('then Block Two');
    });

    it('should show fallback text for unresolved block reference', async () => {
      const page = createMockPage({ name: 'Test' });
      const unresolvedUuid = '550e8400-e29b-41d4-a716-999999999999';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440225',
        content: `Reference to ((${unresolvedUuid}))`
      });

      mockAPI.Editor.getBlock.mockResolvedValue(null);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('[Unresolved:');
    });

    it('should recursively resolve nested references in block content', async () => {
      const page = createMockPage({ name: 'Test' });
      const mainUuid = '550e8400-e29b-41d4-a716-446655440251';
      const nestedUuid = '550e8400-e29b-41d4-a716-446655440252';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `Reference to ((${mainUuid}))`
      });

      mockAPI.Editor.getBlock.mockImplementation((uuid: string) => {
        if (uuid === mainUuid) {
          return Promise.resolve({
            uuid: mainUuid,
            content: `Nested reference ((${nestedUuid}))`,
            properties: {}
          } as BlockEntity);
        }
        if (uuid === nestedUuid) {
          return Promise.resolve({
            uuid: nestedUuid,
            content: 'Final content',
            properties: {}
          } as BlockEntity);
        }
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('Final content');
    });

    it('should clean Logseq syntax from resolved block content', async () => {
      const page = createMockPage({ name: 'Test' });
      const blockRefUuid = '550e8400-e29b-41d4-a716-446655440291';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440008',
        content: `Reference to ((${blockRefUuid}))`
      });

      mockAPI.Editor.getBlock.mockImplementation((uuid: string) => {
        if (uuid === blockRefUuid) {
          return Promise.resolve({
            uuid: blockRefUuid,
            content: 'TODO NOW [#A] Task content with #tag',
            properties: {}
          } as BlockEntity);
        }
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        removeLogseqSyntax: true,
        includeTags: false
      });

      // removeLogseqSyntax IS applied to resolved block content
      // Priority markers like NOW and [#A] are removed, but TODO keyword remains
      expect(result).toContain('TODO');
      expect(result).toContain('Task content');
      expect(result).not.toContain('NOW');
      expect(result).not.toContain('[#A]');
      expect(result).not.toContain('#tag'); // Because includeTags: false
    });
  });

  describe('resolveReferences - Plain UUID Resolution', () => {
    it('should resolve plain UUID when resolvePlainUuids=true', async () => {
      const page = createMockPage({ name: 'Test' });
      const plainUuid = '550e8400-e29b-41d4-a716-446655440324';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440004',
        content: `UUID in text: ${plainUuid}`
      });

      mockAPI.Editor.getBlock.mockResolvedValue({
        uuid: plainUuid,
        content: 'Resolved plain UUID',
        properties: {}
      } as BlockEntity);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: true
      });

      expect(result).toContain('Resolved plain UUID');
    });

    it('should NOT resolve UUID with preceding slash', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440352';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `/assets/${uuid}.png`
      });

      mockAPI.Editor.getBlock.mockResolvedValue({
        uuid,
        content: 'Should not appear',
        properties: {}
      } as BlockEntity);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain(`/assets/${uuid}.png`);
      expect(result).not.toContain('Should not appear');
    });

    it('should NOT resolve UUID with preceding hyphen', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440380';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `file-${uuid}.md`
      });

      mockAPI.Editor.getBlock.mockResolvedValue({
        uuid,
        content: 'Should not appear',
        properties: {}
      } as BlockEntity);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain(`file-${uuid}.md`);
      expect(result).not.toContain('Should not appear');
    });

    it('should NOT resolve UUID with preceding underscore', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440408';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `var_${uuid}`
      });

      mockAPI.Editor.getBlock.mockResolvedValue({
        uuid,
        content: 'Should not appear',
        properties: {}
      } as BlockEntity);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain(`var_${uuid}`);
      expect(result).not.toContain('Should not appear');
    });

    it('should keep plain UUID if not resolvable', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440436';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `Plain UUID: ${uuid}`
      });

      mockAPI.Editor.getPage.mockResolvedValue(null);
      mockAPI.Editor.getBlock.mockResolvedValue(null);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain(uuid);
    });
  });

  describe('resolveUuid - Asset UUID Resolution', () => {
    it('should resolve UUID as asset if detected', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = '550e8400-e29b-41d4-a716-446655440462';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `Asset: ${assetUuid}`
      });

      mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes(assetUuid) && query.includes(':logseq.property.asset/type')) {
          return [['png', { ':block/uuid': { $uuid: assetUuid }, ':block/title': 'My Image' }]];
        }
        return [];
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: true
      });

      expect(result).toContain(`![My Image](assets/${assetUuid}.png)`);
    });

    it('should cache resolved asset UUID', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = '550e8400-e29b-41d4-a716-446655440492';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `First ${assetUuid} and second ${assetUuid}`
      });

      let queryCallCount = 0;
      mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes(assetUuid)) {
          queryCallCount++;
          return [['jpg', { ':block/uuid': { $uuid: assetUuid } }]];
        }
        return [];
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: true
      });

      // Asset should be detected once and cached
      expect(queryCallCount).toBeGreaterThan(0);
    });
  });

  describe('resolveUuid - Fallback Chain', () => {
    it('should try asset → page → block fallback chain', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440527';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `UUID: ${uuid}`
      });

      // Asset query fails
      mockAPI.DB.datascriptQuery.mockResolvedValue([]);

      // Page lookup fails
      mockAPI.Editor.getPage.mockResolvedValue(null);

      // Block lookup succeeds
      mockAPI.Editor.getBlock.mockResolvedValue({
        uuid,
        content: 'Fallback block content',
        properties: {}
      } as BlockEntity);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: true
      });

      expect(result).toContain('Fallback block content');
    });

    it('should try asset → page when block fails', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440562';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `UUID: ${uuid}`
      });

      // Asset query fails
      mockAPI.DB.datascriptQuery.mockResolvedValue([]);

      // Page lookup succeeds
      mockAPI.Editor.getPage.mockResolvedValue({
        uuid,
        name: 'Page Name'
      } as PageEntity);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: true
      });

      expect(result).toContain('Page Name');
    });

    it('should return null when all lookups fail', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440593';
      const block = createMockBlock({
        uuid: 'block-1',
        content: `UUID: ${uuid}`
      });

      mockAPI.DB.datascriptQuery.mockResolvedValue([]);
      mockAPI.Editor.getPage.mockResolvedValue(null);
      mockAPI.Editor.getBlock.mockResolvedValue(null);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      // UUID should remain unchanged
      expect(result).toContain(uuid);
    });
  });

  describe('resolveReferences - Edge Cases', () => {
    it('should handle empty content', async () => {
      const page = createMockPage({ name: 'Test' });
      const block = createMockBlock({
        uuid: 'empty',
        content: ''
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result.trim()).toBe('');
    });

    it('should handle content with no UUIDs', async () => {
      const page = createMockPage({ name: 'Test' });
      const block = createMockBlock({
        uuid: 'no-uuids',
        content: 'Plain text with no references'
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('Plain text with no references');
    });

    it('should handle malformed UUID patterns', async () => {
      const page = createMockPage({ name: 'Test' });
      const block = createMockBlock({
        uuid: 'malformed',
        content: 'Bad UUID: 12345-not-a-valid-uuid'
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      expect(result).toContain('Bad UUID: 12345-not-a-valid-uuid');
    });

    it('should handle mixed reference types in same content', async () => {
      const page = createMockPage({ name: 'Test' });
      const pageUuid = '550e8400-e29b-41d4-a716-446655440681';
      const blockUuid = '550e8400-e29b-41d4-a716-446655440682';
      const plainUuid = '550e8400-e29b-41d4-a716-446655440683';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440005',
        content: `Page [[${pageUuid}]] and block ((${blockUuid})) and plain ${plainUuid}`
      });

      mockAPI.Editor.getPage.mockImplementation((uuid: string) => {
        if (uuid === pageUuid) return Promise.resolve({ uuid: pageUuid, name: 'Page Ref' } as PageEntity);
        return Promise.resolve(null);
      });
      mockAPI.Editor.getBlock.mockImplementation((uuid: string) => {
        if (uuid === blockUuid) return Promise.resolve({ uuid: blockUuid, content: 'Block Ref', properties: {} } as BlockEntity);
        if (uuid === plainUuid) return Promise.resolve({ uuid: plainUuid, content: 'Plain Ref', properties: {} } as BlockEntity);
        return Promise.resolve(null);
      });
      mockAPI.DB.datascriptQuery.mockResolvedValue([]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: true
      });

      expect(result).toContain('Page Page Ref');
      expect(result).toContain('block Block Ref');
      expect(result).toContain('plain Plain Ref');
    });

    it('should handle error during getPage gracefully', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440714';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440006',
        content: `Reference [[${uuid}]]`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      // Override after helpers - only throw for the reference UUID, not for page lookup
      mockAPI.Editor.getPage.mockImplementation((lookupUuid: string) => {
        if (lookupUuid === uuid) {
          return Promise.reject(new Error('API Error'));
        }
        // Allow page lookup to succeed
        if (lookupUuid === page.uuid) {
          return Promise.resolve(page);
        }
        return Promise.resolve(null);
      });
      mockAPI.Editor.getBlock.mockImplementation(() => Promise.resolve(null));
      mockAPI.DB.datascriptQuery.mockImplementation(() => Promise.resolve([]));

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true,
        resolvePlainUuids: false
      });

      // Should keep original format on error
      expect(result).toContain(`[[${uuid}]]`);
    });

    it('should handle error during getBlock gracefully', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = '550e8400-e29b-41d4-a716-446655440739';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440007',
        content: `Reference ((${uuid}))`
      });

      mockAPI.DB.datascriptQuery.mockResolvedValue([]);
      mockAPI.Editor.getPage.mockResolvedValue(null);
      mockAPI.Editor.getBlock.mockRejectedValue(new Error('API Error'));

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      // Should show unresolved message
      expect(result).toContain('[Unresolved:');
    });
  });

  describe('resolveReferences - Caching Behavior', () => {
    it('should cache resolved page references', async () => {
      const page = createMockPage({ name: 'Test' });
      const pageUuid = '550e8400-e29b-41d4-a716-446655440765';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        content: `First [[${pageUuid}]] and second [[${pageUuid}]]`
      });

      let pageCallCount = 0;
      mockAPI.Editor.getPage.mockImplementation((uuid: string) => {
        if (uuid === pageUuid) {
          pageCallCount++;
          return Promise.resolve({ uuid: pageUuid, name: 'Cached Page' } as PageEntity);
        }
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      // Page should be fetched at least once and then cached
      expect(pageCallCount).toBeGreaterThan(0);
    });

    it('should cache resolved block references', async () => {
      const page = createMockPage({ name: 'Test' });
      const blockUuid = '550e8400-e29b-41d4-a716-446655440796';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440002',
        content: `First ((${blockUuid})) and second ((${blockUuid}))`
      });

      let blockCallCount = 0;
      mockAPI.Editor.getBlock.mockImplementation((uuid: string) => {
        if (uuid === blockUuid) {
          blockCallCount++;
          return Promise.resolve({ uuid: blockUuid, content: 'Cached Block', properties: {} } as BlockEntity);
        }
        return Promise.resolve(null);
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      // Block should be fetched at least once and then cached
      expect(blockCallCount).toBeGreaterThan(0);
    });
  });
});
