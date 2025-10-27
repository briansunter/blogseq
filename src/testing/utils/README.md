# Testing Utilities (Phase 1.2)

Comprehensive test utility functions for the BlogSeq Logseq plugin. These utilities make it easy to write tests with Logseq context and verify complex behaviors.

## Directory Structure

```
src/testing/utils/
├── renderWithLogseq.tsx    # React Testing Library wrapper
├── setupLogseqTest.ts      # Non-React test setup
├── zipHelpers.ts           # ZIP file testing utilities
├── assertionHelpers.ts     # Custom assertion functions
├── examples.test.tsx       # Example usage tests
├── index.ts                # Main export file
└── README.md               # This file
```

## Installation & Setup

All utilities are exported from the main index:

```typescript
import {
  // React testing
  renderWithLogseq,
  cleanupLogseqMocks,
  screen,
  waitFor,

  // Non-React testing
  setupLogseqTest,
  createSamplePage,
  createSampleBlock,

  // ZIP utilities
  readZipFromBlob,
  verifyZipStructure,

  // Assertions
  assertMarkdownStructure,
  assertLogseqAPICalled,
} from '@/testing/utils';
```

## 1. React Component Testing

### `renderWithLogseq()`

Custom render function that wraps components with all necessary providers (ToastProvider, Logseq context).

**Usage:**

```typescript
import { renderWithLogseq, screen } from '@/testing/utils';

it('should render with Logseq context', () => {
  const { mockAPI } = renderWithLogseq(<MyComponent />, {
    mockLogseq: {
      pages: [{ uuid: '123', name: 'Test Page' }],
      blocks: [{ uuid: '456', content: 'Test content' }],
      graphPath: '/test/graph',
    },
    withToastProvider: true,
  });

  expect(screen.getByText('Test Page')).toBeDefined();
  expect(mockAPI.calls.getPage).toHaveLength(1);
});
```

**Options:**

- `mockLogseq` - Mock Logseq data (pages, blocks, graphPath, graphName)
- `initialSettings` - Export settings to seed
- `withToastProvider` - Wrap with ToastProvider (default: true)
- `wrapper` - Custom wrapper component
- `existingMockAPI` - Use existing mock API instance

**Returns:**

- All `@testing-library/react` render results
- `mockAPI` - Mock Logseq API instance for assertions
- `cleanupMockAPI()` - Cleanup function

### `cleanupLogseqMocks()`

Cleanup helper for afterEach hooks:

```typescript
let mockAPI: MockLogseqAPI;

afterEach(() => {
  cleanupLogseqMocks(mockAPI);
});
```

## 2. Non-React Testing

### `setupLogseqTest()`

Set up Logseq test environment for unit tests (non-React).

**Usage:**

```typescript
import { setupLogseqTest } from '@/testing/utils';

describe('MarkdownExporter', () => {
  let mockAPI: MockLogseqAPI;
  let cleanup: () => void;

  beforeEach(() => {
    const setup = setupLogseqTest({
      pages: [{ uuid: '123', name: 'Test Page' }],
      blocks: [{ uuid: '456', content: 'Test content' }],
    });
    mockAPI = setup.mockAPI;
    cleanup = setup.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('should export page', async () => {
    const page = await mockAPI.getPage('Test Page');
    expect(page).toBeTruthy();
  });
});
```

### Sample Data Helpers

#### `createSamplePage(overrides?)`

```typescript
const page = createSamplePage({
  name: 'My Page',
  properties: { title: 'My Title' },
});
```

#### `createSampleBlock(overrides?)`

```typescript
const block = createSampleBlock({
  content: 'Block content',
  properties: { heading: 2 },
});
```

#### `createSampleAsset(overrides?)`

```typescript
const asset = createSampleAsset({
  fileName: 'image.png',
  type: 'image/png',
});
```

#### `createPageWithBlocks(pageOverrides?, blockCount?)`

```typescript
const { page, blocks } = createPageWithBlocks(
  { name: 'Test Page' },
  3 // Create 3 blocks
);
```

#### `createBlockTree(depth, breadth?)`

```typescript
const blocks = createBlockTree(3, 2); // Depth 3, breadth 2
```

## 3. ZIP Testing Utilities

### `readZipFromBlob(blob)`

Read and parse ZIP file from Blob:

```typescript
const blob = await downloadAsZip();
const zip = await readZipFromBlob(blob);
```

### `verifyZipStructure(zip, expected)`

Verify ZIP matches expected structure:

```typescript
const isValid = await verifyZipStructure(zip, {
  markdownFile: 'page.md',
  assetFolder: 'assets/',
  assetFiles: ['image.png', 'document.pdf'],
  minFiles: 2,
  maxFiles: 10,
});

expect(isValid).toBe(true);
```

### `extractMarkdownFromZip(zip, filename)`

Extract markdown content from ZIP:

```typescript
const markdown = await extractMarkdownFromZip(zip, 'page.md');
expect(markdown).toContain('# My Page');
```

### `extractAssetFromZip(zip, path)`

Extract asset file as Blob:

```typescript
const imageBlob = await extractAssetFromZip(zip, 'assets/image.png');
expect(imageBlob.type).toBe('image/png');
```

### `createTestZip(files)`

Create a test ZIP for mocking:

```typescript
const zip = await createTestZip({
  'page.md': '# Test Page\n\nContent',
  'assets/image.png': new Blob(['data'], { type: 'image/png' }),
});
```

### Other ZIP Utilities

