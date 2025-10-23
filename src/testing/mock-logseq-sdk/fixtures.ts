import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";

/**
 * Sample UUIDs for testing
 */
export const TestUUIDs = {
  simplePage: "123e4567-e89b-12d3-a456-426614174000",
  pageWithAssets: "123e4567-e89b-12d3-a456-426614174001",
  pageWithProperties: "123e4567-e89b-12d3-a456-426614174002",
  emptyPage: "123e4567-e89b-12d3-a456-426614174003",
  simpleBlock: "223e4567-e89b-12d3-a456-426614174000",
  headingBlock: "223e4567-e89b-12d3-a456-426614174001",
  nestedBlock: "223e4567-e89b-12d3-a456-426614174002",
  blockWithRefs: "223e4567-e89b-12d3-a456-426614174003",
  propertyOnlyBlock: "223e4567-e89b-12d3-a456-426614174004",
  imageAsset: "323e4567-e89b-12d3-a456-426614174000",
  pdfAsset: "323e4567-e89b-12d3-a456-426614174001",
  referencedBlock: "223e4567-e89b-12d3-a456-426614174005",
  referencedPage: "123e4567-e89b-12d3-a456-426614174004",
} as const;

/**
 * Sample blocks for testing
 */
export const SampleBlocks: Record<string, BlockEntity> = {
  simple: {
    id: 1,
    uuid: TestUUIDs.simpleBlock,
    content: "This is a simple block of text.",
    format: "markdown",
    children: [],
    left: { id: 1 },
    parent: { id: 2 },
    page: { id: 100 },
  },

  heading: {
    id: 2,
    uuid: TestUUIDs.headingBlock,
    content: "This is a heading block",
    format: "markdown",
    properties: { "logseq.property/heading": 2 },
    children: [],
    left: { id: 3 },
    parent: { id: 4 },
    page: { id: 100 },
  },

  nested: {
    id: 3,
    uuid: TestUUIDs.nestedBlock,
    content: "Parent block",
    format: "markdown",
    children: [
      {
        id: 4,
        uuid: "nested-child-1",
        content: "Child block 1",
        format: "markdown",
        children: [],
        left: { id: 5 },
        parent: { id: 6 },
        page: { id: 100 },
      },
      {
        id: 5,
        uuid: "nested-child-2",
        content: "Child block 2",
        format: "markdown",
        children: [],
        left: { id: 7 },
        parent: { id: 8 },
        page: { id: 100 },
      },
    ],
    left: { id: 9 },
    parent: { id: 10 },
    page: { id: 100 },
  },

  withBlockRef: {
    id: 6,
    uuid: TestUUIDs.blockWithRefs,
    content: `This block references ((${TestUUIDs.referencedBlock})) and [[${TestUUIDs.referencedPage}]]`,
    format: "markdown",
    children: [],
    left: { id: 11 },
    parent: { id: 12 },
    page: { id: 100 },
  },

  propertyOnly: {
    id: 7,
    uuid: TestUUIDs.propertyOnlyBlock,
    content: "author:: Brian\ndate:: 2024-01-01",
    format: "markdown",
    children: [],
    left: { id: 13 },
    parent: { id: 14 },
    page: { id: 100 },
  },

  referenced: {
    id: 8,
    uuid: TestUUIDs.referencedBlock,
    content: "This is the referenced block content",
    format: "markdown",
    children: [],
    left: { id: 15 },
    parent: { id: 16 },
    page: { id: 100 },
  },
};

/**
 * Sample pages for testing
 */
export const SamplePages: Record<string, PageEntity> = {
  simple: {
    id: 100,
    uuid: TestUUIDs.simplePage,
    name: "Simple Page",
    originalName: "Simple Page",
    "journal?": false,
    properties: {},
    children: [],
  },

  withAssets: {
    id: 101,
    uuid: TestUUIDs.pageWithAssets,
    name: "Page With Assets",
    originalName: "Page With Assets",
    "journal?": false,
    properties: {},
    children: [],
  },

  withProperties: {
    id: 102,
    uuid: TestUUIDs.pageWithProperties,
    name: "Page With Properties",
    originalName: "Page With Properties",
    "journal?": false,
    properties: {
      "user.property/author": "Brian",
      "user.property/tags": ["typescript", "testing"],
      "user.property/date": "2024-01-01",
    },
    children: [],
  },

  empty: {
    id: 103,
    uuid: TestUUIDs.emptyPage,
    name: "Empty Page",
    originalName: "Empty Page",
    "journal?": false,
    properties: {},
    children: [],
  },

  referenced: {
    id: 104,
    uuid: TestUUIDs.referencedPage,
    name: "Referenced Page",
    originalName: "Referenced Page",
    "journal?": false,
    properties: {},
    children: [],
  },
};

