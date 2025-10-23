/**
 * Example tests demonstrating usage of testing utilities
 * These examples show how to use the Phase 1.2 test infrastructure
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import {
  // React testing
  renderWithLogseq,
  cleanupLogseqMocks,
  screen,

  // Non-React testing
  setupLogseqTest,
  createSamplePage,
  createSampleBlock,
  createSampleAsset,
  createPageWithBlocks,

  // ZIP utilities
  readZipFromBlob,
  verifyZipStructure,
  extractMarkdownFromZip,
  createTestZip,
  zipToBlob,

  // Assertions
  assertMarkdownStructure,
  assertIsUuid,
  assertLogseqAPICalled,
  assertValidFrontmatter,
} from './index';
import { MockLogseqAPI } from '../mock-logseq-sdk';

// Example 1: Testing a React component with Logseq context
describe('Example: React Component Testing', () => {
  let mockAPI: MockLogseqAPI;

  afterEach(() => {
    cleanupLogseqMocks(mockAPI);
  });

  it('should render component with mock Logseq data', () => {
    const page = createSamplePage({ name: 'Test Page' });
    const blocks = [
      createSampleBlock({ content: 'Block 1' }),
      createSampleBlock({ content: 'Block 2' }),
    ];

    const TestComponent = () => {
      return <div data-testid="test">Test Component</div>;
    };

    const result = renderWithLogseq(<TestComponent />, {
      mockLogseq: {
        pages: [page],
        blocks,
      },
      withToastProvider: true,
    });

    mockAPI = result.mockAPI;

    // Component renders
    expect(screen.getByTestId('test')).toBeDefined();

    // Mock API is available
    expect(mockAPI).toBeDefined();
    expect(mockAPI.getPage).toBeDefined();
  });
});

// Example 2: Testing non-React code with Logseq context
describe('Example: Non-React Testing', () => {
  it('should set up Logseq test environment', async () => {
    const { mockAPI, cleanup } = setupLogseqTest({
      pages: [createSamplePage({ name: 'My Page' })],
      blocks: [createSampleBlock({ content: 'Test content' })],
      graphPath: '/test/graph',
    });

    try {
      // Test Logseq API interactions
      const page = await mockAPI.getPage('My Page');
      expect(page).toBeTruthy();
      expect(page?.name).toBe('My Page');

      // Verify API was called
      assertLogseqAPICalled(mockAPI, 'getPage', 1);
    } finally {
      cleanup();
    }
  });
});

// Example 3: Testing ZIP exports
describe('Example: ZIP Export Testing', () => {
  it('should create and verify ZIP structure', async () => {
    // Create a test ZIP
    const zip = await createTestZip({
      'page.md': '# Test Page\n\nContent here',
      'assets/image.png': new Blob(['fake-image-data'], { type: 'image/png' }),
    });

    // Verify structure
    const isValid = await verifyZipStructure(zip, {
      markdownFile: 'page.md',
      assetFolder: 'assets/',
      assetFiles: ['image.png'],
    });

    expect(isValid).toBe(true);

    // Extract markdown
    const markdown = await extractMarkdownFromZip(zip, 'page.md');
    expect(markdown).toContain('# Test Page');
  });

  it('should convert ZIP to blob for download testing', async () => {
    const zip = await createTestZip({
      'test.md': '# Test',
    });

    const blob = await zipToBlob(zip);
    expect(blob.type).toBe('application/zip');

    // Can be read back
    const reloadedZip = await readZipFromBlob(blob);
    const content = await extractMarkdownFromZip(reloadedZip, 'test.md');
    expect(content).toBe('# Test');
  });
});

// Example 4: Testing markdown structure
describe('Example: Markdown Assertions', () => {
  it('should assert markdown structure', () => {
    const markdown = `---
title: My Page
tags: test
---

# My Page

This is some content with ![image](assets/image.png)
`;

    assertMarkdownStructure(markdown, {
      hasFrontmatter: true,
      hasHeading: 'My Page',
      hasContent: 'This is some content',
      hasAssetLink: 'image.png',
    });
  });

  it('should validate frontmatter YAML', () => {
    const markdown = `---
title: Test
author: John Doe
---

Content`;

    const frontmatter = assertValidFrontmatter(markdown);
    expect(frontmatter.title).toBe('Test');
    expect(frontmatter.author).toBe('John Doe');
  });
});

// Example 5: Testing with sample data helpers
describe('Example: Sample Data Helpers', () => {
  it('should create page with blocks', () => {
    const { page, blocks } = createPageWithBlocks(
      { name: 'Test Page' },
      3 // 3 blocks
    );

    expect(page.name).toBe('Test Page');
    expect(blocks).toHaveLength(3);
    assertIsUuid(page.uuid);
    blocks.forEach(block => assertIsUuid(block.uuid));
  });

  it('should create sample assets', () => {
    const asset = createSampleAsset({
      fileName: 'custom-image.jpg',
      type: 'image/jpeg',
    });

    expect(asset.fileName).toBe('custom-image.jpg');
    expect(asset.type).toBe('image/jpeg');
  });
});

// Example 6: Integration test combining multiple utilities
describe('Example: Integration Test', () => {
  it('should test full export workflow', async () => {
    // Setup
    const { mockAPI, cleanup } = setupLogseqTest({
      pages: [createSamplePage({ name: 'Export Test', properties: { title: 'Test' } })],
      blocks: [
        createSampleBlock({ content: 'First block' }),
        createSampleBlock({ content: 'Second block' }),
      ],
    });

    try {
      // Simulate export
      const page = await mockAPI.getPage('Export Test');
      expect(page).toBeTruthy();

      // Create mock exported content
      const exportedMarkdown = `---
title: Test
---

# Export Test

First block

Second block
`;

      // Verify exported structure
      assertMarkdownStructure(exportedMarkdown, {
        hasFrontmatter: true,
        hasHeading: 'Export Test',
        hasContent: 'First block',
      });

      // Verify API calls
      assertLogseqAPICalled(mockAPI, 'getPage');

      // Create ZIP with export
      const zip = await createTestZip({
        'export-test.md': exportedMarkdown,
        'assets/test-image.png': new Blob(['data'], { type: 'image/png' }),
      });

      // Verify ZIP
      await verifyZipStructure(zip, {
        markdownFile: 'export-test.md',
        assetFolder: 'assets/',
        assetFiles: ['test-image.png'],
      });
    } finally {
      cleanup();
    }
  });
});
