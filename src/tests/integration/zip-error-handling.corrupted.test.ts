import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownExporter } from "../../markdownExporter";
import { SampleBlocks, SamplePages, TestUUIDs } from "../../testing/mock-logseq-sdk/fixtures";
import { MockDOMHelpers } from "../../testing/mock-logseq-sdk/MockDOMHelpers";
import { MockFileAPI } from "../../testing/mock-logseq-sdk/MockFileAPI";
import { MockLogseqAPI } from "../../testing/mock-logseq-sdk/MockLogseqAPI";
import { extractMarkdownFromZip, readZipFromBlob } from "../../testing/utils/zipHelpers";

describe("ZIP Error Handling Tests - Corrupted Data", () => {
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

	describe("Corrupted data handling", () => {
		it("should handle malformed block references", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const blockWithBadRef = {
				...SampleBlocks.simple,
				content: "Malformed ref: ((not-a-valid-uuid))",
			};

			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithBadRef]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const content = await extractMarkdownFromZip(zip, "Simple-Page.md");

			expect(content).toBeDefined();
		});

		it("should handle circular block references", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const block1 = {
				...SampleBlocks.simple,
				uuid: "550e8400-e29b-41d4-a716-446655440201",
				content: "Block 1 refs ((550e8400-e29b-41d4-a716-446655440202))",
			};

			const block2 = {
				...SampleBlocks.simple,
				uuid: "550e8400-e29b-41d4-a716-446655440202",
				content: "Block 2 refs ((550e8400-e29b-41d4-a716-446655440201))",
			};

			mockAPI.addBlock(block1);
			mockAPI.addBlock(block2);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [block1, block2]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
		});

		it("should handle deeply nested circular references", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const deepBlock = {
				...SampleBlocks.nested,
				uuid: "550e8400-e29b-41d4-a716-446655440211",
				content: "Parent",
				children: [
					{
						...SampleBlocks.simple,
						uuid: "550e8400-e29b-41d4-a716-446655440212",
						content: "Child refs parent ((550e8400-e29b-41d4-a716-446655440211))",
						children: [],
					},
				],
			};

			mockAPI.addBlock(deepBlock);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [deepBlock]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
		});
	});
});