/**
 * Sample assets for testing
 */
export const SampleAssets = {
  image: {
    uuid: TestUUIDs.imageAsset,
    title: "Sample Image",
    type: "png",
    properties: {
      "logseq.property.asset/type": "png",
    },
  },

  pdf: {
    uuid: TestUUIDs.pdfAsset,
    title: "Sample PDF",
    type: "pdf",
    properties: {
      "logseq.property.asset/type": "pdf",
    },
  },
};

/**
 * Sample graph info for testing
 */
export const SampleGraph = {
  path: "/Users/test/logseq-graph",
  name: "Test Graph",
};

/**
 * Sample DataScript query results
 */
export const SampleDataScriptResults = {
  assetQuery: (uuid: string, type: string) => [
    [type, { uuid, "block/title": `Asset ${uuid}`, ":logseq.property.asset/type": type }]
  ],

  propertyDefinitions: [
    [":user.property/author", "author"],
    [":user.property/tags", "tags"],
    [":user.property/date", "date"],
    [":user.property/blogTags", "blogTags"],
  ],

  pageProperties: (uuid: string) => [
    [":user.property/author", "author"],
    [":user.property/tags", "tags"],
  ],

  assetByTitle: (uuid: string, type: string) => [
    [{ $uuid: uuid }, type]
  ],

  dbReference: (uuid: string, type: string, title: string) => [
    [{ $uuid: uuid }, type, title]
  ],

  titleOnly: (title: string) => [
    [title]
  ],
};

/**
 * Sample block trees for testing
 */
export const SampleBlockTrees: Record<string, BlockEntity[]> = {
  simple: [
    SampleBlocks.simple,
  ],

  withHeadings: [
    SampleBlocks.heading,
    SampleBlocks.simple,
  ],

  nested: [
    SampleBlocks.nested,
  ],

  withReferences: [
    SampleBlocks.withBlockRef,
  ],

  mixed: [
    SampleBlocks.heading,
    SampleBlocks.simple,
    SampleBlocks.nested,
    SampleBlocks.propertyOnly,
  ],

  empty: [],
};

/**
 * Helper to create a mock Response for file operations
 */
export function createMockResponse(data: Blob | string, status = 200): Response {
  const blob = data instanceof Blob ? data : new Blob([data]);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    blob: async () => blob,
    text: async () => blob.text(),
    json: async () => JSON.parse(await blob.text()),
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
  } as Response;
}

/**
 * Helper to create a mock Blob for testing
 */
export function createMockBlob(content: string, type = "text/plain"): Blob {
  return new Blob([content], { type });
}

/**
 * Complex real-world scenario fixtures
 */

// Blog post with multiple asset types
export const ComplexBlogPost: PageEntity = {
  id: 200,
  uuid: "blog-post-123",
  name: "My Technical Blog Post",
  originalName: "My Technical Blog Post",
  "journal?": false,
  properties: {
    "user.property/author": "Brian Sunter",
    "user.property/tags": ["typescript", "testing", "logseq"],
    "user.property/date": "2024-01-15",
    "user.property/blogTags": ["programming", "web-development"],
    "user.property/status": "published",
  },
  children: [
    // Introduction heading
    {
      id: 201,
      uuid: "blog-block-1",
      content: "Introduction",
      format: "markdown",
      properties: { "logseq.property/heading": 2 },
      children: [],
      left: { id: 202 },
      parent: { id: 200 },
      page: { id: 200 },
    } as unknown as PageEntity,
    // Intro paragraph
    {
      id: 202,
      uuid: "blog-block-2",
      content: "This post discusses advanced testing patterns in TypeScript.",
      format: "markdown",
      children: [],
      left: { id: 203 },
      parent: { id: 200 },
      page: { id: 200 },
    } as unknown as PageEntity,
    // Nested content with image
    {
      id: 203,
      uuid: "blog-block-3",
      content: "Here's a diagram: [[diagram-uuid-001]]",
      format: "markdown",
      children: [
        {
          id: 204,
          uuid: "blog-block-4",
          content: "The diagram shows the architecture",
          format: "markdown",
          children: [],
          left: { id: 205 },
          parent: { id: 203 },
          page: { id: 200 },
        } as unknown as PageEntity,
      ],
      left: { id: 204 },
      parent: { id: 200 },
      page: { id: 200 },
    } as unknown as PageEntity,
    // Code section with reference
    {
      id: 205,
      uuid: "blog-block-5",
      content: "Implementation Details",
      format: "markdown",
      properties: { "logseq.property/heading": 2 },
      children: [],
      left: { id: 206 },
      parent: { id: 200 },
      page: { id: 200 },
    } as unknown as PageEntity,
    // Block with reference
    {
      id: 206,
      uuid: "blog-block-6",
      content: "See the full code ((code-block-uuid-001))",
      format: "markdown",
      children: [],
      left: { id: 207 },
      parent: { id: 200 },
      page: { id: 200 },
    } as unknown as PageEntity,
  ],
};

