# Mock Logseq SDK

A comprehensive, configurable mock implementation of the Logseq API for testing the BlogSeq plugin.

## Overview

This mock SDK provides three main components:

1. **MockLogseqAPI** - Mocks all Logseq API methods (Editor, DB, App, etc.)
2. **MockFileAPI** - Mocks file operations (fetch, saveAs, clipboard, etc.)
3. **MockDOMHelpers** - Mocks DOM operations (createElement, appendChild, etc.)

## Installation

The mock SDK is located in `src/testing/mock-logseq-sdk/` and can be imported directly:

```typescript
import {
  MockLogseqAPI,
  MockFileAPI,
  MockDOMHelpers,
  SamplePages,
  SampleBlocks,
  PageBuilder,
  BlockBuilder,
} from '@/testing/mock-logseq-sdk';
```

## Quick Start

### Basic Usage

```typescript
import { MarkdownExporter } from '@/markdownExporter';
import { MockLogseqAPI, SamplePages, SampleBlockTrees } from '@/testing/mock-logseq-sdk';

// Create mock API
const mockLogseq = new MockLogseqAPI();

// Configure with test data
mockLogseq
  .setCurrentPage(SamplePages.simple)
  .addPage(SamplePages.simple)
  .setCurrentGraph({ path: '/test/graph' });

// Add blocks for the page
SampleBlockTrees.simple.forEach(block => mockLogseq.addBlock(block));

// Use with exporter
const exporter = new MarkdownExporter(mockLogseq);
const result = await exporter.exportCurrentPage();

// Make assertions
expect(result).toContain('Simple Page');
expect(mockLogseq.calls.getCurrentPage).toHaveLength(1);
```

### Using Builders

```typescript
import { PageBuilder, BlockBuilder } from '@/testing/mock-logseq-sdk';

// Build a custom page
const page = new PageBuilder()
  .withName('My Test Page')
  .withAuthor('Brian')
  .withTags('typescript', 'testing')
  .build();

// Build blocks
const headingBlock = new BlockBuilder()
  .withContent('Introduction')
  .withHeadingLevel(2)
  .build();

const textBlock = new BlockBuilder()
  .withContent('This is some content')
  .withTags('important')
  .build();

// Add to mock
mockLogseq.addPage(page).setCurrentPage(page);
mockLogseq.addBlock(headingBlock).addBlock(textBlock);
```

### Using Factory Functions

```typescript
import { createBlogPost, createJournalPage, createPreConfiguredSDK } from '@/testing/mock-logseq-sdk';

// Create a blog post
const blogPost = createBlogPost({
  title: 'My First Post',
  author: 'Brian',
  tags: ['typescript', 'logseq'],
  date: '2024-01-15',
  sections: [
    { heading: 'Introduction', content: 'Welcome to my blog!' },
    { heading: 'Main Content', content: 'Here is the main content...' }
  ]
});

// Create a journal page
const journal = createJournalPage('2024-01-15');

// Create pre-configured SDK with common data
const sdk = createPreConfiguredSDK();
// Already has property definitions and graph set up
```

## API Reference

### MockLogseqAPI

#### Core Methods

```typescript
// Get current page
getCurrentPage(): Promise<PageEntity | null>

// Get page by UUID
getPage(uuid: string): Promise<PageEntity | null>

// Get block by UUID
getBlock(uuid: string, opts?: { includeChildren?: boolean }): Promise<BlockEntity | null>

// Get page blocks tree
getPageBlocksTree(pageUuid: string): Promise<BlockEntity[]>

// Get current graph
getCurrentGraph(): Promise<{ path: string } | null>

// Execute DataScript query
datascriptQuery(query: string): Promise<unknown[][]>

// Show message
showMsg(message: string, type: 'success' | 'error' | 'warning'): void
```

#### Configuration Methods

```typescript
// Set current page
setCurrentPage(page: PageEntity | null): this

// Add pages and blocks
addPage(page: PageEntity): this
addBlock(block: BlockEntity): this

// Add assets
addAsset(uuid: string, type: string, entity: PageEntity | BlockEntity): this

// Set graph
setCurrentGraph(graph: { path: string; name?: string } | null): this

// Add property definitions
addPropertyDefinition(ident: string, title: string): this

// Add custom DataScript query patterns
addQueryPattern(
  pattern: RegExp | string,
  handler: (query: string, state: MockLogseqState) => unknown[][]
): this
```

