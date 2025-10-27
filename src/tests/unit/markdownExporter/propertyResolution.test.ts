import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter } from '../../../markdownExporter';
import type { PageEntity, BlockEntity } from '@logseq/libs/dist/LSPlugin';
import {
  createMockLogseqAPI,
  createMockBlock,
  setupGlobalMocks,
  resetAllMocks,
  type MockLogseqAPI,
  type MockFileAPI,
  type MockDOMHelpers,
} from '../../test-utils';

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('jszip', () => {
  const mockFile = vi.fn().mockReturnThis();
  const mockFolder = vi.fn(() => ({ file: mockFile }));
  return {
    default: vi.fn(() => ({
      file: mockFile,
      folder: mockFolder,
      generateAsync: vi.fn().mockResolvedValue(new Blob(['test'])),
    })),
  };
});

describe('MarkdownExporter - Property and db/id Resolution', () => {
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

  describe('Property Structure - Root Level Colon-Prefixed Keys', () => {
    it('should handle properties at root level with colon prefixes', async () => {
      // This is the CORRECT structure that Logseq actually returns
      const pageWithRootLevelProps = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        updatedAt: 1738211909658,
        createdAt: 1738211909658,
        // Properties are at ROOT level with colons, NOT nested under .properties
        ':user.property/title-abc123': 'My Article Title',
        ':user.property/author-def456': 'John Doe',
        tags: [135, 138], // db/id references
        ':logseq.property/status': 73,
      } as unknown as PageEntity;

      mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithRootLevelProps);
      mockAPI.Editor.getPage.mockResolvedValue(pageWithRootLevelProps);
      mockAPI.getPage.mockResolvedValue(pageWithRootLevelProps);
      mockAPI.getCurrentPage.mockResolvedValue(pageWithRootLevelProps);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      // Mock property name mappings
      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/title-abc123', 'title'],
            [':user.property/author-def456', 'author'],
          ];
        }
        // Mock UUID collection queries (should find nothing to skip)
        if (query.includes(':block/uuid')) {
          return [];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: false,
      });

      expect(result).toContain('---');
      expect(result).toContain('title: My Article Title');
      expect(result).toContain('author: John Doe');
    });
  });

  describe('Numeric db/id Resolution', () => {
    it('should resolve numeric db/id values to their content', async () => {
      const pageWithDbIds = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        ':user.property/publishDate-xyz': 819, // db/id reference
        ':user.property/blogtitle-abc': 45116, // db/id reference
        ':user.property/url-def': 45110, // db/id reference
      } as unknown as PageEntity;

      mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithDbIds);
      mockAPI.Editor.getPage.mockResolvedValue(pageWithDbIds);
      mockAPI.getPage.mockResolvedValue(pageWithDbIds);
      mockAPI.getCurrentPage.mockResolvedValue(pageWithDbIds);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        // Property name mappings
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/publishDate-xyz', 'publishDate'],
            [':user.property/blogtitle-abc', 'blogtitle'],
            [':user.property/url-def', 'url'],
          ];
        }

        // CRITICAL: Use correct DataScript syntax [dbId :attribute ?var]
        // NOT [?e :db/id dbId] which causes "Cannot parse binding" errors
        if (query.includes('[819 :block/title')) {
          return [['2025-09-23']];
        }
        if (query.includes('[819 :block/content')) {
          return [['2025-09-23']];
        }
        if (query.includes('[45116 :block/title')) {
          return [['Central Pacific Update']];
        }
        if (query.includes('[45116 :block/content')) {
          return [['Central Pacific Update']];
        }
        if (query.includes('[45110 :block/title')) {
          return [['https://briansunter.com/central-pacific-update']];
        }
        if (query.includes('[45110 :block/content')) {
          return [['https://briansunter.com/central-pacific-update']];
        }

        // UUID collection queries
        if (query.includes(':block/uuid')) {
          return [];
        }

        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: false,
      });

      expect(result).toContain('---');
      expect(result).toContain('publishDate: 2025-09-23');
      expect(result).toContain('blogtitle: Central Pacific Update');
      expect(result).toContain('url: https://briansunter.com/central-pacific-update');
      // Should NOT contain raw db/ids
      expect(result).not.toContain('publishDate: 819');
      expect(result).not.toContain('blogtitle: 45116');
      expect(result).not.toContain('url: 45110');
    });

    it('should handle db/id values that cannot be resolved', async () => {
      const pageWithUnresolvableDbId = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        ':user.property/mystery-prop': 99999, // db/id that doesn't exist
      } as unknown as PageEntity;

      mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithUnresolvableDbId);
      mockAPI.Editor.getPage.mockResolvedValue(pageWithUnresolvableDbId);
      mockAPI.getPage.mockResolvedValue(pageWithUnresolvableDbId);
      mockAPI.getCurrentPage.mockResolvedValue(pageWithUnresolvableDbId);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [[':user.property/mystery-prop', 'mystery']];
        }
        // No results for the mystery db/id
        if (query.includes('[99999')) {
          return [];
        }
        if (query.includes(':block/uuid')) {
          return [];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: false,
      });

      // Should fall back to the raw value if resolution fails
      expect(result).toContain('mystery: 99999');
    });
  });

  describe('Tag Resolution from db/ids', () => {
    it('should resolve tag db/ids to tag names', async () => {
      const pageWithTagDbIds = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        tags: [135, 138, 27350], // Array of db/id references
        ':user.property/blogTags-xyz': [45204, 45205, 47532], // More db/id references
      } as unknown as PageEntity;

      mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithTagDbIds);
      mockAPI.Editor.getPage.mockResolvedValue(pageWithTagDbIds);
      mockAPI.getPage.mockResolvedValue(pageWithTagDbIds);
      mockAPI.getCurrentPage.mockResolvedValue(pageWithTagDbIds);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title :where')) {
          return [[':user.property/blogTags-xyz', 'blogTags']];
        }

        // Resolve tags
        if (query.includes('[135 :block/title')) return [['newsletter']];
        if (query.includes('[138 :block/title')) return [['public']];
        if (query.includes('[27350 :block/title')) return [['fitness']];

        // Resolve blogTags
        if (query.includes('[45204 :block/title')) return [['blog']];
        if (query.includes('[45205 :block/title')) return [['AI']];
        if (query.includes('[47532 :block/title')) return [['coding']];

        // UUID collection for filtering
        if (query.includes(':block/uuid')) {
          // Simulate collecting UUIDs for these property value blocks
          if (query.includes('[135 :block/uuid')) return [['uuid-135']];
          if (query.includes('[138 :block/uuid')) return [['uuid-138']];
          if (query.includes('[27350 :block/uuid')) return [['uuid-27350']];
          if (query.includes('[45204 :block/uuid')) return [['uuid-45204']];
          if (query.includes('[45205 :block/uuid')) return [['uuid-45205']];
          if (query.includes('[47532 :block/uuid')) return [['uuid-47532']];
        }

        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: false,
      });

      expect(result).toContain('tags:');
      expect(result).toContain('- newsletter');
      expect(result).toContain('- public');
      expect(result).toContain('- fitness');
      expect(result).toContain('- blog');
      expect(result).toContain('- AI');
      expect(result).toContain('- coding');
      // Should NOT contain raw db/ids in tags
      expect(result).not.toContain('- 135');
      expect(result).not.toContain('- 45204');
    });

    it('should merge tags and blogTags without duplicates', async () => {
      const pageWithDuplicateTags = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        tags: [100, 101], // 'tech', 'javascript'
        ':user.property/blogTags-xyz': [101, 102], // 'javascript' (duplicate), 'typescript'
      } as unknown as PageEntity;

      mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithDuplicateTags);
      mockAPI.Editor.getPage.mockResolvedValue(pageWithDuplicateTags);
      mockAPI.getPage.mockResolvedValue(pageWithDuplicateTags);
      mockAPI.getCurrentPage.mockResolvedValue(pageWithDuplicateTags);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title :where')) {
          return [[':user.property/blogTags-xyz', 'blogTags']];
        }

        if (query.includes('[100 :block/title')) return [['tech']];
        if (query.includes('[101 :block/title')) return [['javascript']];
        if (query.includes('[102 :block/title')) return [['typescript']];

        if (query.includes(':block/uuid')) {
          if (query.includes('[100 :block/uuid')) return [['uuid-100']];
          if (query.includes('[101 :block/uuid')) return [['uuid-101']];
          if (query.includes('[102 :block/uuid')) return [['uuid-102']];
        }

        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: false,
      });

      // Count occurrences of 'javascript' - should only appear once
      const javascriptMatches = result.match(/- javascript/g);
      expect(javascriptMatches).toHaveLength(1);
      expect(result).toContain('- tech');
      expect(result).toContain('- typescript');
    });
  });

  describe('Property Value Block Filtering', () => {
    it('should filter out property value blocks from export body', async () => {
      const pageWithPropertyBlocks = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        ':user.property/blogTags-xyz': [45204, 45205], // These create blocks
        ':user.property/url-abc': 45110,
      } as unknown as PageEntity;

      const propertyValueBlocks: BlockEntity[] = [
        createMockBlock({ uuid: 'uuid-45204', content: 'blog' }), // Property value block
        createMockBlock({ uuid: 'uuid-45205', content: 'fitness' }), // Property value block
        createMockBlock({ uuid: 'uuid-45110', content: 'https://example.com' }), // Property value block
        createMockBlock({ uuid: 'real-content-uuid', content: 'This is actual page content' }), // Real content
      ];

      mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithPropertyBlocks);
      mockAPI.Editor.getPage.mockResolvedValue(pageWithPropertyBlocks);
      mockAPI.getPage.mockResolvedValue(pageWithPropertyBlocks);
      mockAPI.getCurrentPage.mockResolvedValue(pageWithPropertyBlocks);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue(propertyValueBlocks);
      mockAPI.getPageBlocksTree.mockResolvedValue(propertyValueBlocks);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title :where')) {
          return [
            [':user.property/blogTags-xyz', 'blogTags'],
            [':user.property/url-abc', 'url'],
          ];
        }

        // Resolve tag names for frontmatter
        if (query.includes('[45204 :block/title')) return [['blog']];
        if (query.includes('[45205 :block/title')) return [['fitness']];
        if (query.includes('[45110 :block/title')) return [['https://example.com']];

        // UUID collection - these UUIDs should be filtered out
        if (query.includes(':block/uuid')) {
          if (query.includes('[45204 :block/uuid')) return [['uuid-45204']];
          if (query.includes('[45205 :block/uuid')) return [['uuid-45205']];
          if (query.includes('[45110 :block/uuid')) return [['uuid-45110']];
        }

        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: true,
      });

      // Should contain actual content
      expect(result).toContain('This is actual page content');

      // Should NOT contain property value blocks in the body
      const bodyMatch = result.match(/---\n\n(.+)$/s);
      if (bodyMatch) {
        const body = bodyMatch[1];
        expect(body).not.toContain('\nblog\n');
        expect(body).not.toContain('\nfitness\n');
        expect(body).not.toContain('\nhttps://example.com\n');
      }

      // But SHOULD contain tags in frontmatter
      const frontmatterMatch = result.match(/---\n(.+?)\n---/s);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        expect(frontmatter).toContain('blog');
        expect(frontmatter).toContain('fitness');
      }
    });

    it('should handle pages with no property value blocks', async () => {
      const simplePage = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Simple Page',
        originalName: 'Simple Page',
        'journal?': false,
      } as unknown as PageEntity;

      const normalBlocks: BlockEntity[] = [
        createMockBlock({ uuid: 'block-1', content: 'First paragraph' }),
        createMockBlock({ uuid: 'block-2', content: 'Second paragraph' }),
      ];

      mockAPI.Editor.getCurrentPage.mockResolvedValue(simplePage);
      mockAPI.Editor.getPage.mockResolvedValue(simplePage);
      mockAPI.getPage.mockResolvedValue(simplePage);
      mockAPI.getCurrentPage.mockResolvedValue(simplePage);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue(normalBlocks);
      mockAPI.getPageBlocksTree.mockResolvedValue(normalBlocks);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        // No properties to map
        if (query.includes('[:find ?prop-key ?prop-title :where')) {
          return [];
        }
        // No UUIDs to skip
        if (query.includes(':block/uuid')) {
          return [];
        }
        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: false,
        includePageName: true,
      });

      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
      expect(result).not.toContain('---'); // No frontmatter
    });
  });

  describe('DataScript Query Syntax Validation', () => {
    it('should NOT use [?e :db/id dbId] syntax which causes parse errors', async () => {
      const pageWithDbId = {
        uuid: 'test-page-uuid',
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        'journal?': false,
        ':user.property/another-prop': 99999,
      } as unknown as PageEntity;

      mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithDbId);
      mockAPI.Editor.getPage.mockResolvedValue(pageWithDbId);
      mockAPI.getPage.mockResolvedValue(pageWithDbId);
      mockAPI.getCurrentPage.mockResolvedValue(pageWithDbId);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getPageBlocksTree.mockResolvedValue([]);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        if (query.includes('[:find ?prop-key ?prop-title :where')) {
          return [[':user.property/another-prop', 'anotherProp']];
        }

        // Verify we NEVER see the incorrect syntax
        expect(query).not.toContain(':db/id 99999');
        expect(query).not.toContain('[?e :db/id');

        if (query.includes('[99999')) {
          // Correct syntax should be used
          expect(query).toMatch(/\[99999 :/);
          return [];
        }

        if (query.includes(':block/uuid')) {
          return [];
        }

        return [];
      });

      await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: false,
      });
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete real-world page with all property types', async () => {
      const realWorldPage = {
        uuid: '679b0245-582a-4ff3-b13d-81bd8db0dfcb',
        id: 36485,
        name: 'central pacific update',
        originalName: 'central pacific update',
        'journal?': false,
        updatedAt: 1761556235265,
        createdAt: 1738211909658,
        ':logseq.property/status': 73,
        tags: [135, 138, 27350, 36755],
        ':user.property/blogTags-Mx0ii3sb': [45204, 45205, 47532, 47533],
        ':user.property/publishDate-kRxfHtUv': 819,
        ':logseq.property/description': 45312,
        ':user.property/blogPhase-kMp_wFlD': 38488,
        ':user.property/appState-MQ0Sgn1c': 42826,
        ':user.property/su9f7RGPa_ey2_N3I3wqd-rating': 9,
        ':user.property/q2helqDgR_XPJqNQCRN2O-url': 45110,
        ':user.property/bogtitle-FiJnwhpb': 45116,
        ':user.property/coverimage-wTuZyU8U': 47526,
      } as unknown as PageEntity;

      const pageBlocks: BlockEntity[] = [
        createMockBlock({ uuid: 'content-1', content: 'This is actual blog content' }),
        createMockBlock({ uuid: 'content-2', content: 'More actual content' }),
        // Property value blocks that should be filtered
        createMockBlock({ uuid: 'uuid-45204', content: 'newsletter' }),
        createMockBlock({ uuid: 'uuid-45205', content: 'fitness' }),
        createMockBlock({ uuid: 'uuid-47532', content: 'blog' }),
        createMockBlock({ uuid: 'uuid-47533', content: 'AI' }),
      ];

      mockAPI.Editor.getCurrentPage.mockResolvedValue(realWorldPage);
      mockAPI.Editor.getPage.mockResolvedValue(realWorldPage);
      mockAPI.getPage.mockResolvedValue(realWorldPage);
      mockAPI.getCurrentPage.mockResolvedValue(realWorldPage);
      mockAPI.Editor.getPageBlocksTree.mockResolvedValue(pageBlocks);
      mockAPI.getPageBlocksTree.mockResolvedValue(pageBlocks);
      mockAPI.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });
      mockAPI.App.getCurrentGraph.mockResolvedValue({ path: '/test/graph' });

      mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
        // Property mappings
        if (query.includes('[:find ?prop-key ?prop-title')) {
          return [
            [':user.property/blogTags-Mx0ii3sb', 'blogTags'],
            [':user.property/publishDate-kRxfHtUv', 'publishDate'],
            [':user.property/bogtitle-FiJnwhpb', 'blogtitle'],
            [':user.property/q2helqDgR_XPJqNQCRN2O-url', 'url'],
            [':user.property/su9f7RGPa_ey2_N3I3wqd-rating', 'rating'],
            [':user.property/blogPhase-kMp_wFlD', 'blogPhase'],
            [':user.property/appState-MQ0Sgn1c', 'outputState'],
            [':user.property/coverimage-wTuZyU8U', 'coverimage'],
            [':logseq.property/description', 'description'],
          ];
        }

        // Tag resolutions
        if (query.includes('[135 :block/title')) return [['Page']];
        if (query.includes('[138 :block/title')) return [['Task']];
        if (query.includes('[27350 :block/title')) return [['newsletter']];
        if (query.includes('[36755 :block/title')) return [['public']];
        if (query.includes('[45204 :block/title')) return [['newsletter']];
        if (query.includes('[45205 :block/title')) return [['fitness']];
        if (query.includes('[47532 :block/title')) return [['blog']];
        if (query.includes('[47533 :block/title')) return [['AI']];

        // Property value resolutions
        if (query.includes('[819 :block/title')) return [['2025-09-23']];
        if (query.includes('[45110 :block/title'))
          return [['https://briansunter.com/central-pacific-update']];
        if (query.includes('[45116 :block/title')) return [['Central Pacific Update']];
        if (query.includes('[9 :block/title')) return []; // Numeric rating, can't resolve
        if (query.includes('[9 :block/content')) return [];

        // UUID collection for filtering
        if (query.includes(':block/uuid')) {
          if (query.includes('[45204 :block/uuid')) return [['uuid-45204']];
          if (query.includes('[45205 :block/uuid')) return [['uuid-45205']];
          if (query.includes('[47532 :block/uuid')) return [['uuid-47532']];
          if (query.includes('[47533 :block/uuid')) return [['uuid-47533']];
        }

        return [];
      });

      const result = await exporter.exportCurrentPage({
        includeProperties: true,
        includePageName: true,
      });

      // Verify frontmatter has resolved values
      expect(result).toContain('publishDate: 2025-09-23');
      expect(result).toContain('blogtitle: Central Pacific Update');
      expect(result).toContain('url: https://briansunter.com/central-pacific-update');
      expect(result).toContain('rating: 9');

      // Verify tags are merged and deduplicated
      expect(result).toContain('tags:');
      expect(result).toContain('- newsletter');
      expect(result).toContain('- fitness');
      expect(result).toContain('- blog');
      expect(result).toContain('- AI');

      // Verify actual content is present
      expect(result).toContain('This is actual blog content');
      expect(result).toContain('More actual content');

      // Verify property value blocks are NOT in body
      const bodyMatch = result.match(/---\n\n(.+)$/s);
      if (bodyMatch) {
        const body = bodyMatch[1];
        // Property values should not appear as standalone blocks in body
        expect(body).not.toContain('\nnewsletter\n\nfitness\n');
      }

      // Should NOT contain raw db/ids
      expect(result).not.toContain('publishDate: 819');
      expect(result).not.toContain('blogtitle: 45116');
      expect(result).not.toContain('url: 45110');
    });
  });
});
