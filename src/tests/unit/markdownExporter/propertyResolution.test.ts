import type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownExporter } from "../../../markdownExporter";
import {
	createMockBlock,
	createMockLogseqAPI,
	createMockPage,
	type MockDOMHelpers,
	type MockFileAPI,
	type MockLogseqAPI,
	resetAllMocks,
	setupGlobalMocks,
} from "../../test-utils";

vi.mock("file-saver", () => ({
	saveAs: vi.fn(),
}));

vi.mock("jszip", () => {
	const mockFile = vi.fn().mockReturnThis();
	const mockFolder = vi.fn(() => ({ file: mockFile }));
	return {
		default: vi.fn(() => ({
			file: mockFile,
			folder: mockFolder,
			generateAsync: vi.fn().mockResolvedValue(new Blob(["test"])),
		})),
	};
});

describe("MarkdownExporter - Property and db/id Resolution", () => {
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

	describe("Property Structure - Root Level Colon-Prefixed Keys", () => {
		it("should handle properties at root level with colon prefixes", async () => {
			// This is the CORRECT structure that Logseq actually returns
			const pageWithRootLevelProps = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Test Page",
				originalName: "Test Page",
				"journal?": false,
				updatedAt: 1738211909658,
				createdAt: 1738211909658,
				// Properties are at ROOT level with colons, NOT nested under .properties
				":user.property/title-abc123": "My Article Title",
				":user.property/author-def456": "John Doe",
				tags: [135, 138], // db/id references
				":logseq.property/status": 73,
			} as unknown as PageEntity;

			mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithRootLevelProps);
			mockAPI.Editor.getPage.mockResolvedValue(pageWithRootLevelProps);
			mockAPI.getPage.mockResolvedValue(pageWithRootLevelProps);
			mockAPI.getCurrentPage.mockResolvedValue(pageWithRootLevelProps);
			mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			// Mock property name mappings
			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes("[:find ?prop-key ?prop-title")) {
					return [
						[":user.property/title-abc123", "title"],
						[":user.property/author-def456", "author"],
					];
				}
				// Mock UUID collection queries (should find nothing to skip)
				if (query.includes(":block/uuid")) {
					return [];
				}
				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: false,
			});

			expect(result).toContain("---");
			expect(result).toContain("title: My Article Title");
			expect(result).toContain("author: John Doe");
		});
	});

	describe("Numeric db/id Resolution", () => {
		it("should resolve numeric db/id values to their content", async () => {
			const pageWithDbIds = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Test Page",
				originalName: "Test Page",
				"journal?": false,
				":user.property/publishDate-xyz": 819, // db/id reference
				":user.property/blogtitle-abc": 45116, // db/id reference
				":user.property/url-def": 45110, // db/id reference
			} as unknown as PageEntity;

			mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithDbIds);
			mockAPI.Editor.getPage.mockResolvedValue(pageWithDbIds);
			mockAPI.getPage.mockResolvedValue(pageWithDbIds);
			mockAPI.getCurrentPage.mockResolvedValue(pageWithDbIds);
			mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			// Mock getBlock/getPage for db/id resolution
			mockAPI.Editor.getBlock.mockImplementation(async (id: string | number) => {
				if (id === 819) return createMockBlock({ content: "2025-09-23" });
				if (id === 45116)
					return createMockBlock({
						":block/title": "Central Pacific Update",
						content: "Central Pacific Update",
					} as unknown as BlockEntity);
				if (id === 45110)
					return createMockBlock({ content: "https://briansunter.com/central-pacific-update" });
				return null;
			});

			mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
				// Return default page if not handled specifically (to satisfy initial page load)
				if (id === "test-page-uuid" || id === 1) return pageWithDbIds;
				return null;
			});

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				// Property name mappings
				if (query.includes("[:find ?prop-key ?prop-title")) {
					return [
						[":user.property/publishDate-xyz", "publishDate"],
						[":user.property/blogtitle-abc", "blogtitle"],
						[":user.property/url-def", "url"],
					] as any;
				}

				// UUID collection queries
				if (query.includes(":block/uuid")) {
					return [];
				}

				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: false,
			});

			expect(result).toContain("---");
			expect(result).toContain("publishDate: 2025-09-23");
			expect(result).toContain("blogtitle: Central Pacific Update");
			expect(result).toContain("url: https://briansunter.com/central-pacific-update");
			// Should NOT contain raw db/ids
			expect(result).not.toContain("publishDate: 819");
			expect(result).not.toContain("blogtitle: 45116");
			expect(result).not.toContain("url: 45110");
		});

		it("should handle db/id values that cannot be resolved", async () => {
			const pageWithUnresolvableDbId = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Test Page",
				originalName: "Test Page",
				"journal?": false,
				":user.property/mystery-prop": 99999, // db/id that doesn't exist
			} as unknown as PageEntity;

			mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithUnresolvableDbId);

			mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
				if (id === "test-page-uuid" || id === 1) return pageWithUnresolvableDbId;
				return null; // 99999 returns null
			});

			mockAPI.Editor.getBlock.mockResolvedValue(null); // 99999 returns null

			mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes("[:find ?prop-key ?prop-title")) {
					return [[":user.property/mystery-prop", "mystery"]];
				}
				if (query.includes(":block/uuid")) {
					return [];
				}
				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: false,
			});

			// Should fall back to the raw value if resolution fails
			expect(result).toContain("mystery: 99999");
		});
	});

	describe("Tag Resolution from db/ids", () => {
		it("should resolve tag db/ids to tag names", async () => {
			const pageWithTagDbIds = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Test Page",
				originalName: "Test Page",
				"journal?": false,
				tags: [135, 138, 27350], // Array of db/id references
				":user.property/blogTags-xyz": [45204, 45205, 47532], // More db/id references
			} as unknown as PageEntity;

			mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithTagDbIds);

			// Mock getPage for tag resolution
			mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
				if (id === "test-page-uuid" || id === 1) return pageWithTagDbIds;

				// Tag pages
				if (id === 135) return createMockPage({ name: "newsletter" });
				if (id === 138) return createMockPage({ name: "public" });
				if (id === 27350) return createMockPage({ name: "fitness" });
				if (id === 45204) return createMockPage({ name: "blog" });
				if (id === 45205) return createMockPage({ name: "AI" });
				if (id === 47532) return createMockPage({ name: "coding" });

				return null;
			});

			// Mock getBlock for UUID collection (used by collectPropertyValueUUIDs)
			mockAPI.Editor.getBlock.mockImplementation(async (id: string | number) => {
				if (id === 135) return createMockBlock({ uuid: "uuid-135" });
				if (id === 138) return createMockBlock({ uuid: "uuid-138" });
				if (id === 27350) return createMockBlock({ uuid: "uuid-27350" });
				if (id === 45204) return createMockBlock({ uuid: "uuid-45204" });
				if (id === 45205) return createMockBlock({ uuid: "uuid-45205" });
				if (id === 47532) return createMockBlock({ uuid: "uuid-47532" });
				return null;
			});

			mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes("[:find ?prop-key ?prop-title :where")) {
					return [[":user.property/blogTags-xyz", "blogTags"]];
				}
				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: false,
			});

			expect(result).toContain("tags:");
			expect(result).toContain("- newsletter");
			expect(result).toContain("- public");
			expect(result).toContain("- fitness");
			expect(result).toContain("- blog");
			expect(result).toContain("- AI");
			expect(result).toContain("- coding");
			// Should NOT contain raw db/ids in tags
			expect(result).not.toContain("- 135");
			expect(result).not.toContain("- 45204");
		});

		it("should merge tags and blogTags without duplicates", async () => {
			const pageWithDuplicateTags = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Test Page",
				originalName: "Test Page",
				"journal?": false,
				tags: [100, 101], // 'tech', 'javascript'
				":user.property/blogTags-xyz": [101, 102], // 'javascript' (duplicate), 'typescript'
			} as unknown as PageEntity;

			mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithDuplicateTags);

			mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
				if (id === "test-page-uuid" || id === 1) return pageWithDuplicateTags;

				if (id === 100) return createMockPage({ name: "tech" });
				if (id === 101) return createMockPage({ name: "javascript" });
				if (id === 102) return createMockPage({ name: "typescript" });
				return null;
			});

			mockAPI.Editor.getBlock.mockImplementation(async (id: string | number) => {
				if (id === 100) return createMockBlock({ uuid: "uuid-100" });
				if (id === 101) return createMockBlock({ uuid: "uuid-101" });
				if (id === 102) return createMockBlock({ uuid: "uuid-102" });
				return null;
			});

			mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes("[:find ?prop-key ?prop-title :where")) {
					return [[":user.property/blogTags-xyz", "blogTags"]];
				}
				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: false,
			});

			// Count occurrences of 'javascript' - should only appear once
			const javascriptMatches = result.match(/- javascript/g);
			expect(javascriptMatches).toHaveLength(1);
			expect(result).toContain("- tech");
			expect(result).toContain("- typescript");
		});
	});

	describe("Property Value Block Filtering", () => {
		it("should filter out property value blocks from export body", async () => {
			const pageWithPropertyBlocks = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Test Page",
				originalName: "Test Page",
				"journal?": false,
				":user.property/blogTags-xyz": [45204, 45205], // These create blocks
				":user.property/url-abc": 45110,
			} as unknown as PageEntity;

			const propertyValueBlocks: BlockEntity[] = [
				createMockBlock({ uuid: "uuid-45204", content: "blog" }), // Property value block
				createMockBlock({ uuid: "uuid-45205", content: "fitness" }), // Property value block
				createMockBlock({ uuid: "uuid-45110", content: "https://example.com" }), // Property value block
				createMockBlock({ uuid: "real-content-uuid", content: "This is actual page content" }), // Real content
			];

			mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithPropertyBlocks);

			mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
				if (id === "test-page-uuid" || id === 1) return pageWithPropertyBlocks;

				// Tags resolved via getPage
				if (id === 45204) return createMockPage({ name: "blog" });
				if (id === 45205) return createMockPage({ name: "fitness" });
				return null;
			});

			// Mocks for collectPropertyValueUUIDs AND resolveDbReference
			mockAPI.Editor.getBlock.mockImplementation(async (id: string | number) => {
				// For resolveDbReference
				if (id === 45110)
					return createMockBlock({ uuid: "uuid-45110", content: "https://example.com" });

				// For collectPropertyValueUUIDs
				if (id === 45204) return createMockBlock({ uuid: "uuid-45204" });
				if (id === 45205) return createMockBlock({ uuid: "uuid-45205" });
				return null;
			});

			mockAPI.Editor.getPageBlocksTree.mockResolvedValue(propertyValueBlocks);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes("[:find ?prop-key ?prop-title :where")) {
					return [
						[":user.property/blogTags-xyz", "blogTags"],
						[":user.property/url-abc", "url"],
					];
				}
				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: true,
			});

			// Should contain actual content
			expect(result).toContain("This is actual page content");

			// Should NOT contain property value blocks in the body
			const bodyMatch = result.match(/---\n\n(.+)$/s);
			if (bodyMatch) {
				const body = bodyMatch[1];
				expect(body).not.toContain("\nblog\n");
				expect(body).not.toContain("\nfitness\n");
				// https://example.com might appear in frontmatter as url, checking body only
				expect(body).not.toContain("\nhttps://example.com\n");
			}

			// But SHOULD contain tags in frontmatter
			const frontmatterMatch = result.match(/---\n(.+?)\n---/s);
			if (frontmatterMatch) {
				const frontmatter = frontmatterMatch[1];
				expect(frontmatter).toContain("blog");
				expect(frontmatter).toContain("fitness");
			}
		});

		it("should handle pages with no property value blocks", async () => {
			const simplePage = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Simple Page",
				originalName: "Simple Page",
				"journal?": false,
			} as unknown as PageEntity;

			const normalBlocks: BlockEntity[] = [
				createMockBlock({ uuid: "block-1", content: "First paragraph" }),
				createMockBlock({ uuid: "block-2", content: "Second paragraph" }),
			];

			mockAPI.Editor.getCurrentPage.mockResolvedValue(simplePage);
			mockAPI.Editor.getPage.mockResolvedValue(simplePage);
			mockAPI.getPage.mockResolvedValue(simplePage);
			mockAPI.getCurrentPage.mockResolvedValue(simplePage);
			mockAPI.Editor.getPageBlocksTree.mockResolvedValue(normalBlocks);
			mockAPI.getPageBlocksTree.mockResolvedValue(normalBlocks);
			mockAPI.Editor.getBlock.mockResolvedValue(null);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				// No properties to map
				if (query.includes("[:find ?prop-key ?prop-title :where")) {
					return [];
				}
				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: false,
				includePageName: true,
			});

			expect(result).toContain("First paragraph");
			expect(result).toContain("Second paragraph");
			expect(result).not.toContain("---"); // No frontmatter
		});
	});

	describe("DataScript Query Syntax Validation", () => {
		it("should NOT use [?e :db/id dbId] syntax which causes parse errors", async () => {
			const pageWithDbId = {
				uuid: "test-page-uuid",
				id: 1,
				name: "Test Page",
				originalName: "Test Page",
				"journal?": false,
				":user.property/another-prop": 99999,
			} as unknown as PageEntity;

			mockAPI.Editor.getCurrentPage.mockResolvedValue(pageWithDbId);
			mockAPI.Editor.getPage.mockResolvedValue(pageWithDbId);
			mockAPI.getPage.mockResolvedValue(pageWithDbId);
			mockAPI.getCurrentPage.mockResolvedValue(pageWithDbId);
			mockAPI.Editor.getBlock.mockResolvedValue(null);
			mockAPI.Editor.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getPageBlocksTree.mockResolvedValue([]);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				if (query.includes("[:find ?prop-key ?prop-title :where")) {
					return [[":user.property/another-prop", "anotherProp"]];
				}

				// Verify we NEVER see the incorrect syntax
				expect(query).not.toContain(":db/id 99999");
				expect(query).not.toContain("[?e :db/id");

				return [];
			});

			await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: false,
			});
		});
	});

	describe("Complex Integration Scenarios", () => {
		it("should handle complete real-world page with all property types", async () => {
			const realWorldPage = {
				uuid: "679b0245-582a-4ff3-b13d-81bd8db0dfcb",
				id: 36485,
				name: "central pacific update",
				originalName: "central pacific update",
				"journal?": false,
				updatedAt: 1761556235265,
				createdAt: 1738211909658,
				":logseq.property/status": 73,
				tags: [135, 138, 27350, 36755],
				":user.property/blogTags-Mx0ii3sb": [45204, 45205, 47532, 47533],
				":user.property/publishDate-kRxfHtUv": 819,
				":logseq.property/description": 45312,
				":user.property/blogPhase-kMp_wFlD": 38488,
				":user.property/appState-MQ0Sgn1c": 42826,
				":user.property/su9f7RGPa_ey2_N3I3wqd-rating": 9,
				":user.property/q2helqDgR_XPJqNQCRN2O-url": 45110,
				":user.property/bogtitle-FiJnwhpb": 45116,
				":user.property/coverimage-wTuZyU8U": 47526,
			} as unknown as PageEntity;

			const pageBlocks: BlockEntity[] = [
				createMockBlock({ uuid: "content-1", content: "This is actual blog content" }),
				createMockBlock({ uuid: "content-2", content: "More actual content" }),
				// Property value blocks that should be filtered
				createMockBlock({ uuid: "uuid-45204", content: "newsletter" }),
				createMockBlock({ uuid: "uuid-45205", content: "fitness" }),
				createMockBlock({ uuid: "uuid-47532", content: "blog" }),
				createMockBlock({ uuid: "uuid-47533", content: "AI" }),
			];

			mockAPI.Editor.getCurrentPage.mockResolvedValue(realWorldPage);

			mockAPI.Editor.getPage.mockImplementation(async (id: string | number) => {
				if (id === "679b0245-582a-4ff3-b13d-81bd8db0dfcb" || id === 36485) return realWorldPage;

				// Tag mappings
				if (id === 135) return createMockPage({ name: "Page" });
				if (id === 138) return createMockPage({ name: "Task" });
				if (id === 27350) return createMockPage({ name: "newsletter" });
				if (id === 36755) return createMockPage({ name: "public" });
				if (id === 45204) return createMockPage({ name: "newsletter" });
				if (id === 45205) return createMockPage({ name: "fitness" });
				if (id === 47532) return createMockPage({ name: "blog" });
				if (id === 47533) return createMockPage({ name: "AI" });

				return null;
			});

			mockAPI.Editor.getBlock.mockImplementation(async (id: string | number) => {
				// Property resolutions
				if (id === 819) return createMockBlock({ content: "2025-09-23" });
				if (id === 45110)
					return createMockBlock({ content: "https://briansunter.com/central-pacific-update" });
				if (id === 45116) return createMockBlock({ content: "Central Pacific Update" });
				if (id === 45312) return createMockBlock({ content: "Test Description" }); // Description
				// For filtering
				if (id === 45204) return createMockBlock({ uuid: "uuid-45204" });
				if (id === 45205) return createMockBlock({ uuid: "uuid-45205" });
				if (id === 47532) return createMockBlock({ uuid: "uuid-47532" });
				if (id === 47533) return createMockBlock({ uuid: "uuid-47533" });

				if (id === 9) return null; // Numeric rating, assume it's just a number

				return null;
			});

			mockAPI.Editor.getPageBlocksTree.mockResolvedValue(pageBlocks);
			mockAPI.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });
			mockAPI.App.getCurrentGraph.mockResolvedValue({ path: "/test/graph" });

			mockAPI.datascriptQuery.mockImplementation(async (query: string) => {
				// Property mappings
				if (query.includes("[:find ?prop-key ?prop-title")) {
					return [
						[":user.property/blogTags-Mx0ii3sb", "blogTags"],
						[":user.property/publishDate-kRxfHtUv", "publishDate"],
						[":user.property/bogtitle-FiJnwhpb", "blogtitle"],
						[":user.property/q2helqDgR_XPJqNQCRN2O-url", "url"],
						[":user.property/su9f7RGPa_ey2_N3I3wqd-rating", "rating"],
						[":user.property/blogPhase-kMp_wFlD", "blogPhase"],
						[":user.property/appState-MQ0Sgn1c", "outputState"],
						[":user.property/coverimage-wTuZyU8U", "coverimage"],
						[":logseq.property/description", "description"],
					];
				}

				return [];
			});

			const result = await exporter.exportCurrentPage({
				includeProperties: true,
				includePageName: true,
			});

			// Verify frontmatter has resolved values
			expect(result).toContain("publishDate: 2025-09-23");
			expect(result).toContain("blogtitle: Central Pacific Update");
			expect(result).toContain("url: https://briansunter.com/central-pacific-update");
			expect(result).toContain("rating: 9");

			// Verify tags are merged and deduplicated
			expect(result).toContain("tags:");
			expect(result).toContain("- newsletter");
			expect(result).toContain("- fitness");
			expect(result).toContain("- blog");
			expect(result).toContain("- AI");

			// Verify actual content is present
			expect(result).toContain("This is actual blog content");
			expect(result).toContain("More actual content");

			// Verify property value blocks are NOT in body
			const bodyMatch = result.match(/---\n\n(.+)$/s);
			if (bodyMatch) {
				const body = bodyMatch[1];
				// Property values should not appear as standalone blocks in body
				expect(body).not.toContain("\nnewsletter\n\nfitness\n");
			}

			// Should NOT contain raw db/ids
			expect(result).not.toContain("publishDate: 819");
			expect(result).not.toContain("blogtitle: 45116");
			expect(result).not.toContain("url: 45110");
		});
	});
});