// Edge case: Very deep nesting (10 levels)
export const DeeplyNestedPage: PageEntity = {
  id: 300,
  uuid: "deep-nested-123",
  name: "Deeply Nested Content",
  originalName: "Deeply Nested Content",
  "journal?": false,
  properties: {},
  children: [],
};

// Helper to create deeply nested structure
export function createDeeplyNestedBlocks(depth: number): BlockEntity {
  const createLevel = (level: number): BlockEntity => {
    const block: BlockEntity = {
      id: 300 + level,
      uuid: `deep-block-${level}`,
      content: `Level ${level} content`,
      format: "markdown",
      children: level < depth ? [createLevel(level + 1)] : [],
      left: { id: 300 + level + 1 },
      parent: { id: 300 + level - 1 },
      page: { id: 300 },
    };
    return block;
  };

  return createLevel(1);
}

// Edge case: Large content block (10KB text)
export const LargeContentBlock: BlockEntity = {
  id: 400,
  uuid: "large-content-block",
  content: "Lorem ipsum ".repeat(1000) + "Final sentence.",
  format: "markdown",
  children: [],
  left: { id: 401 },
  parent: { id: 402 },
  page: { id: 400 },
};

// Edge case: Block with many children (100 items)
export const BlockWithManyChildren: BlockEntity = {
  id: 500,
  uuid: "many-children-block",
  content: "Parent block with many children",
  format: "markdown",
  children: Array.from({ length: 100 }, (_, i) => ({
    id: 500 + i + 1,
    uuid: `child-${i}`,
    content: `Child block ${i}`,
    format: "markdown",
    children: [],
    left: { id: 500 + i + 2 },
    parent: { id: 500 },
    page: { id: 500 },
  })),
  left: { id: 501 },
  parent: { id: 502 },
  page: { id: 500 },
};

// Property fixtures with various data types
export const PropertyVarietyPage: PageEntity = {
  id: 600,
  uuid: "property-variety-123",
  name: "Property Variety Test",
  originalName: "Property Variety Test",
  "journal?": false,
  properties: {
    // String
    "user.property/title": "Test Title",
    // Number
    "user.property/count": 42,
    // Boolean
    "user.property/published": true,
    // Array of strings
    "user.property/tags": ["tag1", "tag2", "tag3"],
    // Array of numbers
    "user.property/ratings": [4.5, 5.0, 4.8],
    // Nested object
    "user.property/metadata": {
      author: "Brian",
      version: "1.0",
      timestamps: {
        created: "2024-01-01",
        modified: "2024-01-15",
      },
    },
    // Date string
    "user.property/date": "2024-01-15T10:30:00Z",
    // URL
    "user.property/url": "https://example.com",
    // Empty string
    "user.property/empty": "",
    // Null value
    "user.property/nullable": null,
    // Special characters
    "user.property/special": "Value with: colons, commas, and [brackets]",
  },
  children: [],
};

// Assets with different types
export const AssetVarietyFixtures = {
  png: {
    uuid: "asset-png-001",
    title: "Screenshot.png",
    type: "png",
    properties: { "logseq.property.asset/type": "png" },
  },
  jpg: {
    uuid: "asset-jpg-001",
    title: "Photo.jpg",
    type: "jpg",
    properties: { "logseq.property.asset/type": "jpg" },
  },
  gif: {
    uuid: "asset-gif-001",
    title: "Animation.gif",
    type: "gif",
    properties: { "logseq.property.asset/type": "gif" },
  },
  svg: {
    uuid: "asset-svg-001",
    title: "Diagram.svg",
    type: "svg",
    properties: { "logseq.property.asset/type": "svg" },
  },
  pdf: {
    uuid: "asset-pdf-001",
    title: "Document.pdf",
    type: "pdf",
    properties: { "logseq.property.asset/type": "pdf" },
  },
  md: {
    uuid: "asset-md-001",
    title: "Notes.md",
    type: "md",
    properties: { "logseq.property.asset/type": "md" },
  },
  mp4: {
    uuid: "asset-mp4-001",
    title: "Video.mp4",
    type: "mp4",
    properties: { "logseq.property.asset/type": "mp4" },
  },
  zip: {
    uuid: "asset-zip-001",
    title: "Archive.zip",
    type: "zip",
    properties: { "logseq.property.asset/type": "zip" },
  },
};

