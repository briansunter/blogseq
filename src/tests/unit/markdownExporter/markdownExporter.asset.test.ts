import type { BlockEntity } from "@logseq/libs/dist/LSPlugin";
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

describe("Asset Detection for [[uuid]] References", () => {
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

	it("should resolve [[uuid]] references to image assets", async () => {
		const assetUuid = "68d1f693-009d-4db3-bcd9-0bfc07238bb3";

		// Mock the page and blocks
		const page = createMockPage({ name: "Test Page", uuid: "page-uuid" });
		const blockWithRef = createMockBlock({
			uuid: "block-uuid",
			content: `[[${assetUuid}]]`, // Direct [[uuid]] reference
		});

		mockCurrentPageResponse(mockAPI, page);
		mockPageBlocksResponse(mockAPI, [blockWithRef]);

		// Mock the DataScript query for asset detection
		mockAPI.datascriptQuery.mockImplementation((query: string) => {
			// Log for debugging
			console.log("Query:", query);

			// Match the asset detection query
			if (query.includes(assetUuid) && query.includes(":logseq.property.asset/type")) {
				return Promise.resolve([
					[
						"jpeg",
						{
							"block/uuid": assetUuid,
							"block/title": "Lost Concert",
							"logseq.property.asset/type": "jpeg",
						},
					],
				]);
			}
			return Promise.resolve([]);
		});

		// Mock getPage to return null (not a page)
		mockAPI.getPage.mockImplementation((uuid: string) => {
			if (uuid === assetUuid) {
				return Promise.resolve(null);
			}
			return Promise.resolve(page);
		});

		// Mock getBlock to return null (not a regular block)
		mockAPI.getBlock.mockImplementation((uuid: string) => {
			if (uuid === assetUuid) {
				return Promise.resolve(null);
			}
			return Promise.resolve(blockWithRef);
		});

		const result = await exporter.exportCurrentPage({
			includePageName: false,
			preserveBlockRefs: true,
		});

		console.log("Export result:", result);

		// Should convert [[uuid]] to ![Lost Concert](assets/68d1f693-009d-4db3-bcd9-0bfc07238bb3.jpeg)
		expect(result).toContain("![Lost Concert]");
		expect(result).toContain("assets/68d1f693-009d-4db3-bcd9-0bfc07238bb3.jpeg");
	});

	it("should handle image embedded in block content", async () => {
		const assetUuid = "68d1f693-009d-4db3-bcd9-0bfc07238bb3";

		const page = createMockPage({ name: "Test Page", uuid: "page-uuid" });
		const blockWithEmbed = createMockBlock({
			uuid: "block-uuid",
			content: `Check out this image: [[${assetUuid}]] - it's great!`,
		});

		mockCurrentPageResponse(mockAPI, page);
		mockPageBlocksResponse(mockAPI, [blockWithEmbed]);

		// Mock the DataScript query for asset detection
		mockAPI.datascriptQuery.mockImplementation((query: string) => {
			if (query.includes(assetUuid) && query.includes(":logseq.property.asset/type")) {
				return Promise.resolve([
					[
						"png",
						{
							"block/uuid": assetUuid,
							"block/title": "Screenshot",
							"logseq.property.asset/type": "png",
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

		expect(result).toContain("Check out this image:");
		expect(result).toContain("![Screenshot](assets/68d1f693-009d-4db3-bcd9-0bfc07238bb3.png)");
		expect(result).toContain("- it's great!");
	});
});
