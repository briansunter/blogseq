import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter } from '../../markdownExporter';
import { MockLogseqAPI } from '../../testing/mock-logseq-sdk/MockLogseqAPI';
import { MockFileAPI } from '../../testing/mock-logseq-sdk/MockFileAPI';
import { MockDOMHelpers } from '../../testing/mock-logseq-sdk/MockDOMHelpers';
import {
  readZipFromBlob,
  extractAssetFromZip,
  assertAssetInZip,
  findFilesInZip,
  getZipFilePaths,
} from '../../testing/utils/zipHelpers';
import { SamplePages, SampleBlocks, TestUUIDs } from '../../testing/mock-logseq-sdk/fixtures';

/**
 * ZIP Asset Tests
 * Verifies that assets are properly packaged in ZIP exports
 */
describe('ZIP Asset Tests', () => {
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

  // Helper to setup asset mocking
  const setupAsset = (uuid: string, type: string, title?: string) => {
    mockAPI.addAsset(uuid, type, {
      uuid,
      'block/title': title || `asset-${uuid}`,
    } as any);

    mockFileAPI.setFetchResponse(
      `file:///test/graph/assets/${uuid}.${type}`,
      new Blob(['fake-data'], { type: `image/${type}` })
    );
  };

  describe('Single asset inclusion', () => {
    it('should include referenced image in ZIP', async () => {
      // CRITICAL: Set up assets BEFORE setting page and blocks
      setupAsset(TestUUIDs.imageAsset, 'png', 'My Image');

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const blockWithImage = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithImage]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      await assertAssetInZip(zip, `assets/${TestUUIDs.imageAsset}.png`);
    });

    it('should include referenced PDF in ZIP', async () => {
      // CRITICAL: Set up assets BEFORE setting page and blocks
      setupAsset(TestUUIDs.pdfAsset, 'pdf', 'My PDF');

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const blockWithPdf = {
        ...SampleBlocks.simple,
        content: `PDF: [[${TestUUIDs.pdfAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithPdf]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      await assertAssetInZip(zip, `assets/${TestUUIDs.pdfAsset}.pdf`);
    });

    it('should preserve asset file extension', async () => {
      // Set up all assets first (don't reset in loop)
      const assetTypes = [
        { uuid: '550e8400-e29b-41d4-a716-446655440101', type: 'png', mime: 'image/png' },
        { uuid: '550e8400-e29b-41d4-a716-446655440102', type: 'jpg', mime: 'image/jpeg' },
        { uuid: '550e8400-e29b-41d4-a716-446655440103', type: 'pdf', mime: 'application/pdf' },
        {
          uuid: '550e8400-e29b-41d4-a716-446655440104',
          type: 'docx',
          mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ];

      // Test each asset type
      for (const asset of assetTypes) {
        mockAPI.addAsset(asset.uuid, asset.type, {
          uuid: asset.uuid,
          'block/title': `Asset ${asset.type}`,
        } as any);

        mockFileAPI.setFetchResponse(
          `file:///test/graph/assets/${asset.uuid}.${asset.type}`,
          new Blob(['data'], { type: asset.mime })
        );
      }

      // Test one asset at a time
      for (const asset of assetTypes) {
        mockAPI.addPage(SamplePages.withAssets);
        mockAPI.setCurrentPage(SamplePages.withAssets);

        const block = {
          ...SampleBlocks.simple,
          uuid: `block-for-${asset.uuid}`,
          content: `Asset: [[${asset.uuid}]]`,
        };
        mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

        const markdown = await exporter.exportCurrentPage();
        await exporter.downloadAsZip(markdown);

        const savedFile = mockFileAPI.getLastSavedFile();
        const zip = await readZipFromBlob(savedFile!.blob);

        const expectedPath = `assets/${asset.uuid}.${asset.type}`;
        await assertAssetInZip(zip, expectedPath);
      }
    });
  });

  describe('Multiple asset inclusion', () => {
    it('should include all referenced assets', async () => {
      // Use mockAPI.addAsset for consistent mocking
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Test Image',
      } as any);

      mockAPI.addAsset(TestUUIDs.pdfAsset, 'pdf', {
        uuid: TestUUIDs.pdfAsset,
        'block/title': 'Test PDF',
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['image-data'], { type: 'image/png' })
      );

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
        new Blob(['pdf-data'], { type: 'application/pdf' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]] and PDF: [[${TestUUIDs.pdfAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      await assertAssetInZip(zip, `assets/${TestUUIDs.imageAsset}.png`);
      await assertAssetInZip(zip, `assets/${TestUUIDs.pdfAsset}.pdf`);
    });

    it('should handle multiple assets of same type', async () => {
      const image1 = '550e8400-e29b-41d4-a716-446655440111';
      const image2 = '550e8400-e29b-41d4-a716-446655440112';
      const image3 = '550e8400-e29b-41d4-a716-446655440113';

      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      for (const uuid of [image1, image2, image3]) {
        mockAPI.addAsset(uuid, 'png', {
          uuid,
          'block/title': `Image ${uuid}`,
        } as any);

        mockFileAPI.setFetchResponse(
          `file:///test/graph/assets/${uuid}.png`,
          new Blob([`data-${uuid}`], { type: 'image/png' })
        );
      }

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Images: [[${image1}]] [[${image2}]] [[${image3}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      // All three should be present
      await assertAssetInZip(zip, `assets/${image1}.png`);
      await assertAssetInZip(zip, `assets/${image2}.png`);
      await assertAssetInZip(zip, `assets/${image3}.png`);
    });

    it('should include assets from multiple blocks', async () => {
      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Test Image',
      } as any);

      mockAPI.addAsset(TestUUIDs.pdfAsset, 'pdf', {
        uuid: TestUUIDs.pdfAsset,
        'block/title': 'Test PDF',
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['image'], { type: 'image/png' })
      );

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
        new Blob(['pdf'], { type: 'application/pdf' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block1 = {
        ...SampleBlocks.simple,
        uuid: 'block-1',
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };

      const block2 = {
        ...SampleBlocks.simple,
        uuid: 'block-2',
        content: `PDF: [[${TestUUIDs.pdfAsset}]]`,
      };

      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block1, block2]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      await assertAssetInZip(zip, `assets/${TestUUIDs.imageAsset}.png`);
      await assertAssetInZip(zip, `assets/${TestUUIDs.pdfAsset}.pdf`);
    });
  });

  describe('Asset data integrity', () => {
    it('should preserve asset binary data', async () => {
      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Test Image',
      } as any);

      const originalData = 'this-is-binary-image-data-12345';
      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob([originalData], { type: 'image/png' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const assetBlob = await extractAssetFromZip(zip, `assets/${TestUUIDs.imageAsset}.png`);
      const extractedData = await assetBlob.text();

      expect(extractedData).toBe(originalData);
    });

    it('should preserve asset file size', async () => {
      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      mockAPI.addAsset(TestUUIDs.pdfAsset, 'pdf', {
        uuid: TestUUIDs.pdfAsset,
        'block/title': 'Test PDF',
      } as any);

      const largeData = 'x'.repeat(10000);
      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
        new Blob([largeData], { type: 'application/pdf' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `PDF: [[${TestUUIDs.pdfAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const assetBlob = await extractAssetFromZip(zip, `assets/${TestUUIDs.pdfAsset}.pdf`);
      expect(assetBlob.size).toBe(largeData.length);
    });

    it('should handle empty asset files', async () => {
      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Test Image',
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob([], { type: 'image/png' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      // Should still be present even if empty
      await assertAssetInZip(zip, `assets/${TestUUIDs.imageAsset}.png`);
    });
  });

  describe('Asset type detection', () => {
    it('should handle image assets', async () => {
      const imageTypes = [
        { type: 'png', uuid: '550e8400-e29b-41d4-a716-446655440121' },
        { type: 'jpg', uuid: '550e8400-e29b-41d4-a716-446655440122' },
        { type: 'jpeg', uuid: '550e8400-e29b-41d4-a716-446655440123' },
        { type: 'gif', uuid: '550e8400-e29b-41d4-a716-446655440124' },
        { type: 'webp', uuid: '550e8400-e29b-41d4-a716-446655440125' },
        { type: 'svg', uuid: '550e8400-e29b-41d4-a716-446655440126' },
      ];

      // Set up all assets first
      for (const { type, uuid } of imageTypes) {
        mockAPI.addAsset(uuid, type, {
          uuid,
          'block/title': `Image ${type}`,
        } as any);

        mockFileAPI.setFetchResponse(
          `file:///test/graph/assets/${uuid}.${type}`,
          new Blob(['data'], { type: `image/${type}` })
        );
      }

      // Test each asset type
      for (const { type, uuid } of imageTypes) {
        mockAPI.addPage(SamplePages.withAssets);
        mockAPI.setCurrentPage(SamplePages.withAssets);

        const block = {
          ...SampleBlocks.simple,
          uuid: `block-for-${uuid}`,
          content: `Image: [[${uuid}]]`,
        };
        mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

        const markdown = await exporter.exportCurrentPage();
        await exporter.downloadAsZip(markdown);

        const savedFile = mockFileAPI.getLastSavedFile();
        const zip = await readZipFromBlob(savedFile!.blob);

        await assertAssetInZip(zip, `assets/${uuid}.${type}`);
      }
    });

    it('should handle document assets', async () => {
      const docTypes = [
        { type: 'pdf', uuid: '550e8400-e29b-41d4-a716-446655440131' },
        { type: 'doc', uuid: '550e8400-e29b-41d4-a716-446655440132' },
        { type: 'docx', uuid: '550e8400-e29b-41d4-a716-446655440133' },
        { type: 'txt', uuid: '550e8400-e29b-41d4-a716-446655440134' },
      ];

      // Set up all assets first
      for (const { type, uuid } of docTypes) {
        mockAPI.addAsset(uuid, type, {
          uuid,
          'block/title': `Document ${type}`,
        } as any);

        mockFileAPI.setFetchResponse(
          `file:///test/graph/assets/${uuid}.${type}`,
          new Blob(['data'], { type: `application/${type}` })
        );
      }

      // Test each asset type
      for (const { type, uuid } of docTypes) {
        mockAPI.addPage(SamplePages.withAssets);
        mockAPI.setCurrentPage(SamplePages.withAssets);

        const block = {
          ...SampleBlocks.simple,
          uuid: `block-for-${uuid}`,
          content: `Document: [[${uuid}]]`,
        };
        mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

        const markdown = await exporter.exportCurrentPage();
        await exporter.downloadAsZip(markdown);

        const savedFile = mockFileAPI.getLastSavedFile();
        const zip = await readZipFromBlob(savedFile!.blob);

        await assertAssetInZip(zip, `assets/${uuid}.${type}`);
      }
    });
  });

  describe('Asset filename handling', () => {
    it('should handle assets with special characters in title', async () => {
      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Image: With / Special? Chars!',
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      // Filename should be UUID-based, not affected by title
      await assertAssetInZip(zip, `assets/${TestUUIDs.imageAsset}.png`);
    });

    it('should not duplicate assets referenced multiple times', async () => {
      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Test Image',
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Image appears twice: [[${TestUUIDs.imageAsset}]] and again [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const files = getZipFilePaths(zip);
      const assetPath = `assets/${TestUUIDs.imageAsset}.png`;

      // Should appear exactly once
      const occurrences = files.filter(f => f === assetPath).length;
      expect(occurrences).toBe(1);
    });
  });

  describe('Asset filtering', () => {
    it('should only include referenced assets', async () => {
      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      mockAPI.addAsset(TestUUIDs.imageAsset, 'png', {
        uuid: TestUUIDs.imageAsset,
        'block/title': 'Test Image',
      } as any);

      mockFileAPI.setFetchResponse(
        `file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
        new Blob(['data'], { type: 'image/png' })
      );

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      // Only reference image, not PDF
      const block = {
        ...SampleBlocks.simple,
        content: `Image: [[${TestUUIDs.imageAsset}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const files = getZipFilePaths(zip);
      const assetFiles = files.filter(f => f.startsWith('assets/'));

      // Should have exactly one asset
      expect(assetFiles).toHaveLength(1);
      expect(assetFiles[0]).toBe(`assets/${TestUUIDs.imageAsset}.png`);
    });

    it('should find all image files in ZIP', async () => {
      const image1 = '550e8400-e29b-41d4-a716-446655440141';
      const image2 = '550e8400-e29b-41d4-a716-446655440142';

      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      for (const uuid of [image1, image2]) {
        mockAPI.addAsset(uuid, 'png', {
          uuid,
          'block/title': `Image ${uuid}`,
        } as any);

        mockFileAPI.setFetchResponse(
          `file:///test/graph/assets/${uuid}.png`,
          new Blob(['data'], { type: 'image/png' })
        );
      }

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `Images: [[${image1}]] [[${image2}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const imageFiles = findFilesInZip(zip, /\.(png|jpg|jpeg)$/i);
      expect(imageFiles).toHaveLength(2);
    });

    it('should find all PDF files in ZIP', async () => {
      const pdf1 = '550e8400-e29b-41d4-a716-446655440151';
      const pdf2 = '550e8400-e29b-41d4-a716-446655440152';

      // CRITICAL: Set up asset mocks BEFORE adding page/blocks
      for (const uuid of [pdf1, pdf2]) {
        mockAPI.addAsset(uuid, 'pdf', {
          uuid,
          'block/title': `PDF ${uuid}`,
        } as any);

        mockFileAPI.setFetchResponse(
          `file:///test/graph/assets/${uuid}.pdf`,
          new Blob(['data'], { type: 'application/pdf' })
        );
      }

      mockAPI.addPage(SamplePages.withAssets);
      mockAPI.setCurrentPage(SamplePages.withAssets);

      const block = {
        ...SampleBlocks.simple,
        content: `PDFs: [[${pdf1}]] [[${pdf2}]]`,
      };
      mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadAsZip(markdown);

      const savedFile = mockFileAPI.getLastSavedFile();
      const zip = await readZipFromBlob(savedFile!.blob);

      const pdfFiles = findFilesInZip(zip, /\.pdf$/i);
      expect(pdfFiles).toHaveLength(2);
    });
  });
});