// Journal page fixture
export const JournalPage: PageEntity = {
  id: 700,
  uuid: "journal-2024-01-15",
  name: "Jan 15th, 2024",
  originalName: "Jan 15th, 2024",
  "journal?": true,
  properties: {
    "user.property/date": "2024-01-15",
  },
  children: [
    {
      id: 701,
      uuid: "journal-block-1",
      content: "Morning thoughts",
      format: "markdown",
      children: [],
      left: { id: 702 },
      parent: { id: 700 },
      page: { id: 700 },
    } as unknown as PageEntity,
  ],
};

// Page with complex reference structure
export const PageWithComplexReferences: PageEntity = {
  id: 800,
  uuid: "complex-refs-123",
  name: "Complex References",
  originalName: "Complex References",
  "journal?": false,
  properties: {},
  children: [
    // Block with page reference
    {
      id: 801,
      uuid: "ref-block-1",
      content: "See [[Referenced Page]] for details",
      format: "markdown",
      children: [],
      left: { id: 802 },
      parent: { id: 800 },
      page: { id: 800 },
    } as unknown as PageEntity,
    // Block with block reference
    {
      id: 802,
      uuid: "ref-block-2",
      content: "Quote: ((223e4567-e89b-12d3-a456-426614174005))",
      format: "markdown",
      children: [],
      left: { id: 803 },
      parent: { id: 800 },
      page: { id: 800 },
    } as unknown as PageEntity,
    // Block with asset reference
    {
      id: 803,
      uuid: "ref-block-3",
      content: "Image: [[323e4567-e89b-12d3-a456-426614174000]]",
      format: "markdown",
      children: [],
      left: { id: 804 },
      parent: { id: 800 },
      page: { id: 800 },
    } as unknown as PageEntity,
    // Block with mixed references
    {
      id: 804,
      uuid: "ref-block-4",
      content: "See [[Page A]] and ((block-uuid-123)) and [[asset-uuid-456]]",
      format: "markdown",
      children: [],
      left: { id: 805 },
      parent: { id: 800 },
      page: { id: 800 },
    } as unknown as PageEntity,
  ],
};

/**
 * Complete scenario fixtures for common use cases
 */
export const ScenarioFixtures = {
  // Simple blog post
  simpleBlogPost: {
    page: SamplePages.simple,
    blocks: [SampleBlocks.simple, SampleBlocks.heading],
    assets: [],
  },

  // Blog post with images
  blogPostWithImages: {
    page: ComplexBlogPost,
    blocks: ComplexBlogPost.children,
    assets: [AssetVarietyFixtures.png, AssetVarietyFixtures.jpg],
  },

  // Technical documentation
  technicalDocs: {
    page: {
      id: 900,
      uuid: "tech-docs-123",
      name: "API Documentation",
      originalName: "API Documentation",
      "journal?": false,
      properties: {
        "user.property/type": "documentation",
        "user.property/version": "1.0",
      },
      children: [],
    } as PageEntity,
    blocks: [
      SampleBlocks.heading,
      SampleBlocks.simple,
      SampleBlocks.nested,
    ],
    assets: [AssetVarietyFixtures.pdf, AssetVarietyFixtures.md],
  },

  // Daily journal
  dailyJournal: {
    page: JournalPage,
    blocks: JournalPage.children,
    assets: [],
  },

  // Page with all property types
  propertyShowcase: {
    page: PropertyVarietyPage,
    blocks: [],
    assets: [],
  },

  // Complex nested structure
  deeplyNested: {
    page: DeeplyNestedPage,
    blocks: [createDeeplyNestedBlocks(10)],
    assets: [],
  },

  // Performance test scenario
  performance: {
    page: {
      id: 1000,
      uuid: "performance-test-123",
      name: "Performance Test",
      originalName: "Performance Test",
      "journal?": false,
      properties: {},
      children: [],
    } as PageEntity,
    blocks: [BlockWithManyChildren],
    assets: Object.values(AssetVarietyFixtures),
  },
};
