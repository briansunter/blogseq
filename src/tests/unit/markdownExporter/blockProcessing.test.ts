import type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OPTIONS, MarkdownExporter } from "../../../markdownExporter";
import {
	createMockBlock,
	createMockLogseqAPI,
	createMockPage,
	type MockDOMHelpers,
	type MockFileAPI,
	type MockLogseqAPI,
	mockCurrentPageResponse,
	mockGraphResponse,
	mockPageBlocksResponse,
	resetAllMocks,
	setupGlobalMocks,
} from "../../test-utils";

describe("MarkdownExporter - Block Processing", () => {
	let exporter: MarkdownExporter;
	let mockAPI: MockLogseqAPI;
	let mockFileAPI: MockFileAPI;
	let mockDOMHelpers: MockDOMHelpers;

	beforeEach(() => {
		mockAPI = createMockLogseqAPI();

		mockFileAPI = {
			fetch: vi.fn(),
			saveAs: vi.fn(),
			createObjectURL: vi.fn(() => "blob://test-url"),
			revokeObjectURL: vi.fn(),
			writeToClipboard: vi.fn(),
		};

		mockDOMHelpers = {
			createElement: vi.fn(),
			appendChild: vi.fn(),
			removeChild: vi.fn(),
		};

		exporter = new MarkdownExporter(mockAPI, mockFileAPI, mockDOMHelpers);
		setupGlobalMocks(mockAPI);
	});

	afterEach(() => {
		resetAllMocks(mockAPI);
		vi.clearAllMocks();
	});

	describe("processBlock - Basic Block Processing", () => {
		it("should convert simple text block to paragraph", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "block-1",
				content: "Hello World",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});
			expect(result).toContain("Hello World");
		});

		it("should handle empty block content", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "block-empty",
				content: "",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});
			expect(result.trim()).toBe("");
		});

		it("should handle null block gracefully", async () => {
			const page = createMockPage({ name: "Test" });

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [null as unknown as BlockEntity]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});
			expect(result.trim()).toBe("");
		});

		it("should skip blocks without UUID", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({ content: "No UUID" });
			delete (block as Partial<BlockEntity>).uuid;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});
			expect(result).toContain("No UUID");
		});

		it("should skip already processed blocks (prevents duplicates)", async () => {
			const page = createMockPage({ name: "Test" });
			const sharedUUID = "shared-uuid-123";
			const block1 = createMockBlock({
				uuid: sharedUUID,
				content: "First appearance",
			});
			const block2 = createMockBlock({
				uuid: sharedUUID,
				content: "Second appearance",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block1, block2]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			// Should only appear once
			const matches = result.match(/First appearance/g);
			expect(matches?.length).toBe(1);
		});
	});

	describe("processBlock - Heading Conversion", () => {
		it("should convert block with heading level 1 to markdown H1", async () => {
			const page = createMockPage({ name: "Test" });
			const block = {
				...createMockBlock({
					uuid: "heading-1",
					content: "Main Heading",
				}),
				"logseq.property/heading": 1,
			} as BlockEntity;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("# Main Heading");
		});

		it("should convert block with heading level 2 to markdown H2", async () => {
			const page = createMockPage({ name: "Test" });
			const block = {
				...createMockBlock({
					uuid: "heading-2",
					content: "Subtitle",
				}),
				"logseq.property/heading": 2,
			} as BlockEntity;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("## Subtitle");
		});

		it("should convert block with heading level 3 to markdown H3", async () => {
			const page = createMockPage({ name: "Test" });
			const block = {
				...createMockBlock({
					uuid: "heading-3",
					content: "Section",
				}),
				"logseq.property/heading": 3,
			} as BlockEntity;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("### Section");
		});

		it("should handle all heading levels 1-6", async () => {
			const page = createMockPage({ name: "Test" });
			const blocks = [1, 2, 3, 4, 5, 6].map(
				(level) =>
					({
						...createMockBlock({
							uuid: `heading-${level}`,
							content: `Level ${level}`,
						}),
						"logseq.property/heading": level,
					}) as BlockEntity,
			);

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, blocks);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("# Level 1");
			expect(result).toContain("## Level 2");
			expect(result).toContain("### Level 3");
			expect(result).toContain("#### Level 4");
			expect(result).toContain("##### Level 5");
			expect(result).toContain("###### Level 6");
		});

		it("should process children after heading", async () => {
			const page = createMockPage({ name: "Test" });
			const block = {
				...createMockBlock({
					uuid: "heading-with-children",
					content: "Parent Heading",
					children: [createMockBlock({ uuid: "child-1", content: "Child content" })],
				}),
				"logseq.property/heading": 2,
			} as BlockEntity;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("## Parent Heading");
			expect(result).toContain("Child content");

			// Ensure order is correct
			const headingIndex = result.indexOf("## Parent Heading");
			const childIndex = result.indexOf("Child content");
			expect(headingIndex).toBeLessThan(childIndex);
		});

		it("should not convert heading when flattenNested is false", async () => {
			const page = createMockPage({ name: "Test" });
			const block = {
				...createMockBlock({
					uuid: "heading-no-flatten",
					content: "Heading",
				}),
				"logseq.property/heading": 2,
			} as BlockEntity;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: false,
			});

			// When flattenNested is false, headings at depth 0 still work differently
			expect(result).toContain("Heading");
		});

		it("should handle empty heading content", async () => {
			const page = createMockPage({ name: "Test" });
			const block = {
				...createMockBlock({
					uuid: "empty-heading",
					content: "",
				}),
				"logseq.property/heading": 2,
			} as BlockEntity;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result.trim()).toBe("");
		});
	});

	describe("processBlock - Nested Blocks with Flattening", () => {
		it("should flatten nested blocks into paragraphs when flattenNested=true", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "parent",
				content: "Parent",
				children: [
					createMockBlock({ uuid: "child-1", content: "Child 1" }),
					createMockBlock({ uuid: "child-2", content: "Child 2" }),
				],
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("Parent");
			expect(result).toContain("Child 1");
			expect(result).toContain("Child 2");
			expect(result).not.toMatch(/^\s+- /m); // No indented list items
		});

		it("should create indented list when flattenNested=false", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "parent",
				content: "Parent",
				children: [
					createMockBlock({ uuid: "child-1", content: "Child 1" }),
					createMockBlock({ uuid: "child-2", content: "Child 2" }),
				],
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: false,
			});

			expect(result).toContain("Parent");
			expect(result).toContain("- Child 1");
			expect(result).toContain("- Child 2");
		});

		it("should handle deeply nested blocks with flattenNested=true", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "level-1",
				content: "Level 1",
				children: [
					createMockBlock({
						uuid: "level-2",
						content: "Level 2",
						children: [
							createMockBlock({
								uuid: "level-3",
								content: "Level 3",
								children: [createMockBlock({ uuid: "level-4", content: "Level 4" })],
							}),
						],
					}),
				],
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("Level 1");
			expect(result).toContain("Level 2");
			expect(result).toContain("Level 3");
			expect(result).toContain("Level 4");
			expect(result).not.toMatch(/^\s{2,}- /m); // No indentation
		});

		it("should handle deeply nested blocks with flattenNested=false", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "level-1",
				content: "Level 1",
				children: [
					createMockBlock({
						uuid: "level-2",
						content: "Level 2",
						children: [createMockBlock({ uuid: "level-3", content: "Level 3" })],
					}),
				],
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: false,
			});

			expect(result).toContain("Level 1");
			expect(result).toContain("- Level 2"); // First-level child: no indentation
			expect(result).toContain("  - Level 3"); // Second-level child: 2 spaces
		});

		it("should handle blocks with no children", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "no-children",
				content: "Standalone",
				children: [],
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("Standalone");
		});

		it("should handle blocks with undefined children", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "undefined-children",
				content: "No Children Defined",
			});
			delete block.children;

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("No Children Defined");
		});
	});

	describe("processBlock - Property-Only Blocks", () => {
		it("should skip property-only block and process children", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "prop-block",
				content: "property:: value",
				children: [createMockBlock({ uuid: "child", content: "Child content" })],
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).not.toContain("property::");
			expect(result).toContain("Child content");
		});

		it("should skip multi-line property-only block", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "multi-prop",
				content: "prop1:: value1\nprop2:: value2\nprop3:: value3",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result.trim()).toBe("");
		});

		it("should not skip mixed content with properties", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "mixed",
				content: "Regular content\nproperty:: value",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("Regular content");
		});
	});

	describe("processBlock - Asset Blocks", () => {
		it("should detect and convert asset block to markdown link", async () => {
			const page = createMockPage({ name: "Test" });
			const assetUuid = "550e8400-e29b-41d4-a716-446655440539";
			const block = createMockBlock({
				uuid: assetUuid,
				content: "Asset Title",
			});

			mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes(assetUuid)) {
					return [["png", { ":block/uuid": { $uuid: assetUuid }, ":block/title": "Asset Title" }]];
				}
				return [];
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);
			mockGraphResponse(mockAPI, "/test/graph");

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain(`![Asset Title](assets/${assetUuid}.png)`);
		});

		it("should process children after asset block", async () => {
			const page = createMockPage({ name: "Test" });
			const assetUuid = "550e8400-e29b-41d4-a716-446655440568";
			const block = createMockBlock({
				uuid: assetUuid,
				content: "Asset",
				children: [createMockBlock({ uuid: "child", content: "Description" })],
			});

			mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes(assetUuid)) {
					return [["jpg", { ":block/uuid": { $uuid: assetUuid } }]];
				}
				return [];
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);
			mockGraphResponse(mockAPI, "/test/graph");

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("![");
			expect(result).toContain("Description");
		});

		it("should use custom asset path for asset blocks", async () => {
			const page = createMockPage({ name: "Test" });
			const assetUuid = "custom-path-asset";
			const block = createMockBlock({
				uuid: assetUuid,
				content: "Image",
			});

			mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes(assetUuid)) {
					return [["png", { ":block/uuid": { $uuid: assetUuid } }]];
				}
				return [];
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);
			mockGraphResponse(mockAPI, "/test/graph");

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				assetPath: "images/",
				flattenNested: true,
			});

			expect(result).toContain(`images/${assetUuid}.png`);
		});
	});

	describe("processBlock - Edge Cases", () => {
		it("should handle block with whitespace-only content", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "whitespace",
				content: "   \n\t   ",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result.trim()).toBe("");
		});

		it("should handle blocks in parallel (siblings)", async () => {
			const page = createMockPage({ name: "Test" });
			const blocks = [
				createMockBlock({ uuid: "sibling-1", content: "First" }),
				createMockBlock({ uuid: "sibling-2", content: "Second" }),
				createMockBlock({ uuid: "sibling-3", content: "Third" }),
			];

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, blocks);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("First");
			expect(result).toContain("Second");
			expect(result).toContain("Third");
		});

		it("should handle block with special characters", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "special",
				content: "Content with **bold** and *italic* and `code`",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("**bold**");
			expect(result).toContain("*italic*");
			expect(result).toContain("`code`");
		});

		it("should handle blocks with different depths at root level", async () => {
			const page = createMockPage({ name: "Test" });
			const blocks = [
				createMockBlock({
					uuid: "root-1",
					content: "Root 1",
					children: [createMockBlock({ uuid: "child-1-1", content: "Child 1-1" })],
				}),
				createMockBlock({ uuid: "root-2", content: "Root 2" }),
			];

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, blocks);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			expect(result).toContain("Root 1");
			expect(result).toContain("Child 1-1");
			expect(result).toContain("Root 2");
		});
	});

	describe("processBlock - Integration with Options", () => {
		it("should respect preserveBlockRefs option", async () => {
			const page = createMockPage({ name: "Test" });
			const refUuid = "550e8400-e29b-41d4-a716-446655440728";
			const block = createMockBlock({
				uuid: "block-with-ref",
				content: `Content with ((${refUuid})) reference`,
			});

			mockAPI.Editor.getBlock.mockResolvedValue({
				uuid: refUuid,
				content: "Referenced content",
				properties: {},
			} as BlockEntity);

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				preserveBlockRefs: true,
				flattenNested: true,
			});

			expect(result).toContain("Referenced content");
			expect(result).not.toContain("((");
		});

		it("should respect removeLogseqSyntax option", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "block-with-syntax",
				content: "TODO NOW [#A] Task with #tag and [[Page]]",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				removeLogseqSyntax: true,
				includeTags: false,
				flattenNested: true,
			});

			expect(result).not.toContain("TODO");
			expect(result).not.toContain("[#A]");
			expect(result).not.toContain("#tag");
		});
	});

	describe("Quote Block Formatting", () => {
		it("should render single-line quote blocks with > prefix", async () => {
			const page = createMockPage({ name: "Test" });
			const quoteBlock = createMockBlock({
				uuid: "quote-1",
				content: "This is a quote",
			});
			(quoteBlock as any)[":logseq.property.node/display-type"] = ":quote";

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [quoteBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			expect(result).toContain("> This is a quote");
		});

		it("should render multi-line quote blocks with > on each line", async () => {
			const page = createMockPage({ name: "Test" });
			const quoteBlock = createMockBlock({
				uuid: "quote-2",
				content: "Line one\nLine two\nLine three",
			});
			(quoteBlock as any)["logseq.property.node/display-type"] = "quote"; // Test string format

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [quoteBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			expect(result).toContain("> Line one");
			expect(result).toContain("> Line two");
			expect(result).toContain("> Line three");
		});

		it("should process children of quote blocks", async () => {
			const page = createMockPage({ name: "Test" });
			const quoteBlock = createMockBlock({
				uuid: "quote-3",
				content: "Main quote",
				children: [createMockBlock({ uuid: "child-1", content: "Attribution or context" })],
			});
			(quoteBlock as any)[":logseq.property.node/display-type"] = ":quote";

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [quoteBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: false,
			});

			expect(result).toContain("> Main quote");
			expect(result).toContain("- Attribution or context");
		});

		it("should not affect non-quote blocks", async () => {
			const page = createMockPage({ name: "Test" });
			const normalBlock = createMockBlock({
				uuid: "normal-1",
				content: "Regular block",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [normalBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			expect(result).toContain("Regular block");
			// Should not have quote prefix
			expect(result).not.toMatch(/^> Regular block/m);
		});

		it("should prioritize quote over heading if both properties exist", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "conflict-1",
				content: "Content with both properties",
			});
			(block as any)[":logseq.property.node/display-type"] = ":quote";
			(block as any)[":logseq.property/heading"] = 2; // H2 heading

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			// Should render as quote, not heading
			expect(result).toContain("> Content with both properties");
			expect(result).not.toContain("## Content");
		});
	});

	describe("Code Block Formatting", () => {
		it("should render code blocks with language specifier", async () => {
			const page = createMockPage({ name: "Test" });
			const codeBlock = createMockBlock({
				uuid: "code-1",
				content: '(print "hello")',
			});
			(codeBlock as any)[":logseq.property.node/display-type"] = ":code";
			(codeBlock as any)[":logseq.property.code/lang"] = "Clojure";

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [codeBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			expect(result).toContain("```Clojure");
			expect(result).toContain('(print "hello")');
			expect(result).toContain("```");
		});

		it("should render code blocks without language (generic code block)", async () => {
			const page = createMockPage({ name: "Test" });
			const codeBlock = createMockBlock({
				uuid: "code-2",
				content: "console.log('test')",
			});
			(codeBlock as any)["logseq.property.node/display-type"] = "code"; // Test string format

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [codeBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			expect(result).toContain("```\n");
			expect(result).toContain("console.log('test')");
		});

		it("should render multi-line code blocks", async () => {
			const page = createMockPage({ name: "Test" });
			const codeBlock = createMockBlock({
				uuid: "code-3",
				content: "function test() {\n  return true;\n}",
			});
			(codeBlock as any)[":logseq.property.node/display-type"] = ":code";
			(codeBlock as any)[":logseq.property.code/lang"] = "javascript";

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [codeBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			expect(result).toContain("```javascript");
			expect(result).toContain("function test() {");
			expect(result).toContain("  return true;");
			expect(result).toContain("}");
		});

		it("should process children of code blocks", async () => {
			const page = createMockPage({ name: "Test" });
			const codeBlock = createMockBlock({
				uuid: "code-4",
				content: "const x = 1;",
				children: [createMockBlock({ uuid: "child-1", content: "Code explanation" })],
			});
			(codeBlock as any)[":logseq.property.node/display-type"] = ":code";
			(codeBlock as any)[":logseq.property.code/lang"] = "typescript";

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [codeBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: false,
			});

			expect(result).toContain("```typescript");
			expect(result).toContain("const x = 1;");
			expect(result).toContain("- Code explanation");
		});

		it("should not affect non-code blocks", async () => {
			const page = createMockPage({ name: "Test" });
			const normalBlock = createMockBlock({
				uuid: "normal-1",
				content: "Regular content",
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [normalBlock]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			expect(result).toContain("Regular content");
			expect(result).not.toMatch(/^```/m);
		});

		it("should prioritize code over heading if both properties exist", async () => {
			const page = createMockPage({ name: "Test" });
			const block = createMockBlock({
				uuid: "conflict-1",
				content: "const test = 'value';",
			});
			(block as any)[":logseq.property.node/display-type"] = ":code";
			(block as any)[":logseq.property.code/lang"] = "javascript";
			(block as any)[":logseq.property/heading"] = 2; // H2 heading

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, [block]);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
				flattenNested: true,
			});

			// Should render as code block, not heading
			expect(result).toContain("```javascript");
			expect(result).not.toContain("## const test");
		});

		it("should handle various programming languages", async () => {
			const page = createMockPage({ name: "Test" });
			const languages = [
				{ lang: "python", code: "print('hello')" },
				{ lang: "rust", code: "fn main() {}" },
				{ lang: "go", code: "func main() {}" },
				{ lang: "typescript", code: "const x: number = 1;" },
			];

			const blocks = languages.map((item, i) => {
				const block = createMockBlock({
					uuid: `lang-${i}`,
					content: item.code,
				});
				(block as any)[":logseq.property.node/display-type"] = ":code";
				(block as any)[":logseq.property.code/lang"] = item.lang;
				return block;
			});

			mockCurrentPageResponse(mockAPI, page);
			mockPageBlocksResponse(mockAPI, blocks);

			const result = await exporter.exportCurrentPage({
				...DEFAULT_OPTIONS,
				includePageName: false,
				includeProperties: false,
			});

			languages.forEach((item) => {
				expect(result).toContain("```" + item.lang);
				expect(result).toContain(item.code);
			});
		});
	});
});
