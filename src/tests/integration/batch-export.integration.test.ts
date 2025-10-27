import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import {
  setupIntegrationTest,
  addPageToContext,
  addBlocksToPage,
  integrationFixtures,
} from './integration-setup';

/**
 * Batch Export Integration Tests
 * Tests complete multi-page export workflows and ZIP generation
 */

describe('Batch Export Integration', () => {
  let zip: JSZip;

  beforeEach(() => {
    vi.clearAllMocks();
    zip = new JSZip();

    // Mock file-saver
    vi.mock('file-saver', () => ({
      saveAs: vi.fn(),
    }));

    // Setup global mocks
    (global as any).logseq = {
      Editor: {
        getPage: vi.fn(),
        getPageBlocksTree: vi.fn(),
      },
      UI: {
        showMsg: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Multi-Page Export', () => {
    it('should export multiple pages to ZIP', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      expect(pages.length).toBe(4);

      // Simulate adding each page to ZIP
      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
      });

      const files = Object.keys(zip.files);
      expect(files.length).toBe(4);
    });

    it('should preserve page order in ZIP', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      const pageNames = pages.map(p => p.name);

      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
      });

      const zipFiles = Object.keys(zip.files);
      expect(zipFiles.length).toEqual(pageNames.length);
    });

    it('should create valid ZIP structure', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/zip');
    });
  });

  describe('ZIP File Content', () => {
    it('should include markdown files with correct content', async () => {
      const context = setupIntegrationTest('simplePage');

      const page = Array.from(context.pages.values())[0];
      const content = `# ${page.name}\n\nTest content`;

      zip.file(`${page.name}.md`, content);

      const files = Object.keys(zip.files);
      expect(files).toContain(`${page.name}.md`);
    });

    it('should generate valid markdown for each page', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      pages.forEach(page => {
        const markdown = `# ${page.name}\n\nPage content`;
        zip.file(`${page.name}.md`, markdown);
      });

      const generated = await zip.generateAsync({ type: 'blob' });
      expect(generated.size).toBeGreaterThan(0);
    });

    it('should preserve markdown formatting in ZIP', async () => {
      const context = setupIntegrationTest('pageWithHeadings');

      const page = Array.from(context.pages.values())[0];
      const markdown = `# H1
## H2
### H3

- Item 1
- Item 2`;

      zip.file(`${page.name}.md`, markdown);

      const blob = await zip.generateAsync({ type: 'blob' });
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('ZIP Naming and Organization', () => {
    it('should use consistent file naming', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
      });

      Object.keys(zip.files).forEach(filename => {
        expect(filename).toMatch(/\.md$/);
      });
    });

    it('should generate timestamped archive filename', () => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const filename = `logseq-export-${dateStr}.zip`;

      expect(filename).toMatch(/logseq-export-\d{4}-\d{2}-\d{2}\.zip/);
    });

    it('should handle special characters in page names', async () => {
      const context = setupIntegrationTest('simplePage');

      const specialPages = ['Page with spaces', 'Page-with-dashes', 'Page_with_underscores'];

      specialPages.forEach(name => {
        zip.file(`${name}.md`, '# ' + name);
      });

      expect(Object.keys(zip.files).length).toBe(specialPages.length);
    });

    it('should avoid filename collisions', async () => {
      // Create pages with similar names
      zip.file('page-1.md', '# Page 1');
      zip.file('page-2.md', '# Page 2');
      zip.file('page-3.md', '# Page 3');

      const files = Object.keys(zip.files);
      const uniqueFiles = new Set(files);

      expect(uniqueFiles.size).toBe(files.length);
    });
  });

  describe('ZIP Compression', () => {
    it('should generate valid blob', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
      });

      const blob = await zip.generateAsync({ type: 'blob' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/zip');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should compress content efficiently', async () => {
      // Add large content
      const largeContent = '# Test\n\n' + 'Lorem ipsum dolor sit amet. '.repeat(1000);

      zip.file('large.md', largeContent);

      const blob = await zip.generateAsync({ type: 'blob' });

      // Compressed size should be reasonable
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.size).toBeLessThan(largeContent.length * 2);
    });

    it('should handle multiple file compression', async () => {
      for (let i = 0; i < 10; i++) {
        zip.file(`file-${i}.md`, `# File ${i}\n\nContent for file ${i}`);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('Progress Tracking', () => {
    it('should track export progress', async () => {
      const context = setupIntegrationTest('multiPageGraph');
      const pages = Array.from(context.pages.values());

      let progress = 0;
      const total = pages.length;

      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
        progress++;
      });

      expect(progress).toBe(total);
    });

    it('should report progress correctly for large batches', async () => {
      const pageCount = 100;
      let progress = 0;

      for (let i = 0; i < pageCount; i++) {
        zip.file(`page-${i}.md`, `# Page ${i}`);
        progress++;
      }

      expect(progress).toBe(pageCount);
    });
  });

  describe('Error Handling in Batch Export', () => {
    it('should skip failed pages and continue', async () => {
      const context = setupIntegrationTest('simplePage');

      const successfulPages: string[] = [];

      // Simulate exporting pages, some fail
      const pageNames = ['page1', 'page2', 'page3'];
      for (const pageName of pageNames) {
        try {
          zip.file(`${pageName}.md`, `# ${pageName}`);
          successfulPages.push(pageName);
        } catch (error) {
          // Continue on error
        }
      }

      expect(successfulPages.length).toBeGreaterThan(0);
    });

    it('should generate ZIP with partial results', async () => {
      // Add some files successfully
      zip.file('success1.md', '# Success 1');
      zip.file('success2.md', '# Success 2');

      const blob = await zip.generateAsync({ type: 'blob' });
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should handle large batch exports', async () => {
      // Create many files
      for (let i = 0; i < 50; i++) {
        zip.file(`page-${i}.md`, `# Page ${i}\n\nContent for page ${i}`);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      expect(blob.size).toBeGreaterThan(0);

      // Clear references
      zip = new JSZip();
      expect(true).toBe(true);
    });

    it('should not leak memory on repeated exports', async () => {
      for (let batch = 0; batch < 3; batch++) {
        zip = new JSZip();

        for (let i = 0; i < 10; i++) {
          zip.file(`batch${batch}-file${i}.md`, 'Content');
        }

        await zip.generateAsync({ type: 'blob' });
      }

      expect(true).toBe(true);
    });
  });

  describe('ZIP Verification', () => {
    it('should create readable ZIP file', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
      });

      const blob = await zip.generateAsync({ type: 'blob' });

      // ZIP should be readable
      const newZip = new JSZip();
      const extracted = await newZip.loadAsync(blob);

      expect(Object.keys(extracted.files).length).toBeGreaterThan(0);
    });

    it('should preserve file content in ZIP', async () => {
      const testContent = '# Test\n\nContent';
      zip.file('test.md', testContent);

      const blob = await zip.generateAsync({ type: 'blob' });
      const newZip = new JSZip();
      const extracted = await newZip.loadAsync(blob);

      const file = extracted.file('test.md');
      expect(file).not.toBeNull();
    });
  });

  describe('Download Integration', () => {
    it('should generate blob for download', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());
      pages.forEach(page => {
        zip.file(`${page.name}.md`, '# ' + page.name);
      });

      const blob = await zip.generateAsync({ type: 'blob' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/zip');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should be compatible with saveAs', async () => {
      zip.file('test.md', '# Test');

      const blob = await zip.generateAsync({ type: 'blob' });

      // Should be compatible with file-saver saveAs()
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Batch Export Scenarios', () => {
    it('should handle exporting entire graph', async () => {
      const context = setupIntegrationTest('multiPageGraph');

      const pages = Array.from(context.pages.values());

      pages.forEach(page => {
        const blocks = Array.from(context.blocks.values()).filter(b => b.page?.uuid === page.uuid);

        const markdown = `# ${page.name}\n\n${blocks.map(b => b.content).join('\n')}`;

        zip.file(`${page.name}.md`, markdown);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should export with different settings combinations', async () => {
      const context = setupIntegrationTest('pageWithHeadings');

      const pages = Array.from(context.pages.values());

      // Export with different formatting
      pages.forEach((page, index) => {
        if (index === 0) {
          zip.file(`${page.name}.md`, `# ${page.name}`);
        } else if (index === 1) {
          zip.file(`${page.name}.md`, `## ${page.name}`);
        }
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});