#### State Management

```typescript
// Reset state with optional seed
reset(seed?: Partial<MockLogseqState>): this

// Save current state as seed for future resets
saveSeed(): this

// Reset call tracking
resetCalls(): this

// Get current state (for testing/debugging)
getState(): MockLogseqState

// Get all messages shown
getMessages(): Array<{ message: string; type: "success" | "error" | "warning" }>
```

#### Error Simulation Methods

```typescript
// Throw error on next call
throwOnNextCall(method: keyof LogseqAPI, error?: Error): this

// Throw error after N calls
throwAfterNCalls(method: keyof LogseqAPI, n: number, error?: Error): this

// Clear error simulation
clearErrorSimulation(method: keyof LogseqAPI): this
clearAllErrorSimulations(): this
```

#### Timing Simulation Methods

```typescript
// Delay responses by N milliseconds
delayResponse(method: keyof LogseqAPI, delayMs: number): this

// Clear timing simulation
clearTimingSimulation(method: keyof LogseqAPI): this
clearAllTimingSimulations(): this
```

#### Query Inspection Methods

```typescript
// Get the last DataScript query executed
getLastQuery(): string | undefined

// Get full query history with results and timestamps
getQueryHistory(): Array<{ query: string; result: unknown[][]; timestamp: number }>

// Get queries matching a pattern
getQueriesMatching(pattern: RegExp | string): string[]

// Clear query history
clearQueryHistory(): this
```

#### Call Verification Methods

```typescript
// Check if a method was called
wasCalled(method: keyof typeof calls): boolean

// Check if a method was called with specific arguments
wasCalledWith(method: 'getPage' | 'getBlock' | 'getPageBlocksTree', ...args: unknown[]): boolean

// Get number of times a method was called
getCallCount(method: keyof typeof calls): number

// Get all calls to a specific method
getCalls(method: keyof typeof calls): unknown[]
```

#### State Inspection Methods

```typescript
// Get all pages/blocks/assets in state
getPages(): PageEntity[]
getBlocks(): BlockEntity[]
getAssets(): Array<{ uuid: string; type: string; entity: PageEntity | BlockEntity }>

// Get counts
getPageCount(): number
getBlockCount(): number
getAssetCount(): number

// Check existence
hasPage(uuid: string): boolean
hasBlock(uuid: string): boolean
hasAsset(uuid: string): boolean
```

#### Call Tracking

```typescript
mockLogseq.calls.getCurrentPage // Array of calls
mockLogseq.calls.getPage        // Array of UUIDs requested
mockLogseq.calls.getBlock       // Array of { uuid, opts }
mockLogseq.calls.datascriptQuery // Array of queries executed
mockLogseq.calls.showMsg        // Array of { message, type }
```

### MockFileAPI

#### Core Methods

```typescript
// Fetch a file
fetch(url: string): Promise<Response>

// Save a blob
saveAs(blob: Blob, filename: string): void

// Create object URL
createObjectURL(blob: Blob): string

// Revoke object URL
revokeObjectURL(url: string): void

// Write to clipboard
writeToClipboard(text: string): Promise<void>
```

#### Configuration Methods

```typescript
// Set response for a URL
setFetchResponse(url: string, response: Response | string | Blob, status?: number): this

// Set multiple responses
setFetchResponses(responses: Record<string, Response | string | Blob>): this

// Simulate fetch error
setFetchError(url: string, error?: Error): this

// Simulate clipboard error
throwErrorOnClipboard(error?: Error): this

// Reset
reset(): this
```

#### Inspection Methods

```typescript
// Get clipboard content
getClipboardContent(): string

// Get saved files
getSavedFiles(): Array<{ blob: Blob; filename: string }>
getLastSavedFile(): { blob: Blob; filename: string } | undefined

// Read saved blob content
readSavedBlobContent(index?: number): Promise<string>

// Check operations
wasFetched(url: string): boolean
wasSavedAs(filename: string): boolean
```

### MockDOMHelpers

#### Core Methods

