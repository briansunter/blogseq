/**
 * Example usage of the Mock Logseq SDK
 *
 * This file demonstrates how to use the mock SDK in tests.
 * It's not meant to be a real test, but rather a reference for developers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownExporter } from '../../markdownExporter';
import {
  createPreConfiguredSDK,
  PageBuilder,
  BlockBuilder,
  AssetBuilder,
  SamplePages,
  SampleBlocks,
  TestUUIDs,
  resetMockSDK,
} from './index';

describe('Mock SDK Example Usage', () => {
  let sdk: ReturnType<typeof createPreConfiguredSDK>;
  let exporter: MarkdownExporter;

  beforeEach(() => {
    sdk = createPreConfiguredSDK();
    exporter = new MarkdownExporter(sdk.logseq, sdk.file, sdk.dom);
  });

  afterEach(() => {
    resetMockSDK(sdk);
  });

  describe('Using Pre-built Fixtures', () => {
    it('should use sample pages', async () => {
      const page = SamplePages.simple;
      page.children = [SampleBlocks.simple as any];

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(SampleBlocks.simple);

      const result = await exporter.exportCurrentPage();

      expect(result).toContain('# Simple Page');
      expect(result).toContain('This is a simple block of text');
    });

    it('should use sample blocks with headings', async () => {
      const page = SamplePages.simple;
      page.children = [SampleBlocks.heading as any];

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(SampleBlocks.heading);

      const result = await exporter.exportCurrentPage();

      expect(result).toContain('## This is a heading block');
    });
  });

  describe('Using Builders', () => {
    it('should build a custom page', async () => {
      const page = new PageBuilder()
        .withName('My Custom Page')
        .withProperty('user.property/author', 'Brian Sunter')
        .withProperty('user.property/tags', ['example', 'test'])
        .build();

      const block = new BlockBuilder()
        .withContent('Custom content here')
        .build();

      page.children = [block as any];

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(block);

      const result = await exporter.exportCurrentPage({ includeProperties: true });

      expect(result).toContain('# My Custom Page');
      expect(result).toContain('author: Brian Sunter');
      expect(result).toContain('Custom content here');
    });

    it('should build blocks with different heading levels', async () => {
      const page = new PageBuilder()
        .withName('Heading Test')
        .build();

      const h1 = new BlockBuilder()
        .withContent('Level 1 Heading')
        .withHeadingLevel(1)
        .build();

      const h2 = new BlockBuilder()
        .withContent('Level 2 Heading')
        .withHeadingLevel(2)
        .build();

      page.children = [h1, h2] as any;

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(h1)
        .addBlock(h2);

      const result = await exporter.exportCurrentPage();

      expect(result).toContain('# Level 1 Heading');
      expect(result).toContain('## Level 2 Heading');
    });

    it('should handle block references', async () => {
      const page = new PageBuilder()
        .withName('Reference Test')
        .build();

      const referencedBlock = new BlockBuilder()
        .withUuid(TestUUIDs.referencedBlock)
        .withContent('I am referenced')
        .build();

      const referencingBlock = new BlockBuilder()
        .withContent(`This references ((${TestUUIDs.referencedBlock}))`)
        .build();

      page.children = [referencingBlock] as any;

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(referencedBlock)
        .addBlock(referencingBlock);

      const result = await exporter.exportCurrentPage({ preserveBlockRefs: true });

      expect(result).toContain('I am referenced');
    });
  });

  describe('Using Assets', () => {
    it('should handle image assets', async () => {
      const page = new PageBuilder()
        .withName('Asset Test')
        .build();

      const image = new AssetBuilder()
        .withUuid(TestUUIDs.imageAsset)
        .withTitle('Test Image')
        .asImage('png')
        .buildAsPage();

      const block = new BlockBuilder()
        .withContent(`Check out this image: [[${TestUUIDs.imageAsset}]]`)
        .build();

      page.children = [block as any];

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(block)
        .addAsset(TestUUIDs.imageAsset, 'png', image);

      const result = await exporter.exportCurrentPage();

      expect(result).toContain('![Test Image](assets/');
      expect(exporter.getReferencedAssets().has(TestUUIDs.imageAsset)).toBe(true);
    });
  });

  describe('Call Tracking', () => {
    it('should track method calls', async () => {
      const page = SamplePages.simple;
      page.children = [SampleBlocks.simple as any];

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(SampleBlocks.simple);

      await exporter.exportCurrentPage();

      // Verify calls were made
      expect(sdk.logseq.calls.getCurrentPage).toHaveLength(1);
      expect(sdk.logseq.calls.getPageBlocksTree).toHaveLength(1);
      expect(sdk.logseq.calls.getCurrentGraph).toHaveLength(1);
    });
  });

  describe('File Operations', () => {
    it('should track downloads', async () => {
      const page = SamplePages.simple;
      page.children = [SampleBlocks.simple as any];

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(SampleBlocks.simple);

      const markdown = await exporter.exportCurrentPage();
      await exporter.downloadMarkdown(markdown);

      // Verify file operations
      expect(sdk.file.calls.createObjectURL).toHaveLength(1);
      expect(sdk.dom.calls.createElement).toContain('a');
    });

    it('should track clipboard operations', async () => {
      const page = SamplePages.simple;
      page.children = [SampleBlocks.simple as any];

      sdk.logseq
        .setCurrentPage(page)
        .addPage(page)
        .addBlock(SampleBlocks.simple);

      const markdown = await exporter.exportCurrentPage();
      await exporter.copyToClipboard(markdown);

      // Verify clipboard
      expect(sdk.file.calls.writeToClipboard).toHaveLength(1);
      expect(sdk.file.getClipboardContent()).toContain('Simple Page');
    });
  });

  describe('Error Simulation', () => {
    it('should handle API errors', async () => {
      sdk.logseq.returnNullOn('getCurrentPage');

      await expect(exporter.exportCurrentPage()).rejects.toThrow('NO_ACTIVE_PAGE');
    });
  });
});
