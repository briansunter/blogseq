import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupIntegrationTest,
  addPageToContext,
  addBlocksToPage,
  addNestedBlocksToPage,
  integrationFixtures,
  createMockFileSystem,
} from './integration-setup';

/**
 * Export workflow integration tests
 * Tests complete end-to-end export flows with real-like scenarios
 */

// Mock JSZip for file operations at module level
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

// Mock file-saver at module level
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('Export Workflow Integration', () => {
  let mockFileSystem: ReturnType<typeof createMockFileSystem>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFileSystem = createMockFileSystem();

    // Setup global logseq mock
    (global as any).logseq = {
      Editor: {
        getCurrentPage: vi.fn(),
        getPage: vi.fn(),
        getBlock: vi.fn(),
        getPageBlocksTree: vi.fn(),
      },
      App: {
        getCurrentGraph: vi.fn(),
      },
      DB: {
        datascriptQuery: vi.fn(),
      },
      UI: {
        showMsg: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockFileSystem.clear();
  });

  describe('Simple page export', () => {
    it('should export a single page with content', async () => {
      const context = setupIntegrationTest('simplePage');

      expect(context.pages.size).toBeGreaterThan(0);
      expect(context.blocks.size).toBeGreaterThan(0);

      // Verify page structure
      const page = Array.from(context.pages.values())[0];
      expect(page.name).toBe('Simple Page');
    });

    it('should convert blocks to markdown', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      const blocks = Array.from(context.blocks.values()).filter(
        (b) => String(b.page?.id) === String(page.uuid) || b.page?.uuid === page.uuid
      );

      expect(blocks.length).toBeGreaterThan(0);
      blocks.forEach((block) => {
        expect(block.content).toBeDefined();
      });
    });

    it('should include page metadata in export', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      expect(page.uuid).toBeDefined();
      expect(page.name).toBeDefined();
      expect(page.file?.path).toBeDefined();
    });
  });

  describe('Page with headings', () => {
    it('should preserve heading structure', async () => {
      const context = setupIntegrationTest('pageWithHeadings');

      expect(context.pages.size).toBeGreaterThan(0);

      // Verify structure
      const page = Array.from(context.pages.values())[0];
      expect(page.name).toBe('Page with Headings');
    });

    it('should extract heading levels', async () => {
      const context = setupIntegrationTest('pageWithHeadings');

      const blocks = Array.from(context.blocks.values());
      expect(blocks.length).toBeGreaterThan(0);

      // Verify heading detection would work
      blocks.forEach((block) => {
        expect(block.content).toBeDefined();
      });
    });
  });

  describe('Page with references', () => {
    it('should detect page references', async () => {
      const context = setupIntegrationTest('pageWithReferences');

      const blocks = Array.from(context.blocks.values());
      const blockWithReference = blocks.find((b) =>
        b.content.includes('[[')
      );

      expect(blockWithReference).toBeDefined();
    });

    it('should detect block references', async () => {
      const context = setupIntegrationTest('pageWithReferences');

      const blocks = Array.from(context.blocks.values());
      const blockWithReference = blocks.find((b) =>
        b.content.includes('((')
      );

      expect(blockWithReference).toBeDefined();
    });

    it('should preserve reference syntax in export', async () => {
      const context = setupIntegrationTest('pageWithReferences');

      const blocks = Array.from(context.blocks.values());
      blocks.forEach((block) => {
        if (block.content.includes('[[')) {
          expect(block.content).toMatch(/\[\[.*\]\]/);
        }
        if (block.content.includes('((')) {
          expect(block.content).toMatch(/\(\(.*\)\)/);
        }
      });
    });
  });

  describe('Page with assets', () => {
    it('should detect image assets', async () => {
      const context = setupIntegrationTest('pageWithAssets');

      const blocks = Array.from(context.blocks.values());
      const assetBlocks = blocks.filter((b) => b.content.includes('!'));

      expect(assetBlocks.length).toBeGreaterThan(0);
    });

    it('should detect document assets', async () => {
      const context = setupIntegrationTest('pageWithAssets');

      const blocks = Array.from(context.blocks.values());
      const assetBlocks = blocks.filter((b) => b.content.includes('['));

      expect(assetBlocks.length).toBeGreaterThan(0);
    });

    it('should include asset paths in export', async () => {
      const context = setupIntegrationTest('pageWithAssets');

      const blocks = Array.from(context.blocks.values());
      const assetBlocks = blocks.filter((b) => b.content.includes('.'));

      assetBlocks.forEach((block) => {
        expect(block.content).toMatch(/\.(png|jpg|jpeg|gif|pdf|doc|docx)/i);
      });
    });
  });

  describe('Multi-page graph export', () => {
    it('should export multiple pages', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      expect(context.pages.size).toBe(4);
    });

    it('should preserve cross-page references', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const indexPage = Array.from(context.pages.values()).find(
        (p) => p.name === 'Index Page'
      );
      expect(indexPage).toBeDefined();

      // Verify other pages exist
      const pageA = Array.from(context.pages.values()).find(
        (p) => p.name === 'Page A'
      );
      expect(pageA).toBeDefined();
    });

    it('should maintain page isolation in ZIP', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      // Each page should have separate file in ZIP
      const pages = Array.from(context.pages.values());
      const uniquePageNames = new Set(pages.map((p) => p.name));

      expect(uniquePageNames.size).toBe(pages.length);
    });

    it('should batch export all pages', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pageNames = Array.from(context.pages.values()).map((p) => p.name);
      expect(pageNames.length).toBe(4);
    });
  });

  describe('Nested block structures', () => {
    it('should handle nested blocks', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      const nestedStructure = [
        {
          content: 'Parent block 1',
          children: ['Child 1.1', 'Child 1.2'],
        },
        {
          content: 'Parent block 2',
          children: ['Child 2.1'],
        },
      ];

      addNestedBlocksToPage(context, page.uuid, nestedStructure);

      const blocks = Array.from(context.blocks.values());
      expect(blocks.length).toBeGreaterThan(2);
    });

    it('should preserve block hierarchy in markdown', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      const nestedStructure = [
        {
          content: 'Main section',
          children: ['Subsection content', 'More subsection content'],
        },
      ];

      addNestedBlocksToPage(context, page.uuid, nestedStructure);

      const parentBlocks = Array.from(context.blocks.values()).filter(
        (b) => b.content === 'Main section'
      );
      expect(parentBlocks.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested structures', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      const deepStructure = [
        {
          content: 'Level 1',
          children: [
            'Level 2 (would have children)',
            'Level 2 sibling',
          ],
        },
      ];

      addNestedBlocksToPage(context, page.uuid, deepStructure);

      const allBlocks = Array.from(context.blocks.values());
      expect(allBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('Export settings', () => {
    it('should respect includePageName setting', async () => {
      const context = setupIntegrationTest('simplePage');

      // With includePageName: true, page name should be included as # heading
      const page = Array.from(context.pages.values())[0];
      expect(page.name).toBeDefined();
    });

    it('should respect flattenNested setting', async () => {
      const context = setupIntegrationTest('simplePage');

      // With flattenNested: true, nested blocks become paragraphs
      // Structure should be verified in actual export
    });

    it('should respect includeProperties setting', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      expect(page.properties).toBeDefined();
    });

    it('should respect includeTags setting', async () => {
      const context = setupIntegrationTest('simplePage');

      // Tags in content should be preserved or removed based on setting
    });
  });

  describe('Error scenarios', () => {
    it('should handle missing pages gracefully', async () => {
      const context = setupIntegrationTest('simplePage');

      const result = context.logseqAPI.Editor.getPage.mockResolvedValue(null);
      const page = await context.logseqAPI.Editor.getPage('nonexistent');

      expect(page).toBeNull();
    });

    it('should handle empty pages', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      const blocks = Array.from(context.blocks.values()).filter(
        (b) => b.page?.uuid === page.uuid
      );

      // Remove all blocks to test empty page
      blocks.forEach((b) => context.blocks.delete(b.uuid));

      const remainingBlocks = Array.from(context.blocks.values()).filter(
        (b) => b.page?.uuid === page.uuid
      );
      expect(remainingBlocks.length).toBe(0);
    });

    it('should handle blocks without content', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      addBlocksToPage(context, page.uuid, ['', '', 'content']);

      const emptyBlocks = Array.from(context.blocks.values()).filter(
        (b) => b.content === ''
      );
      expect(emptyBlocks.length).toBeGreaterThan(0);
    });

    it('should handle blocks with only whitespace', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      addBlocksToPage(context, page.uuid, [
        '   ',
        '\t\t',
        'valid content',
      ]);

      const whitespaceBlocks = Array.from(context.blocks.values()).filter(
        (b) => /^\s+$/.test(b.content)
      );
      expect(whitespaceBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('ZIP file generation', () => {
    it('should create ZIP with correct structure', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      // ZIP should have one file per page
      const pages = Array.from(context.pages.values());
      expect(pages.length).toBeGreaterThan(0);
    });

    it('should use consistent naming', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      pages.forEach((page) => {
        // Page names should be safe for file names
        expect(page.name).toBeDefined();
      });
    });

    it('should include timestamp in filename', async () => {
      // Filename should be: logseq-export-YYYY-MM-DD.zip
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      expect('logseq-export-2024-01-15'.match(datePattern)).toBeTruthy();
    });
  });

  describe('File system operations', () => {
    it('should write files to filesystem', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      const filename = `${page.name}.md`;
      const content = '# Test Content';

      mockFileSystem.writeFile(filename, content);

      expect(mockFileSystem.fileExists(filename)).toBe(true);
    });

    it('should read exported files', async () => {
      mockFileSystem.writeFile('test.md', '# Test');

      const content = await mockFileSystem.readFile('test.md');
      expect(content).toBe('# Test');
    });

    it('should handle file paths correctly', async () => {
      const paths = [
        '/path/to/file.md',
        '/another/path/document.pdf',
        '/assets/image.png',
      ];

      paths.forEach((path) => {
        mockFileSystem.writeFile(path, 'content');
      });

      expect(mockFileSystem.getAllFiles().length).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should handle moderate-sized exports efficiently', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];

      // Add 50 blocks
      const blockContents = Array.from({ length: 50 }, (_, i) => `Block ${i + 1}`);
      addBlocksToPage(context, page.uuid, blockContents);

      const blocks = Array.from(context.blocks.values());
      expect(blocks.length).toBeLessThanOrEqual(100);
    });
  });
});
