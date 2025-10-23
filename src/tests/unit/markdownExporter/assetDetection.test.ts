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
  setupAssetMocking,
  type MockLogseqAPI,
  type MockFileAPI,
  type MockDOMHelpers
} from '../../test-utils';
import { vi } from 'vitest';

describe('MarkdownExporter - Asset Detection and Tracking', () => {
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

  describe('detectAsset - DataScript Query Detection', () => {
    it('should detect asset via DataScript query with type', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'abcd1234-5678-90ab-cdef-123456789abc';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440055',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'png', title: 'Image' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(assetUuid)).toBe(true);
      expect(assets.get(assetUuid)?.type).toBe('png');
    });

    it('should detect image asset types (png, jpg, jpeg, gif, webp, svg, bmp)', async () => {
      const page = createMockPage({ name: 'Test' });
      const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];

      for (let i = 0; i < imageTypes.length; i++) {
        const type = imageTypes[i];
        // Use proper UUID format: must be hex digits only after dashes
        const assetUuid = `11111111-222${i}-3333-4444-555555555555`;

        setupAssetMocking(mockAPI, [
          { uuid: assetUuid, type, title: `Image ${type}` }
        ]);

        mockCurrentPageResponse(mockAPI, page);
        mockPageBlocksResponse(mockAPI, [createMockBlock({ uuid: '550e8400-e29b-41d4-a716-446655440088', content: assetUuid })]);
        mockGraphResponse(mockAPI, '/test/graph');

        const result = await exporter.exportCurrentPage({
          ...DEFAULT_OPTIONS,
          includePageName: false,
          includeProperties: false,
          resolvePlainUuids: true
        });

        // Should create image markdown with !
        expect(result).toContain(`![`);
      }
    });

    it('should detect non-image asset types (pdf, doc, etc)', async () => {
      const page = createMockPage({ name: 'Test' });
      const docTypes = ['pdf', 'doc', 'docx', 'txt', 'zip'];

      for (let i = 0; i < docTypes.length; i++) {
        const type = docTypes[i];
        const assetUuid = `22222222-333${i}-4444-5555-666666666666`;

        setupAssetMocking(mockAPI, [
          { uuid: assetUuid, type, title: 'Document' }
        ]);

        mockCurrentPageResponse(mockAPI, page);
        mockPageBlocksResponse(mockAPI, [createMockBlock({ uuid: '550e8400-e29b-41d4-a716-446655440088', content: assetUuid })]);
        mockGraphResponse(mockAPI, '/test/graph');

        const result = await exporter.exportCurrentPage({
          ...DEFAULT_OPTIONS,
          includePageName: false,
          includeProperties: false,
          resolvePlainUuids: true
        });

        // Should create regular link without !
        expect(result).toContain(`[Document](assets/${assetUuid}.${type})`);
        expect(result).not.toContain(`![Document]`);
      }
    });

    it('should return null when DataScript query returns empty result', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = 'c1111111-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: uuid
      });

      mockAPI.DB.datascriptQuery.mockResolvedValue([]);
      mockAPI.Editor.getPage.mockResolvedValue(null);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(uuid)).toBe(false);
    });

    it('should handle DataScript query errors gracefully', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = 'c2222222-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: uuid
      });

      mockAPI.DB.datascriptQuery.mockRejectedValue(new Error('Query failed'));
      mockAPI.Editor.getPage.mockResolvedValue(null);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      await expect(
        exporter.exportCurrentPage({
          ...DEFAULT_OPTIONS,
          includePageName: false,
          includeProperties: false,
          resolvePlainUuids: true
        })
      ).resolves.toBeTruthy();
    });
  });

  describe('detectAsset - Page Properties Detection', () => {
    it('should detect asset via page properties', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'd1111111-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'pdf', title: 'Page Asset' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(assetUuid)).toBe(true);
    });

    it('should fallback to page check when DataScript fails', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'd2222222-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: `[[${assetUuid}]]`
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'jpg', title: 'Fallback Asset' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        preserveBlockRefs: true
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(assetUuid)).toBe(true);
    });

    it('should return null when page has no asset type', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid = 'd3333333-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: uuid
      });

      mockAPI.DB.datascriptQuery.mockResolvedValue([]);
      mockAPI.Editor.getPage.mockResolvedValue({
        uuid,
        name: 'Regular Page'
      } as PageEntity);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(uuid)).toBe(false);
    });
  });

  describe('createAssetLink - Asset Link Generation', () => {
    it('should create image markdown link with ! prefix', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e1111111-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'png', title: 'My Image' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      expect(result).toContain(`![My Image](assets/${assetUuid}.png)`);
    });

    it('should create non-image markdown link without ! prefix', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e2222222-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'pdf', title: 'My Doc' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      expect(result).toContain(`[My Doc](assets/${assetUuid}.pdf)`);
      expect(result).not.toContain('![My Doc]');
    });

    it('should use title from :block/title property', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e3333333-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'jpg', title: 'Title from :block/title' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      expect(result).toContain('Title from :block/title');
    });

    it('should use title from block/title property', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e4444444-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'png', title: 'Alternative Title' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      expect(result).toContain('Alternative Title');
    });

    it('should use name property as fallback', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e5555555-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'png', title: 'Name Property' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      expect(result).toContain('Name Property');
    });

    it('should use UUID-based fallback when no title available', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e6666666-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'jpg' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      expect(result).toContain(`asset-${assetUuid.substring(0, 8)}`);
    });

    it('should respect custom assetPath', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e7777777-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'png', title: 'Image' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        assetPath: 'images/',
        resolvePlainUuids: true
      });

      expect(result).toContain(`images/${assetUuid}.png`);
    });

    it('should add trailing slash to assetPath if missing', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'e8888888-1234-5678-90ab-cdef00000000';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'jpg' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        assetPath: 'media',
        resolvePlainUuids: true
      });

      expect(result).toContain(`media/${assetUuid}.jpg`);
    });
  });

  describe('Asset Tracking and Storage', () => {
    it('should track asset in referencedAssets map', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'f1111111-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'png', title: 'Tracked Asset' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(assetUuid)).toBe(true);

      const assetInfo = assets.get(assetUuid);
      expect(assetInfo?.uuid).toBe(assetUuid);
      expect(assetInfo?.type).toBe('png');
      expect(assetInfo?.title).toBe('Tracked Asset');
      expect(assetInfo?.exportPath).toBe(`assets/${assetUuid}.png`);
      expect(assetInfo?.originalPath).toContain(`/test/graph/assets/${assetUuid}.png`);
    });

    it('should track multiple assets from different blocks', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid1 = 'f2222222-1234-5678-90ab-cdef12345678';
      const uuid2 = 'f3333333-1234-5678-90ab-cdef12345678';
      const uuid3 = 'f4444444-1234-5678-90ab-cdef12345678';

      const blocks = [
        createMockBlock({ uuid: '550e8400-e29b-41d4-a716-446655440099', content: uuid1 }),
        createMockBlock({ uuid: 'block-2', content: uuid2 }),
        createMockBlock({ uuid: 'block-3', content: uuid3 })
      ];

      setupAssetMocking(mockAPI, [
        { uuid: uuid1, type: 'png' },
        { uuid: uuid2, type: 'jpg' },
        { uuid: uuid3, type: 'pdf' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, blocks);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.size).toBe(3);
      expect(assets.has(uuid1)).toBe(true);
      expect(assets.has(uuid2)).toBe(true);
      expect(assets.has(uuid3)).toBe(true);
    });

    it('should clear asset map between exports', async () => {
      const page = createMockPage({ name: 'Test' });
      const uuid1 = '550e8400-e29b-41d4-a716-111111111111';
      const uuid2 = '550e8400-e29b-41d4-a716-222222222222';

      setupAssetMocking(mockAPI, [
        { uuid: uuid1, type: 'png' },
        { uuid: uuid2, type: 'jpg' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [createMockBlock({ uuid: 'b1', content: uuid1 })]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      let assets = exporter.getReferencedAssets();
      expect(assets.has(uuid1)).toBe(true);
      expect(assets.size).toBe(1);

      // Second export
      mockPageBlocksResponse(mockAPI, [createMockBlock({ uuid: 'b2', content: uuid2 })]);

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      assets = exporter.getReferencedAssets();
      expect(assets.has(uuid1)).toBe(false);
      expect(assets.has(uuid2)).toBe(true);
      expect(assets.size).toBe(1);
    });
  });

  describe('trackAssets - Inline Asset Detection', () => {
    it('should track assets from markdown image syntax', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'f1111111-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: `![My Image](../assets/${assetUuid}.png)`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(assetUuid)).toBe(true);
      expect(assets.get(assetUuid)?.type).toBe('png');
      expect(assets.get(assetUuid)?.title).toBe('My Image');
    });

    it('should track assets from markdown link syntax', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'f5555555-1234-5678-90ab-cdef12345678';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: `[Document](../assets/${assetUuid}.pdf)`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.has(assetUuid)).toBe(true);
      expect(assets.get(assetUuid)?.type).toBe('pdf');
      expect(assets.get(assetUuid)?.title).toBe('Document');
    });

    it('should update asset paths to use configured assetPath', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'f2222222-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: `![Image](../assets/${assetUuid}.jpg)`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        assetPath: 'custom-assets/'
      });

      expect(result).toContain(`custom-assets/${assetUuid}.jpg`);
    });

    it('should extract asset extension from path', async () => {
      const page = createMockPage({ name: 'Test' });
      const extensions = ['png', 'jpg', 'pdf', 'webp', 'svg'];

      for (let i = 0; i < extensions.length; i++) {
        const ext = extensions[i];
        const assetUuid = `f000000${i}-1234-5678-90ab-cdef123456ab`;
        const block = createMockBlock({
          uuid: `block-${ext}`,
          content: `![](../assets/${assetUuid}.${ext})`
        });

        mockCurrentPageResponse(mockAPI, page);
        mockPageBlocksResponse(mockAPI, [block]);
        mockGraphResponse(mockAPI, '/test/graph');

        await exporter.exportCurrentPage({
          ...DEFAULT_OPTIONS,
          includePageName: false,
          includeProperties: false
        });

        const assets = exporter.getReferencedAssets();
        expect(assets.get(assetUuid)?.type).toBe(ext);
      }
    });

    it('should use UUID prefix as fallback title when title is empty', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'f6666666-1234-5678-90ab-cdef00000000';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: `![](../assets/${assetUuid}.png)`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.get(assetUuid)?.title).toBe(`asset-${assetUuid.substring(0, 8)}`);
    });

    it('should not duplicate assets already tracked', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'f8888888-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: `![First](../assets/${assetUuid}.png) and ![Second](../assets/${assetUuid}.png)`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false
      });

      const assets = exporter.getReferencedAssets();
      expect(assets.size).toBe(1);
      expect(assets.has(assetUuid)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid UUID format in asset path', async () => {
      const page = createMockPage({ name: 'Test' });
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: '![](../assets/not-a-valid-uuid.png)'
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false
      });

      expect(result).toContain('![](assets/not-a-valid-uuid.png)');
    });

    it('should handle assets with no extension', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'f9999999-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: `![](../assets/${assetUuid})`
      });

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);

      const result = await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false
      });

      expect(result).toContain(`assets/${assetUuid}`);
    });

    it('should handle graph path without trailing slash', async () => {
      const page = createMockPage({ name: 'Test' });
      const assetUuid = 'fa111111-1234-5678-90ab-cdef123456ab';
      const block = createMockBlock({
        uuid: '550e8400-e29b-41d4-a716-446655440099',
        content: assetUuid
      });

      setupAssetMocking(mockAPI, [
        { uuid: assetUuid, type: 'png' }
      ]);

      mockCurrentPageResponse(mockAPI, page);
      mockPageBlocksResponse(mockAPI, [block]);
      mockGraphResponse(mockAPI, '/test/graph');

      await exporter.exportCurrentPage({
        ...DEFAULT_OPTIONS,
        includePageName: false,
        includeProperties: false,
        resolvePlainUuids: true
      });

      const assets = exporter.getReferencedAssets();
      const asset = assets.get(assetUuid);
      expect(asset?.originalPath).toContain('/test/graph/assets/');
    });
  });
});