```typescript
// Create element
createElement(tagName: string): HTMLElement

// Append to body
appendChild(element: HTMLElement): void

// Remove from body
removeChild(element: HTMLElement): void
```

#### Configuration Methods

```typescript
// Set click handler
setClickHandler(element: HTMLElement, handler: () => void): this

// Simulate clicks
clickElement(element: HTMLElement): this
clickLastElement(): this

// Reset
reset(): this
```

#### Inspection Methods

```typescript
// Get created elements
getCreatedElements(): MockHTMLElement[]
getLastCreatedElement(): MockHTMLElement | undefined

// Get appended elements
getAppendedElements(): MockHTMLElement[]
getLastAppendedElement(): MockHTMLElement | undefined

// Filter elements
getElementsByTagName(tagName: string): MockHTMLElement[]
getAnchors(): Array<{ element, href, download }>

// Check operations
wasCreated(tagName: string): boolean
wasAppended(element: HTMLElement): boolean
wasRemoved(element: HTMLElement): boolean

// Count operations
countCreated(tagName: string): number

// Verify download
verifyDownload(expectedFilename?: string, expectedHref?: string): {
  success: boolean;
  anchor?: MockHTMLElement;
  error?: string;
}
```

## Fixtures

Pre-built test data for common scenarios:

### TestUUIDs

Predefined UUIDs for consistent testing:

```typescript
TestUUIDs.simplePage
TestUUIDs.pageWithAssets
TestUUIDs.pageWithProperties
TestUUIDs.simpleBlock
TestUUIDs.headingBlock
TestUUIDs.imageAsset
// ... and more
```

### SamplePages

```typescript
SamplePages.simple          // Basic page
SamplePages.withAssets      // Page with asset references
SamplePages.withProperties  // Page with various properties
SamplePages.empty           // Empty page
```

### SampleBlocks

```typescript
SampleBlocks.simple         // Plain text block
SampleBlocks.heading        // Heading block (h2)
SampleBlocks.nested         // Block with children
SampleBlocks.withBlockRef   // Block with ((uuid)) reference
SampleBlocks.propertyOnly   // Property-only block
```

### Complex Fixtures

```typescript
ComplexBlogPost             // Blog post with multiple sections and assets
DeeplyNestedPage            // Page with 10 levels of nesting
LargeContentBlock           // Block with 10KB of text
BlockWithManyChildren       // Block with 100 children
PropertyVarietyPage         // Page with all property types
AssetVarietyFixtures        // All asset types (png, jpg, pdf, etc.)
JournalPage                 // Journal page example
PageWithComplexReferences   // Page with mixed references
```

### Scenario Fixtures

```typescript
ScenarioFixtures.simpleBlogPost      // Simple blog scenario
ScenarioFixtures.blogPostWithImages  // Blog with images
ScenarioFixtures.technicalDocs       // Documentation scenario
ScenarioFixtures.dailyJournal        // Journal scenario
ScenarioFixtures.propertyShowcase    // All property types
ScenarioFixtures.deeplyNested        // Deep nesting test
ScenarioFixtures.performance         // Performance test scenario
```

## Builders

### PageBuilder

Fluent API for building pages:

```typescript
new PageBuilder()
  .withValidation()           // Enable validation
  .withUuid(uuid)            // Set UUID
  .withId(id)                // Set ID
  .withName(name)            // Set name
  .withProperty(key, value)  // Add single property
  .withProperties(props)     // Add multiple properties
  .withBlocks(blocks)        // Set blocks
  .asJournalPage()           // Mark as journal
  .withAuthor(author)        // Convenience: add author property
  .withTags(...tags)         // Convenience: add tags property
  .withDate(date)            // Convenience: add date property
  .clone()                   // Clone this builder
  .build()                   // Build PageEntity
```

### BlockBuilder

Fluent API for building blocks:

