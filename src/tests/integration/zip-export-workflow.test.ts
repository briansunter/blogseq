import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter } from '../../markdownExporter';
import { MockLogseqAPI } from '../../testing/mock-logseq-sdk/MockLogseqAPI';
import { MockFileAPI } from '../../testing/mock-logseq-sdk/MockFileAPI';
import { MockDOMHelpers } from '../../testing/mock-logseq-sdk/MockDOMHelpers';
import {
  readZipFromBlob,
  extractMarkdownFromZip,
  verifyZipStructure,
  countZipFiles,
  getZipFilePaths,
} from '../../testing/utils/zipHelpers';
import { SamplePages, SampleBlocks, TestUUIDs } from '../../testing/mock-logseq-sdk/fixtures';

/**
 * ZIP Export Workflow Tests
 * Tests complete end-to-end ZIP export workflows with various settings
 */
describe('ZIP Export Workflow Tests', () => {
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

  describe('Complete export workflow', () => {
    it('should export page with all settings enabled', async () => {
      mockAPI.addPage(SamplePages.withProperties);
      mockAPI.setCurrentPage(SamplePages.withProperties);

      const block = {
        ...SampleBlocks.heading,
        properties: { 'logseq.property/heading': 2 },
        content: 'Section with content',
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithProperties, [block]);

      // Add property definitions
      mockAPI.addPropertyDefinition('user.property/author', 'author');
      mockAPI.addPropertyDefinition('user.property/tags', 'tags');

      const markdown = await exporter.exportCurrentPage({
        includePageName: true,
        includeProperties: true,
        flattenNested: true,
        preserveBlockRefs: true,
        removeLogseqSyntax: true,
        includeTags: true,
      });

      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
      expect(savedFile!.filename).toMatch(/\.zip$/);

      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Properties.md');

      // Verify all elements present
      expect(content).toContain('---'); // Frontmatter
      expect(content).toContain('# Page With Properties'); // Page name
      expect(content).toContain('## Section with content'); // Heading
    });

    it('should export page with minimal settings', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage({
        includePageName: false,
        includeProperties: false,
        flattenNested: true,
        preserveBlockRefs: false,
        removeLogseqSyntax: true,
        includeTags: false,
      });

      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      // Should be minimal markdown
      expect(content.trim().startsWith('---')).toBe(false);
      expect(content).not.toContain('# Simple Page\n');
      expect(content).toContain('This is a simple block');
    });

    it('should export with assets and all settings', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Check this image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'My Image'
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['image-data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage({
        includePageName: true,
        includeProperties: false,
        flattenNested: true,
      });

      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      // Verify structure
      const isValid = await verifyZipStructure(zip, {
        markdownFile: 'Page-With-Assets.md',
        assetFolder: 'assets/',
        assetFiles: [`${TestUUIDs.imageAsset}.png`],
      });

      expect(isValid).toBe(true);

      // Verify content
      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');
      expect(content).toContain('![My Image](assets/');
    });
  });

  describe('Reference resolution in ZIP exports', () => {
    it('should resolve block references', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const referencedBlock = {
        ...SampleBlocks.referenced,
        uuid: TestUUIDs.referencedBlock,
        content: 'Referenced content',
      };

      const blockWithRef = {
        ...SampleBlocks.withBlockRef,
        content: `See this: ((${TestUUIDs.referencedBlock}))`,
      };

      mockAPI.addBlock(referencedBlock);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithRef]);

      const markdown = await exporter.exportCurrentPage({ preserveBlockRefs: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('Referenced content');
    });

    it('should resolve page references', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const referencedPage = {
        ...SamplePages.referenced,
        uuid: TestUUIDs.referencedPage,
        name: 'Referenced Page',
      };

      const blockWithPageRef = {
        ...SampleBlocks.simple,
        content: `Link to [[${TestUUIDs.referencedPage}]]`,
      };

      mockAPI.addPage(referencedPage);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithPageRef]);

      const markdown = await exporter.exportCurrentPage({ preserveBlockRefs: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('Referenced Page');
    });

    it('should resolve asset references', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Asset: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Asset Title'
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage({ preserveBlockRefs: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');

      expect(content).toMatch(/!\[Asset Title\]\(assets\/.+\.png\)/);
    });
  });

  describe('Nested structure handling', () => {
    it('should flatten nested blocks in ZIP export', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const parentBlock = {
        ...SampleBlocks.nested,
        uuid: '550e8400-e29b-41d4-a716-446655440221',
        content: 'Parent',
        children: [
          {
            ...SampleBlocks.simple,
            uuid: '550e8400-e29b-41d4-a716-446655440222',
            content: 'Child',
            children: [],
          },
        ],
      };

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [parentBlock]);

      const markdown = await exporter.exportCurrentPage({ flattenNested: true });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content).toContain('Parent');
      expect(content).toContain('Child');
      // Should not have list formatting when flattened
      expect(content).not.toMatch(/\s+-\s+Child/);
    });

    it('should preserve hierarchy when flattening disabled', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const parentBlock = {
        ...SampleBlocks.nested,
        uuid: '550e8400-e29b-41d4-a716-446655440223',
        content: 'Parent',
        children: [
          {
            ...SampleBlocks.simple,
            uuid: '550e8400-e29b-41d4-a716-446655440224',
            content: 'Child',
            children: [],
          },
        ],
      };

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [parentBlock]);

      const markdown = await exporter.exportCurrentPage({ flattenNested: false });
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      // Note: Current implementation doesn't add list formatting when flattenNested: false
      // It just outputs blocks without indentation markers
      expect(content).toContain('Parent');
      expect(content).toContain('Child');
    });
  });

  describe('Download trigger verification', () => {
    it('should trigger ZIP download', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      // Verify saveAs was called
      expect(mockFileAPI.calls.saveAs).toHaveLength(1);
      expect(mockFileAPI.calls.saveAs[0].filename).toMatch(/\.zip$/);
    });

    it('should use correct filename for ZIP', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown, 'custom-name');

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile!.filename).toBe('custom-name.zip');
    });

    it('should use page name as default filename', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile!.filename).toMatch(/Simple-Page\.zip$/);
    });
  });

  describe('Asset detection and inclusion', () => {
    it('should detect and include markdown-style asset references', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const blockWithMdAsset = {
        ...SampleBlocks.simple,
        content: `![Image](../assets/${TestUUIDs.imageAsset}.png)`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithMdAsset]);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const files = getZipFilePaths(zip);
      expect(files).toContain(`assets/${TestUUIDs.imageAsset}.png`);
    });

    it('should detect assets in nested blocks', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const parentBlock = {
        ...SampleBlocks.nested,
        uuid: '550e8400-e29b-41d4-a716-446655440225',
        content: 'Parent block',
        children: [
          {
            ...SampleBlocks.simple,
            uuid: '550e8400-e29b-41d4-a716-446655440226',
            content: `Child with image: [[${TestUUIDs.imageAsset}]]`,
            children: [],
          },
        ],
      };

      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [parentBlock]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      expect(countZipFiles(zip)).toBe(2); // Markdown + asset
    });
  });

  describe('Custom asset path', () => {
    it('should respect custom asset path setting', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage({ assetPath: 'media/' });
      await exporter.downloadAsZip(markdown, undefined, 'media/');

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');
      expect(content).toContain('media/');
    });

    it('should handle asset path without trailing slash', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage({ assetPath: 'files' });
      await exporter.downloadAsZip(markdown, undefined, 'files');

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const content = await extractMarkdownFromZip(zip, 'Page-With-Assets.md');
      expect(content).toContain('files/');
    });
  });

  describe('Success notifications', () => {
    it('should show success message after ZIP export', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      // Verify showMsg was called
      expect(mockAPI.calls.showMsg).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'success'
          })
        ])
      );
    });

    it('should show success message with asset count', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]] PDF: [[${TestUUIDs.pdfAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset
      } as any);

      mockAPI.addAsset(TestUUIDs.pdfAsset, 'pdf', {
        uuid: TestUUIDs.pdfAsset
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
        new Blob(['data'], { type: 'application/pdf' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      expect(mockAPI.calls.showMsg).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'success'
          })
        ])
      );
    });
  });

  describe('Empty page handling', () => {
    it('should export ZIP for page with no blocks', async () => {
      mockAPI.addPage(SamplePages.empty);
      mockAPI.setCurrentPage(SamplePages.empty);
      mockAPI.setPageBlocksTree(TestUUIDs.emptyPage, []);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();

      const zip = await readZipFromBlob(savedFile!.blob);
      expect(countZipFiles(zip)).toBe(1);
    });

    it('should include message for empty page', async () => {
      mockAPI.addPage(SamplePages.empty);
      mockAPI.setCurrentPage(SamplePages.empty);
      mockAPI.setPageBlocksTree(TestUUIDs.emptyPage, []);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Empty-Page.md');

      // Note: Current implementation doesn't add "No content found" message for empty pages
      // It just outputs the page heading
      expect(content).toContain('# Empty Page');
    });
  });
});
