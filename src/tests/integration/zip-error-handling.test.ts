import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter } from '../../markdownExporter';
import { MockLogseqAPI } from '../../testing/mock-logseq-sdk/MockLogseqAPI';
import { MockFileAPI } from '../../testing/mock-logseq-sdk/MockFileAPI';
import { MockDOMHelpers } from '../../testing/mock-logseq-sdk/MockDOMHelpers';
import {
  readZipFromBlob,
  extractMarkdownFromZip,
  countZipFiles,
  getZipFilePaths,
} from '../../testing/utils/zipHelpers';
import { SamplePages, SampleBlocks, TestUUIDs } from '../../testing/mock-logseq-sdk/fixtures';

/**
 * ZIP Error Handling Tests
 * Verifies that ZIP exports handle error scenarios gracefully
 */
describe('ZIP Error Handling Tests', () => {
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

  describe('Missing asset handling', () => {
    it('should continue export when asset fetch fails', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
      } as any);

      // Mock failed fetch
      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        'Not Found',
        404
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();

      // Should still create ZIP with markdown
      const zip = await readZipFromBlob(savedFile!.blob);
      expect(countZipFiles(zip)).toBe(1); // Just markdown, no asset
    });

    it('should show warning when assets fail to load', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Failed Asset',
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        'Error',
        500
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      // Should show warning message
      expect(mockAPI.calls.showMsg).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'warning',
          }),
        ])
      );
    });

    it('should include partial assets when some fail', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]] PDF: [[${TestUUIDs.pdfAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      // Mock both assets
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
      } as any);

      mockAPI.addAsset(TestUUIDs.pdfAsset, 'pdf', {
        uuid: TestUUIDs.pdfAsset,
      } as any);

      // Image succeeds, PDF fails
      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
        'Error',
        404
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      // Should have markdown + successful asset
      expect(countZipFiles(zip)).toBe(2);

      const files = getZipFilePaths(zip);
      expect(files).toContain(`assets/${TestUUIDs.imageAsset}.png`);
      expect(files).not.toContain(`assets/${TestUUIDs.pdfAsset}.pdf`);
    });

    it('should handle network timeout gracefully', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
      } as any);

      // Simulate timeout error
      mockFileAPI.setFetchError(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Error('Network timeout')
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();

      // Should still complete
      const zip = await readZipFromBlob(savedFile!.blob);
      expect(countZipFiles(zip)).toBe(1);
    });
  });

  describe('Invalid markdown content', () => {
    it('should handle blocks with null content', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const blockWithNull = {
        ...SampleBlocks.simple,
        content: null as any,
      };

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithNull]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();

      const zip = await readZipFromBlob(savedFile!.blob);
      expect(countZipFiles(zip)).toBe(1);
    });

    it('should handle blocks with undefined content', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const blockWithUndefined = {
        ...SampleBlocks.simple,
        content: undefined as any,
      };

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithUndefined]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
    });

    it('should handle very long content', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const longContent = 'Very long text. '.repeat(10000);
      const blockWithLongContent = {
        ...SampleBlocks.simple,
        content: longContent,
      };

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithLongContent]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      expect(content.length).toBeGreaterThan(10000);
    });

    it('should handle special characters in content', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const specialContent = 'Content with \0 null bytes and \uFFFD replacement chars';
      const blockWithSpecial = {
        ...SampleBlocks.simple,
        content: specialContent,
      };

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithSpecial]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
    });
  });

  describe('Export with no pages', () => {
    it('should throw error when no current page', async () => {
      mockAPI.setCurrentPage(null);

      await expect(exporter.exportCurrentPage()).rejects.toThrow('NO_ACTIVE_PAGE');
    });

    it('should not create ZIP when export fails', async () => {
      mockAPI.setCurrentPage(null);

      try {
        const markdown = await exporter.exportCurrentPage();
        await exporter.downloadAsZip(markdown);
      } catch {
        // Expected to fail
      }

      // Should not have saved any file
      expect(mockFileAPI.calls.saveAs).toHaveLength(0);
    });
  });

  describe('Corrupted data handling', () => {
    it('should handle malformed block references', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const blockWithBadRef = {
        ...SampleBlocks.simple,
        content: 'Malformed ref: ((not-a-valid-uuid))',
      };

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithBadRef]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);
      const content = await extractMarkdownFromZip(zip, 'Simple-Page.md');

      // Should not crash, may leave ref unresolved
      expect(content).toBeDefined();
    });

    it('should handle circular block references', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const block1 = {
        ...SampleBlocks.simple,
        uuid: '550e8400-e29b-41d4-a716-446655440201',
        content: 'Block 1 refs ((550e8400-e29b-41d4-a716-446655440202))',
      };

      const block2 = {
        ...SampleBlocks.simple,
        uuid: '550e8400-e29b-41d4-a716-446655440202',
        content: 'Block 2 refs ((550e8400-e29b-41d4-a716-446655440201))',
      };

      mockAPI.addBlock(block1);
      mockAPI.addBlock(block2);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [block1, block2]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
    });

    it('should handle deeply nested circular references', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      const deepBlock = {
        ...SampleBlocks.nested,
        uuid: '550e8400-e29b-41d4-a716-446655440211',
        content: 'Parent',
        children: [
          {
            ...SampleBlocks.simple,
            uuid: '550e8400-e29b-41d4-a716-446655440212',
            content: 'Child refs parent ((550e8400-e29b-41d4-a716-446655440211))',
            children: [],
          },
        ],
      };

      mockAPI.addBlock(deepBlock);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [deepBlock]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
    });
  });

  describe('Asset edge cases', () => {
    it('should handle asset with no title', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Asset: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
      } as any); // No title

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      expect(countZipFiles(zip)).toBe(2);
    });

    it('should handle asset with invalid type', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Asset: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'unknown-type', {
        uuid: TestUUIDs.imageAsset,
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.unknown-type`,
        new Blob(['data'], { type: 'application/octet-stream' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      // Should still include the asset
      expect(countZipFiles(zip)).toBe(2);
    });

    it('should handle asset path with special characters', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const specialUuid = '550e8400-e29b-41d4-a716-446655440191';
      const block = {
        ...SampleBlocks.simple,
        content: `Asset: [[${specialUuid}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(specialUuid, 'png', {
        uuid: specialUuid,
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${specialUuid}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
    });
  });

  describe('Graph path issues', () => {
    it('should handle missing graph path', async () => {
      mockAPI.setCurrentGraph(null);
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);
      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
    });

    it('should handle invalid graph path', async () => {
      mockAPI.setCurrentGraph({ path: '', name: '' });
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Asset: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addDataScriptQueryResponse(
        `[:find ?type (pull ?e [*])
                      :where
                      [?e :block/uuid #uuid "${TestUUIDs.imageAsset}"]
                      [?e :logseq.property.asset/type ?type]]`,
        [['png', { uuid: TestUUIDs.imageAsset }]]
      );

      // Asset won't load with invalid path, but should not crash
      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
    });
  });

  describe('Memory and performance', () => {
    it('should handle export with many blocks', async () => {
      mockAPI.addPage(SamplePages.simple);
      mockAPI.setCurrentPage(SamplePages.simple);

      // Create 100 blocks
      const blocks = Array.from({ length: 100 }, (_, i) => ({
        ...SampleBlocks.simple,
        uuid: `block-${i}`,
        content: `Block ${i} content`,
      }));

      mockAPI.setPageBlocksTree(TestUUIDs.simplePage, blocks);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
      expect(savedFile!.blob.size).toBeGreaterThan(0);
    });

    it('should handle export with many assets', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      // Create block referencing 20 assets with valid UUIDs
      const assetUUIDs = Array.from(
        { length: 20 },
        (_, i) => `550e8400-e29b-41d4-a716-4466554401${i.toString().padStart(2, '0')}`
      );
      const assetRefs = assetUUIDs.map(uuid => `[[${uuid}]]`).join(' ');
      const block = {
        ...SampleBlocks.simple,
        content: `Assets: ${assetRefs}`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      // Mock all assets
      assetUUIDs.forEach((uuid, i) => {
        mockAPI.addAsset(uuid, 'png', {
          uuid,
        } as any);

        mockFileAPI.setFetchResponse(
          `file:///test/graph/assets/${uuid}.png`,
          new Blob([`data-${i}`], { type: 'image/png' })
        );
      });

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();

      const zip = await readZipFromBlob(savedFile!.blob);
      expect(countZipFiles(zip)).toBe(21); // markdown + 20 assets
    });
  });

  describe('Partial failure recovery', () => {
    it('should show warning when all assets fail', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        'Error',
        500
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      expect(mockAPI.calls.showMsg).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'warning',
          }),
        ])
      );
    });

    it('should complete export even when asset processing fails', async () => {
      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      // Asset query succeeds but fetch fails
      mockAPI.addDataScriptQueryResponse(
        `[:find ?type (pull ?e [*])
                      :where
                      [?e :block/uuid #uuid "${TestUUIDs.imageAsset}"]
                      [?e :logseq.property.asset/type ?type]]`,
        [['png', { uuid: TestUUIDs.imageAsset }]]
      );

      mockFileAPI.setFetchError(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Error('Processing failed')
      );

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      // Should still save the ZIP with markdown
      const savedFile = mockFileAPI.getLastSavedFile();
      expect(savedFile).toBeDefined();
      expect(savedFile!.filename).toMatch(/\.zip$/);
    });
  });
});