```typescript
new BlockBuilder()
  .withValidation()              // Enable validation
  .withUuid(uuid)               // Set UUID
  .withId(id)                   // Set ID
  .withContent(content)         // Set content
  .appendContent(content)       // Append to content
  .prependContent(content)      // Prepend to content
  .withProperty(key, value)     // Add property
  .withHeadingLevel(level)      // Set heading level (1-6)
  .withChildren(blocks)         // Set children
  .addChild(block)              // Add single child
  .withParent(parentId)         // Set parent ID
  .withLeft(leftId)             // Set left sibling ID
  .withPage(pageId)             // Set page ID
  .withFormat(format)           // Set format (markdown/org)
  .asPropertyOnly(props)        // Property-only block
  .withBlockReference(uuid)     // Add ((uuid)) reference
  .withPageReference(name)      // Add [[name]] reference
  .withTag(tag)                 // Add #tag
  .withTags(...tags)            // Add multiple tags
  .clone()                      // Clone this builder
  .build()                      // Build BlockEntity
```

### AssetBuilder

Fluent API for building assets:

```typescript
new AssetBuilder()
  .withUuid(uuid)           // Set UUID
  .withTitle(title)         // Set title
  .withType(type)           // Set type
  .asImage('png')           // Set as image type
  .asPdf()                  // Set as PDF
  .asDocument('md')         // Set as document
  .withProperty(key, value) // Add property
  .build()                  // Build asset object
  .buildAsBlock()           // Build as BlockEntity
  .buildAsPage()            // Build as PageEntity
```

### GraphBuilder

```typescript
new GraphBuilder()
  .withPath(path)
  .withName(name)
  .build()
```

## Factory Functions

### createBlogPost

Create a blog post page with typical structure:

```typescript
const post = createBlogPost({
  title: 'My First Post',
  author: 'Brian',
  tags: ['typescript', 'logseq'],
  date: '2024-01-15',
  sections: [
    { heading: 'Introduction', content: 'Welcome!' },
    { heading: 'Main Content', content: 'Content here...' }
  ]
});
```

### createNotesPage

Create a notes page with hierarchical structure:

```typescript
const notes = createNotesPage({
  title: 'TypeScript Notes',
  topics: [
    {
      heading: 'Types',
      level: 2,
      notes: ['String', 'Number', 'Boolean']
    },
    {
      heading: 'Interfaces',
      level: 2,
      notes: ['Defining interfaces', 'Extending interfaces']
    }
  ]
});
```

### createJournalPage

Create a journal page for a specific date:

```typescript
const journal = createJournalPage('2024-01-15');
// Creates: "Jan 15th, 2024" journal page
```

### createDocumentationPage

Create a documentation page with API references:

```typescript
const docs = createDocumentationPage({
  title: 'API Documentation',
  version: '1.0',
  sections: [
    {
      heading: 'Installation',
      description: 'How to install...',
      examples: ['npm install package', 'yarn add package']
    },
    {
      heading: 'Usage',
      description: 'How to use...',
      examples: ['import { fn } from "package"']
    }
  ]
});
```

### createTaskPage

Create a task page with checkboxes:

```typescript
const tasks = createTaskPage({
  title: 'Project Tasks',
  tasks: [
    { description: 'Setup project', completed: true },
    { description: 'Write tests', completed: false },
    { description: 'Deploy', completed: false }
  ]
});
```

## Advanced Usage

### Error Simulation

```typescript
// Throw error on next call
mockLogseq.throwOnNextCall('getCurrentPage', new Error('Page not found'));

// Throw error after 3 successful calls
mockLogseq.throwAfterNCalls('getBlock', 3, new Error('Rate limit exceeded'));

// Clear error simulation
mockLogseq.clearErrorSimulation('getCurrentPage');
```

### Timing Simulation

```typescript
// Simulate slow API (500ms delay)
mockLogseq.delayResponse('datascriptQuery', 500);

// Test race conditions
mockLogseq
  .delayResponse('getCurrentPage', 100)
  .delayResponse('getPageBlocksTree', 200);

// Clear timing simulation
mockLogseq.clearTimingSimulation('datascriptQuery');
```

### Query Inspection

```typescript
// Get last query
const lastQuery = mockLogseq.getLastQuery();

// Get full query history with timestamps
const history = mockLogseq.getQueryHistory();
console.log(history[0].query);
console.log(history[0].result);
console.log(history[0].timestamp);

// Find queries matching pattern
const assetQueries = mockLogseq.getQueriesMatching(/asset\/type/);
```

### Call Verification

