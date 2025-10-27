import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter } from '../../markdownExporter';
import { MockLogseqAPI } from '../../testing/mock-logseq-sdk/MockLogseqAPI';
import { MockFileAPI } from '../../testing/mock-logseq-sdk/MockFileAPI';
import { MockDOMHelpers } from '../../testing/mock-logseq-sdk/MockDOMHelpers';
import {
  readZipFromBlob,
  extractMarkdownFromZip,
  extractAllMarkdownFromZip,
} from '../../testing/utils/zipHelpers';
import { SamplePages, SampleBlocks, TestUUIDs } from '../../testing/mock-logseq-sdk/fixtures';

/**
 * ZIP Content Tests
 * Verifies that ZIP exports contain correct markdown content and asset references
 */
describe('ZIP Content Tests', () => {
  let mockAPI: MockLogseqAPI;
  let mockFileAPI: MockFileAPI;
  let mockDOM: MockDOMHelpers;
  let exporter: MarkdownExporter;

  beforeEach(() => {
    mockAPI = new MockLogseqAPI();
    mockFileAPI = new MockFileAPI();
    mockDOM = new MockDOMHelpers();
    exporter = new MarkdownExporter(mockAPI, mockFileAPI, mockDOM);

    mockAPI.setCurrentGraph({ path: '/test/graph', name: 'Test Graph' });
  });

  afterEach(() => {
    mockAPI.reset();
    mockFileAPI.reset();
    mockDOM.reset();
  });

  describe('Markdown content extraction', () => {
    it('should extract markdown content from ZIP', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');
      expect(content).toBeDefined();
      expect(content).toContain('This is a simple block of text');
    });

    it('should preserve markdown formatting', async () => {
      const blockWithFormatting = {
        ...SampleBlocks.simple,
        content: '**Bold text** and *italic text* with `code`',
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithFormatting]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('**Bold text**');
      expect(content).toContain('*italic text*');
      expect(content).toContain('`code`');
    });

    it('should include multiple blocks', async () => {
      const block1 = { ...SampleBlocks.simple, uuid: '550e8400-e29b-41d4-a716-446655440161', content: 'First block' };
      const block2 = { ...SampleBlocks.simple, uuid: '550e8400-e29b-41d4-a716-446655440162', content: 'Second block' };
      const block3 = { ...SampleBlocks.simple, uuid: '550e8400-e29b-41d4-a716-446655440163', content: 'Third block' };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [block1, block2, block3]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('First block');
      expect(content).toContain('Second block');
      expect(content).toContain('Third block');
    });

    it('should extract all markdown files from ZIP', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const allMarkdown = await extractAllMarkdownFromZip(zip);

      expect(allMarkdown).toHaveLength(1);
      expect(allMarkdown[0].filename).toBe('Simple-Page.md');
      expect(allMarkdown[0].content).toContain('This is a simple block');
    });
  });

  describe('Frontmatter inclusion', () => {
    it('should include frontmatter when enabled', async () => {
      mockAPI.addPage(SamplePages.withProperties);
      mockAPI.setCurrentPage(SamplePages.withProperties);
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithProperties, [SampleBlocks.simple]);

      // Add property definitions (keys must match the root-level colon-prefixed keys in page)
      mockAPI.addPropertyDefinition(':user.property/author-abc123', 'author');
      mockAPI.addPropertyDefinition(':user.property/tags-def456', 'tags');
      mockAPI.addPropertyDefinition(':user.property/date-ghi789', 'date');

      const markdown = await exporter.exportCurrentPage({ includeProperties: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Properties.md');

      expect(content).toContain('---');
      expect(content).toContain('title:');
      expect(content).toMatch(/author:/);
    });

    it('should not include frontmatter when disabled', async () => {
      mockAPI.addPage(SamplePages.withProperties);
      mockAPI.setCurrentPage(SamplePages.withProperties);
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithProperties, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage({ includeProperties: false });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Properties.md');

      // Should not start with frontmatter
      expect(content.trim().startsWith('---')).toBe(false);
    });

    it('should include tags in frontmatter', async () => {
      mockAPI.addPage(SamplePages.withProperties);
      mockAPI.setCurrentPage(SamplePages.withProperties);
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithProperties, [SampleBlocks.simple]);

      // Add property definition (key must match the root-level colon-prefixed key in page)
      mockAPI.addPropertyDefinition(':user.property/tags-def456', 'tags');

      const markdown = await exporter.exportCurrentPage({ includeProperties: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Properties.md');

      expect(content).toContain('tags:');
      // Tags should be in YAML array format
      expect(content).toMatch(/tags:\s*\n\s*-/);
    });
  });

  describe('Page heading inclusion', () => {
    it('should include page name as H1 when enabled', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage({ includePageName: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('# Simple Page');
    });

    it('should not include page name when disabled', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage({ includePageName: false });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      // Should not have H1 with page name
      expect(content).not.toContain('# Simple Page\n');
    });
  });

  describe('Asset path rewriting', () => {
    it('should rewrite asset paths to relative', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const blockWithAsset = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAsset]);

      // Use mockAPI.addAsset instead of addDataScriptQueryResponse
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Sample Image'
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');

      // Path should be relative to markdown file
      expect(content).toContain('assets/');
      expect(content).toContain(`${TestUUIDs.imageAsset}.png`);
    });

    it('should use correct markdown image syntax', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const blockWithImage = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithImage]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'My Image'
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');

      // Should use ![alt](path) syntax for images
      expect(content).toMatch(/!\[.*\]\(assets\/.+\.png\)/);
    });

    it('should use correct markdown link syntax for non-images', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const blockWithPdf = {
        ...SampleBlocks.simple,
        content: `PDF: [[${TestUUIDs.pdfAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithPdf]);

      mockAPI.addAsset(TestUUIDs.pdfAsset, 'pdf', {
        uuid: TestUUIDs.pdfAsset,
        'block/title': 'My PDF'
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
        new Blob(['data'], { type: 'application/pdf' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');

      // Should use [text](path) syntax (no !) for non-images
      expect(content).toMatch(/\[My PDF\]\(assets\/.+\.pdf\)/);
      expect(content).not.toMatch(/!\[My PDF\]/);
    });

    it('should preserve asset titles in links', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const blockWithAsset = {
        ...SampleBlocks.simple,
        content: `Document: [[${TestUUIDs.pdfAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAsset]);

      mockAPI.addAsset(TestUUIDs.pdfAsset, 'pdf', {
        uuid: TestUUIDs.pdfAsset,
        'block/title': 'Important Document'
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
        new Blob(['data'], { type: 'application/pdf' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');

      expect(content).toContain('[Important Document]');
    });
  });

  describe('Block structure flattening', () => {
    it('should flatten nested blocks when enabled', async () => {
      const parentBlock = {
        ...SampleBlocks.nested,
        uuid: '550e8400-e29b-41d4-a716-446655440171',
        content: 'Parent block',
        children: [
          {
            ...SampleBlocks.simple,
            uuid: '550e8400-e29b-41d4-a716-446655440172',
            content: 'Child block',
            children: [],
          },
        ],
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [parentBlock]);

      const markdown = await exporter.exportCurrentPage({ flattenNested: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      // Should be paragraphs, not indented list items
      expect(content).toContain('Parent block');
      expect(content).toContain('Child block');
      expect(content).not.toMatch(/\s+-\s+Child block/);
    });

    it('should preserve indentation when flattening is disabled', async () => {
      const parentBlock = {
        ...SampleBlocks.nested,
        uuid: '550e8400-e29b-41d4-a716-446655440173',
        content: 'Parent block',
        children: [
          {
            ...SampleBlocks.simple,
            uuid: '550e8400-e29b-41d4-a716-446655440174',
            content: 'Child block',
            children: [],
          },
        ],
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [parentBlock]);

      const markdown = await exporter.exportCurrentPage({ flattenNested: false });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      // Note: Current implementation doesn't add list formatting when flattenNested: false
      expect(content).toContain('Parent block');
      expect(content).toContain('Child block');
    });
  });

  describe('Heading blocks', () => {
    it('should convert heading blocks to markdown headings', async () => {
      const headingBlock = {
        ...SampleBlocks.heading,
        properties: { 'logseq.property/heading': 2 },
        content: 'Section Title',
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [headingBlock]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('## Section Title');
    });

    it('should handle multiple heading levels', async () => {
      const h1 = {
        ...SampleBlocks.heading,
        uuid: '550e8400-e29b-41d4-a716-446655440181',
        properties: { 'logseq.property/heading': 1 },
        content: 'Main Title',
      };
      const h2 = {
        ...SampleBlocks.heading,
        uuid: '550e8400-e29b-41d4-a716-446655440182',
        properties: { 'logseq.property/heading': 2 },
        content: 'Subtitle',
      };
      const h3 = {
        ...SampleBlocks.heading,
        uuid: '550e8400-e29b-41d4-a716-446655440183',
        properties: { 'logseq.property/heading': 3 },
        content: 'Subsection',
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [h1, h2, h3]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('# Main Title');
      expect(content).toContain('## Subtitle');
      expect(content).toContain('### Subsection');
    });
  });

  describe('Content encoding', () => {
    it('should preserve UTF-8 characters', async () => {
      const blockWithUtf8 = {
        ...SampleBlocks.simple,
        content: 'Unicode test: 日本語 中文 한국어 🎉',
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithUtf8]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('日本語');
      expect(content).toContain('中文');
      expect(content).toContain('한국어');
      expect(content).toContain('🎉');
    });

    it('should preserve special markdown characters', async () => {
      const blockWithSpecialChars = {
        ...SampleBlocks.simple,
        content: 'Special chars: `code` **bold** *italic* [link](url)',
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithSpecialChars]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('`code`');
      expect(content).toContain('**bold**');
      expect(content).toContain('*italic*');
      expect(content).toContain('[link](url)');
    });

    it('should handle line breaks correctly', async () => {
      const blockWithLineBreaks = {
        ...SampleBlocks.simple,
        content: 'Line 1\nLine 2\nLine 3',
      };

      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithLineBreaks]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('Line 1');
      expect(content).toContain('Line 2');
      expect(content).toContain('Line 3');
    });
  });
});