- `getZipFilePaths(zip)` - Get all file paths
- `getZipFolderPaths(zip)` - Get all folder paths
- `countZipFiles(zip)` - Count files (excluding directories)
- `findFilesInZip(zip, pattern)` - Find files matching regex
- `zipToBlob(zip)` - Convert ZIP to Blob
- `getZipMetadata(zip)` - Get file counts and metadata

## 4. Assertion Helpers

### `assertMarkdownStructure(markdown, expected)`

Assert markdown matches expected structure:

```typescript
assertMarkdownStructure(markdown, {
  hasFrontmatter: true,
  hasHeading: 'My Page',
  hasContent: 'Some content',
  hasAssetLink: 'image.png',
  doesNotContain: '((uuid))',
  matchesPattern: /^# .+$/m,
  hasFrontmatterProperty: { key: 'title', value: 'My Title' },
  minLines: 10,
  maxLines: 100,
});
```

### `assertValidFrontmatter(markdown)`

Validate and parse YAML frontmatter:

```typescript
const frontmatter = assertValidFrontmatter(markdown);
expect(frontmatter.title).toBe('Test');
```

### `assertCleanMarkdown(markdown)`

Assert markdown doesn't contain Logseq-specific syntax:

```typescript
assertCleanMarkdown(markdown);
// Checks for ((uuid)), id::, collapsed::, etc.
```

### `assertIsUuid(value)`

Assert value is a valid UUID:

```typescript
assertIsUuid(block.uuid);
assertIsUuid('123e4567-e89b-12d3-a456-426614174000');
```

### `assertLogseqAPICalled(mockAPI, method, times?)`

Assert Logseq API method was called:

```typescript
assertLogseqAPICalled(mockAPI, 'getPage', 1);
assertLogseqAPICalled(mockAPI, 'getBlock'); // At least once
```

### `assertLogseqAPICalledWith(mockAPI, method, expectedArg)`

Assert API called with specific arguments:

```typescript
assertLogseqAPICalledWith(mockAPI, 'getPage', 'My Page');
```

### `assertBlockHasProperty(block, key, value?)`

Assert block has specific property:

```typescript
assertBlockHasProperty(block, 'heading', 2);
```

### `assertHeadingLevels(markdown, levels)`

Assert heading levels in order:

```typescript
assertHeadingLevels(markdown, [1, 2, 2, 3]);
// Expects H1, H2, H2, H3
```

### `assertBlockCount(markdown, count)`

Assert number of blocks/paragraphs:

```typescript
assertBlockCount(markdown, 5);
```

### `assertBlockTree(blocks, depth)`

Assert block tree has expected depth:

```typescript
assertBlockTree(blocks, 3);
```

### `assertAssetPath(path, prefix)`

Assert asset path is correctly formatted:

```typescript
assertAssetPath('assets/image.png', 'assets/');
```

## Complete Example

```typescript
import {
  setupLogseqTest,
  createSamplePage,
  createSampleBlock,
  createTestZip,
  verifyZipStructure,
  extractMarkdownFromZip,
  assertMarkdownStructure,
  assertLogseqAPICalled,
} from '@/testing/utils';

describe('Full Export Workflow', () => {
  it('should export page with assets to ZIP', async () => {
    // Setup
    const { mockAPI, cleanup } = setupLogseqTest({
      pages: [createSamplePage({ name: 'Export Test' })],
      blocks: [createSampleBlock({ content: 'Test content' })],
    });

    try {
      // Test export
      const page = await mockAPI.getPage('Export Test');
      expect(page).toBeTruthy();

      // Create mock export
      const markdown = `---
title: Export Test
---

# Export Test

Test content
`;

      // Verify markdown
      assertMarkdownStructure(markdown, {
        hasFrontmatter: true,
        hasHeading: 'Export Test',
        hasContent: 'Test content',
      });

      // Create ZIP
      const zip = await createTestZip({
        'export-test.md': markdown,
        'assets/image.png': new Blob(['data'], { type: 'image/png' }),
      });

      // Verify ZIP
      await verifyZipStructure(zip, {
        markdownFile: 'export-test.md',
        assetFolder: 'assets/',
        assetFiles: ['image.png'],
      });

      // Extract and verify
      const extracted = await extractMarkdownFromZip(zip, 'export-test.md');
      expect(extracted).toBe(markdown);

      // Verify API calls
      assertLogseqAPICalled(mockAPI, 'getPage', 1);
    } finally {
      cleanup();
    }
  });
});
```

## Integration with Existing Mock SDK

These utilities work with the existing `MockLogseqAPI` class from Phase 1.1:

```typescript
import { MockLogseqAPI } from '../mock-logseq-sdk';

const mockAPI = new MockLogseqAPI();
mockAPI.addPage(page);
mockAPI.setCurrentPage(page);
```

The utilities automatically install the mock API globally for use in tests.

## Best Practices

1. **Always cleanup**: Use `cleanup()` or `cleanupLogseqMocks()` in `afterEach` hooks
2. **Use sample helpers**: Prefer `createSamplePage()` over manual object creation
3. **Assert behavior**: Use custom assertions for clearer error messages
4. **Test isolation**: Each test should set up its own mock data
5. **ZIP testing**: Always verify structure before extracting content

## See Also

- `/Users/briansunter/code/blogseq/src/testing/utils/examples.test.tsx` - Complete examples
- `/Users/briansunter/code/blogseq/src/testing/mock-logseq-sdk/` - Mock SDK documentation
