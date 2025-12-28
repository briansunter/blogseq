import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownExporter } from "../../../markdownExporter";
import {
	createMockBlock,
	createMockLogseqAPI,
	createMockPage,
	MockDOMHelpers,
	MockFileAPI,
	MockLogseqAPI,
	mockCurrentPageResponse,
	mockPageBlocksResponse,
} from "../../test-utils";

describe("Real-world Asset Detection", () => {
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
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should handle real-world Logseq asset structure", async () => {
		const assetUuid = "68d1f693-009d-4db3-bcd9-0bfc07238bb3";
		const blockWithRefUuid = "68d1f761-e896-4236-932e-ab6c6369ac58";

		// Mock the page
		const page = createMockPage({
			name: "Test Page",
			uuid: "page-uuid",
		});

		// Create blocks matching the real structure
		// Block that references the asset
		const blockWithRef = createMockBlock({
			uuid: blockWithRefUuid,
			content: `[[${assetUuid}]]`, // This is the reference to the asset
		});

		// The asset block itself (would be elsewhere in the graph)
		const assetBlock = createMockBlock({
			uuid: assetUuid,
			content: "", // Assets typically have no content
			properties: {
				"logseq.property.asset/type": "jpeg",
				"block/title": "Lost Concert",
			},
		});

		mockCurrentPageResponse(mockAPI, page);
		mockPageBlocksResponse(mockAPI, [blockWithRef]); // Only the referencing block is on this page

		// Mock the DataScript query for asset detection - matching real Logseq data
		mockAPI.datascriptQuery.mockImplementation((query: string) => {
			console.log("DataScript Query:", query);

			if (query.includes(assetUuid) && query.includes(":logseq.property.asset/type")) {
				// Return structure matching real Logseq DataScript response
				return Promise.resolve([
					[
						"jpeg",
						{
							":block/tx-id": 537023847,
							":logseq.property.asset/type": "jpeg",
							":block/uuid": { $uuid: assetUuid },
							":logseq.property.embedding/hnsw-label-updated-at": 1758590618337,
							":block/updated-at": 1758590618337,
							":block/refs": [{ ":db/id": 9 }, { ":db/id": 36868 }],
							":logseq.property.asset/checksum":
								"6b95c98844e4ec5543e8b498fbe5c4ca3de889950cf1d197a745f7713bed2764",
							":block/created-at": 1758590611540,
							":block/title": "Lost Concert",
							":logseq.property.asset/size": 214301,
							":db/id": 73304,
							":block/parent": { ":db/id": 55549 },
							":block/order": "a08",
							":block/page": { ":db/id": 55549 },
							":block/tags": [{ ":db/id": 36868 }],
						},
					],
				]);
			}
			return Promise.resolve([]);
		});

		// Mock getPage/getBlock to return null for the asset UUID
		mockAPI.getPage.mockImplementation((uuid: string) => {
			if (uuid === assetUuid) {
				return Promise.resolve(null); // Assets are not pages
			}
			return Promise.resolve(page);
		});

		mockAPI.getBlock.mockImplementation((uuid: string) => {
			if (uuid === assetUuid) {
				return Promise.resolve(null); // Asset blocks don't have regular content
			}
			if (uuid === blockWithRefUuid) {
				return Promise.resolve(blockWithRef);
			}
			return Promise.resolve(null);
		});

		const result = await exporter.exportCurrentPage({
			includePageName: false,
			preserveBlockRefs: true,
			debug: true, // Enable debug logging
		});

		console.log("Final export result:", result);

		// Should convert [[uuid]] to ![Lost Concert](assets/uuid.jpeg)
		expect(result).toContain("![Lost Concert]");
		expect(result).toContain(`assets/${assetUuid}.jpeg`);
		expect(result).not.toContain(`[[${assetUuid}]]`); // Should not have the raw UUID reference
	});

	it("should handle both inline text and asset references", async () => {
		const assetUuid = "68d1f693-009d-4db3-bcd9-0bfc07238bb3";

		const page = createMockPage({ name: "My Page", uuid: "page-uuid" });

		// Block with mixed content
		const blockWithMixedContent = createMockBlock({
			uuid: "block-1",
			content: `Here's an ultrawide monitor image: [[${assetUuid}]]`,
		});

		// Block with just the reference
		const blockWithJustRef = createMockBlock({
			uuid: "block-2",
			content: `[[${assetUuid}]]`,
		});

		mockCurrentPageResponse(mockAPI, page);
		mockPageBlocksResponse(mockAPI, [blockWithMixedContent, blockWithJustRef]);

		// Mock DataScript query for the asset
		mockAPI.datascriptQuery.mockImplementation((query: string) => {
			if (query.includes(assetUuid) && query.includes(":logseq.property.asset/type")) {
				return Promise.resolve([
					[
						"jpeg",
						{
							":block/title": "Lost Concert",
							":block/uuid": { $uuid: assetUuid },
							":logseq.property.asset/type": "jpeg",
						},
					],
				]);
			}
			return Promise.resolve([]);
		});

		const result = await exporter.exportCurrentPage({
			includePageName: false,
			preserveBlockRefs: true,
		});

		// First block should have text and image
		expect(result).toContain("Here's an ultrawide monitor image:");
		expect(result).toContain("![Lost Concert]");

		// Both references should be converted
		const imageCount = (result.match(/!\[Lost Concert\]/g) || []).length;
		expect(imageCount).toBe(2);
	});
});