```typescript
// Check if method was called
expect(mockLogseq.wasCalled('getCurrentPage')).toBe(true);

// Check if called with specific argument
expect(mockLogseq.wasCalledWith('getPage', 'some-uuid')).toBe(true);

// Get call count
expect(mockLogseq.getCallCount('datascriptQuery')).toBe(5);

// Get all calls
const allCalls = mockLogseq.getCalls('getPage');
```

### State Inspection

```typescript
// Get all entities
const pages = mockLogseq.getPages();
const blocks = mockLogseq.getBlocks();
const assets = mockLogseq.getAssets();

// Get counts
console.log(`Pages: ${mockLogseq.getPageCount()}`);
console.log(`Blocks: ${mockLogseq.getBlockCount()}`);

// Check existence
if (mockLogseq.hasPage('some-uuid')) {
  // Page exists
}
```

### State Management with Seeds

```typescript
// Setup initial state
mockLogseq
  .addPage(SamplePages.simple)
  .addBlock(SampleBlocks.heading)
  .saveSeed(); // Save as seed

// Run test that modifies state
await exporter.exportCurrentPage();

// Reset to seed state
mockLogseq.reset(); // Returns to saved seed

// Reset to fresh state
mockLogseq.reset({}); // Clears everything

// Reset to custom seed
mockLogseq.reset({
  pages: new Map([['uuid', somePage]]),
  blocks: new Map()
});
```

### Custom DataScript Query Patterns

```typescript
mockLogseq.addQueryPattern(
  /\[:find \?title :where \[?e :block\/title \?title\]\]/,
  (query, state) => {
    return Array.from(state.pages.values()).map(p => [p.name]);
  }
);

// Now any query matching this pattern will use your handler
const results = await mockLogseq.datascriptQuery('[:find ?title :where [?e :block/title ?title]]');
```

### Builder Validation

```typescript
// Enable validation
const page = new PageBuilder()
  .withValidation()
  .withUuid('invalid-uuid') // Throws error!
  .build();

// Validate heading levels
const block = new BlockBuilder()
  .withValidation()
  .withHeadingLevel(7) // Throws error! Must be 1-6
  .build();
```

### Builder Cloning

```typescript
// Create base template
const baseBlock = new BlockBuilder()
  .withProperty('template', 'true')
  .withTags('template');

// Clone and customize
const block1 = baseBlock.clone().withContent('Block 1').build();
const block2 = baseBlock.clone().withContent('Block 2').build();
const block3 = baseBlock.clone().withContent('Block 3').build();
```

## Complete Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownExporter } from '@/markdownExporter';
import {
  createPreConfiguredSDK,
  PageBuilder,
  BlockBuilder,
  createBlogPost,
  resetMockSDK,
} from '@/testing/mock-logseq-sdk';

