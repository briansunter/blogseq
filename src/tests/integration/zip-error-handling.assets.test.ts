import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownExporter } from "../../markdownExporter";
import { SampleBlocks, SamplePages, TestUUIDs } from "../../testing/mock-logseq-sdk/fixtures";
import { MockDOMHelpers } from "../../testing/mock-logseq-sdk/MockDOMHelpers";
import { MockFileAPI } from "../../testing/mock-logseq-sdk/MockFileAPI";
import { MockLogseqAPI } from "../../testing/mock-logseq-sdk/MockLogseqAPI";
import { countZipFiles, getZipFilePaths, readZipFromBlob } from "../../testing/utils/zipHelpers";

describe("ZIP Error Handling Tests - Assets", () => {
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

	describe("Missing asset handling", () => {
		it("should continue export when asset fetch fails", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(TestUUIDs.imageAsset, "png", {
				uuid: TestUUIDs.imageAsset,
			} as any);

			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
				"Not Found",
				404,
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();

			const zip = await readZipFromBlob(savedFile!.blob);
			expect(countZipFiles(zip)).toBe(1);
		});

		it("should show warning when assets fail to load", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(TestUUIDs.imageAsset, "png", {
				uuid: TestUUIDs.imageAsset,
				"block/title": "Failed Asset",
			} as any);

			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
				"Error",
				500,
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			expect(mockAPI.calls.showMsg).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: "warning",
					}),
				]),
			);
		});

		it("should include partial assets when some fail", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]] PDF: [[${TestUUIDs.pdfAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(TestUUIDs.imageAsset, "png", {
				uuid: TestUUIDs.imageAsset,
			} as any);
			mockAPI.addAsset(TestUUIDs.pdfAsset, "pdf", {
				uuid: TestUUIDs.pdfAsset,
			} as any);

			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
				new Blob(["data"], { type: "image/png" }),
			);
			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${TestUUIDs.pdfAsset}.pdf`,
				"Error",
				404,
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			expect(countZipFiles(zip)).toBe(2);
			const files = getZipFilePaths(zip);
			expect(files).toContain(`assets/${TestUUIDs.imageAsset}.png`);
			expect(files).not.toContain(`assets/${TestUUIDs.pdfAsset}.pdf`);
		});

		it("should handle network timeout gracefully", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(TestUUIDs.imageAsset, "png", {
				uuid: TestUUIDs.imageAsset,
			} as any);

			mockFileAPI.setFetchError(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
				new Error("Network timeout"),
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();

			const zip = await readZipFromBlob(savedFile!.blob);
			expect(countZipFiles(zip)).toBe(1);
		});
	});

	describe("Asset edge cases", () => {
		it("should handle asset with no title", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Asset: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(TestUUIDs.imageAsset, "png", {
				uuid: TestUUIDs.imageAsset,
			} as any);

			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
				new Blob(["data"], { type: "image/png" }),
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			expect(countZipFiles(zip)).toBe(2);
		});

		it("should handle asset with invalid type", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Asset: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(TestUUIDs.imageAsset, "unknown-type", {
				uuid: TestUUIDs.imageAsset,
			} as any);

			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.unknown-type`,
				new Blob(["data"], { type: "application/octet-stream" }),
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			expect(countZipFiles(zip)).toBe(2);
		});

		it("should handle asset path with special characters", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const specialUuid = "550e8400-e29b-41d4-a716-446655440191";
			const block = {
				...SampleBlocks.simple,
				content: `Asset: [[${specialUuid}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(specialUuid, "png", {
				uuid: specialUuid,
			} as any);

			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${specialUuid}.png`,
				new Blob(["data"], { type: "image/png" }),
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
		});
	});

	describe("Graph path issues", () => {
		it("should handle missing graph path", async () => {
			mockAPI.setCurrentGraph(null);
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
		});

		it("should handle invalid graph path", async () => {
			mockAPI.setCurrentGraph({ path: "", name: "" });
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Asset: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addDataScriptQueryResponse(
				`[:find ?type (pull ?e [*])
                      :where
                      [?e :block/uuid #uuid "${TestUUIDs.imageAsset}"]
                      [?e :logseq.property.asset/type ?type]]`,
				[["png", { uuid: TestUUIDs.imageAsset }]],
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
		});
	});

	describe("Partial failure recovery", () => {
		it("should show warning when all assets fail", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addAsset(TestUUIDs.imageAsset, "png", {
				uuid: TestUUIDs.imageAsset,
			} as any);

			mockFileAPI.setFetchResponse(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
				"Error",
				500,
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			expect(mockAPI.calls.showMsg).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: "warning",
					}),
				]),
			);
		});

		it("should complete export even when asset processing fails", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const block = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [block]);

			mockAPI.addDataScriptQueryResponse(
				`[:find ?type (pull ?e [*])
                      :where
                      [?e :block/uuid #uuid "${TestUUIDs.imageAsset}"]
                      [?e :logseq.property.asset/type ?type]]`,
				[["png", { uuid: TestUUIDs.imageAsset }]],
			);

			mockFileAPI.setFetchError(
				`file:///test/graph/assets/${TestUUIDs.imageAsset}.png`,
				new Error("Processing failed"),
			);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
			expect(savedFile!.filename).toMatch(/\.zip$/);
		});
	});
});
