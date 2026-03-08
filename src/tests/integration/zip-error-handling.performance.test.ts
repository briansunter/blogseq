import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownExporter } from "../../markdownExporter";
import { SampleBlocks, SamplePages, TestUUIDs } from "../../testing/mock-logseq-sdk/fixtures";
import { MockDOMHelpers } from "../../testing/mock-logseq-sdk/MockDOMHelpers";
import { MockFileAPI } from "../../testing/mock-logseq-sdk/MockFileAPI";
import { MockLogseqAPI } from "../../testing/mock-logseq-sdk/MockLogseqAPI";
import { countZipFiles, readZipFromBlob } from "../../testing/utils/zipHelpers";

describe("ZIP Error Handling Tests - Performance", () => {
	let mockAPI: MockLogseqAPI;
	let mockFileAPI: MockFileAPI;
	let mockDOM: MockDOMHelpers;
	let exporter: MarkdownExporter;

	beforeEach(() => {
		mockAPI = new MockLogseqAPI();
		mockFileAPI = new MockFileAPI();
		mockDOM = new MockDOMHelpers();
		exporter = new MarkdownExporter(mockAPI, mockFileAPI, mockDOM);

		mockAPI.setCurrentGraph({ path: "/test/graph", name: "Test Graph" });
	});

	afterEach(() => {
		mockAPI.reset();
		mockFileAPI.reset();
		mockDOM.reset();
	});

	describe("Memory and performance", () => {
		it("should handle export with many blocks", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const blocks = Array.from({ length: 100 }, (_, i) => ({
				...SampleBlocks.simple,
				uuid: `block-${i}`,
				content: `Block ${i} content`,
			}));

			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, blocks);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
			expect(savedFile!.blob.size).toBeGreaterThan(0);
		});

		it("should handle export with many assets", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const assetUUIDs = Array.from(
				{ length: 20 },
				(_, i) => `550e8400-e29b-41d4-a716-4466554401${i.toString().padStart(2, "0")}`,
			);
			const assetRefs = assetUUIDs.map((uuid) => `[[${uuid}]]`).join(" ");
			const block = {
				...SampleBlocks.simple,
				content: `Assets: ${assetRefs}`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			assetUUIDs.forEach((uuid, i) => {
				mockAPI.addAsset(uuid, "png", {
					uuid,
				} as any);

				mockFileAPI.setFetchResponse(
					`file:///test/graph/assets/${uuid}.png`,
					new Blob([`data-${i}`], { type: "image/png" }),
				);
			});

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();

			const zip = await readZipFromBlob(savedFile!.blob);
			expect(countZipFiles(zip)).toBe(21);
		});
	});
});