describe('MarkdownExporter with Mock SDK', () => {
  let sdk: ReturnType<typeof createPreConfiguredSDK>;
  let exporter: MarkdownExporter;

  beforeEach(() => {
    sdk = createPreConfiguredSDK();
    exporter = new MarkdownExporter(sdk.logseq, sdk.file, sdk.dom);
  });

  afterEach(() => {
    resetMockSDK(sdk);
  });

  it('should export a blog post', async () => {
    // Setup using factory
    const page = createBlogPost({
      title: 'Test Post',
      author: 'Brian',
      tags: ['test'],
      sections: [
        { heading: 'Intro', content: 'Hello' }
      ]
    });

    sdk.logseq.setCurrentPage(page).addPage(page);

    // Execute
    const result = await exporter.exportCurrentPage();

    // Assert
    expect(result).toContain('# Test Post');
    expect(result).toContain('## Intro');
    expect(sdk.logseq.wasCalled('getCurrentPage')).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Simulate error
    sdk.logseq.throwOnNextCall('getCurrentPage', new Error('No page'));

    // Execute and verify error handling
    await expect(exporter.exportCurrentPage()).rejects.toThrow('NO_ACTIVE_PAGE');
  });

  it('should track query patterns', async () => {
    const page = new PageBuilder().withName('Query Test').build();
    sdk.logseq.setCurrentPage(page).addPage(page);

    await exporter.exportCurrentPage();

    // Verify queries
    const queries = sdk.logseq.getQueriesMatching(/property/);
    expect(queries.length).toBeGreaterThan(0);
  });
});
```

## Common Testing Patterns

### Testing with Assets

```typescript
it('should handle image assets', async () => {
  const imageUuid = '323e4567-e89b-12d3-a456-426614174000';

  const page = new PageBuilder().withName('Page With Image').build();
  const block = new BlockBuilder()
    .withContent(`Check out this image: [[${imageUuid}]]`)
    .build();

  page.children = [block as any];

  sdk.logseq
    .setCurrentPage(page)
    .addPage(page)
    .addBlock(block)
    .addAsset(imageUuid, 'png', {
      uuid: imageUuid,
      name: 'My Image',
      properties: { 'logseq.property.asset/type': 'png' },
      children: [],
    } as any);

  const result = await exporter.exportCurrentPage();

  expect(result).toContain('![My Image](assets/');
  expect(exporter.getReferencedAssets().has(imageUuid)).toBe(true);
});
```

### Testing Performance

```typescript
it('should handle large pages efficiently', async () => {
  const page = ScenarioFixtures.performance.page;

  sdk.logseq.setCurrentPage(page).addPage(page);
  ScenarioFixtures.performance.blocks.forEach(b => sdk.logseq.addBlock(b));

  const startTime = Date.now();
  await exporter.exportCurrentPage();
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(1000); // Should complete in under 1 second
});
```

### Testing Edge Cases

```typescript
it('should handle deeply nested blocks', async () => {
  const page = ScenarioFixtures.deeplyNested.page;
  const deepBlock = createDeeplyNestedBlocks(10);

  page.children = [deepBlock as any];
  sdk.logseq.setCurrentPage(page).addPage(page).addBlock(deepBlock);

  const result = await exporter.exportCurrentPage();

  expect(result).toContain('Level 1 content');
  expect(result).toContain('Level 10 content');
});
```

## Design Decisions

1. **Class-based API**: Provides fluent interface for configuration
2. **Call tracking**: All methods track calls for easy assertion
3. **Chainable methods**: Configuration methods return `this` for chaining
4. **Type-safe**: Full TypeScript support with proper types
5. **Isolated state**: Each mock instance has its own state
6. **Pattern matching**: DataScript queries use regex patterns for flexibility
7. **Fixtures**: Pre-built data for common scenarios
8. **Builders**: Fluent API for creating custom test data
9. **Factory functions**: High-level helpers for common page types
10. **Validation**: Optional validation in builders for catching errors early

## Limitations

1. DataScript query support is pattern-based, not a full implementation
2. DOM operations are mocked, not real DOM
3. File operations don't actually touch the filesystem
4. UUID generation is not cryptographically secure (test only)
5. Timing simulation uses setTimeout (not perfect for precise timing)

## Migration Guide

### From Old Mocks

If you're migrating from previous mocking approaches:

**Old approach:**
```typescript
const mockLogseq = { getCurrentPage: vi.fn() };
```

**New approach:**
```typescript
const mockLogseq = new MockLogseqAPI();
mockLogseq.setCurrentPage(SamplePages.simple);
```

**Benefits:**
- Type safety
- State management
- Call tracking built-in
- No manual vi.fn() setup
- Reusable fixtures
- Advanced features (timing, errors, etc.)

## Troubleshooting

### "Invalid UUID format" error

Enable validation to catch UUID format errors:

```typescript
const page = new PageBuilder()
  .withValidation()
  .withUuid('must-be-valid-uuid-format')
  .build();
```

### Query not matching

Check query patterns and add custom pattern if needed:

```typescript
mockLogseq.addQueryPattern(
  /your-pattern/,
  (query, state) => {
    console.log('Query:', query);
    return [/* results */];
  }
);
```

### State not resetting between tests

Use `beforeEach` and `afterEach`:

```typescript
let sdk: ReturnType<typeof createPreConfiguredSDK>;

beforeEach(() => {
  sdk = createPreConfiguredSDK();
});

afterEach(() => {
  resetMockSDK(sdk);
});
```

## Contributing

When adding new mock functionality:

1. Add method to appropriate mock class
2. Add call tracking
3. Update fixtures if needed
4. Update this README
5. Add tests demonstrating usage

## License

Part of the BlogSeq project.
