import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownExporter } from "../../markdownExporter";
import { SampleBlocks, SamplePages, TestUUIDs } from "../../testing/mock-logseq-sdk/fixtures";
import { MockDOMHelpers } from "../../testing/mock-logseq-sdk/MockDOMHelpers";
import { MockFileAPI } from "../../testing/mock-logseq-sdk/MockFileAPI";
import { MockLogseqAPI } from "../../testing/mock-logseq-sdk/MockLogseqAPI";
import {
	countZipFiles,
	extractMarkdownFromZip,
	readZipFromBlob,
} from "../../testing/utils/zipHelpers";

describe("ZIP Error Handling Tests - Invalid Content", () => {
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

	describe("Invalid markdown content", () => {
		it("should handle blocks with null content", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const blockWithNull = {
				...SampleBlocks.simple,
				content: null as any,
			};

			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithNull]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();

			const zip = await readZipFromBlob(savedFile!.blob);
			expect(countZipFiles(zip)).toBe(1);
		});

		it("should handle blocks with undefined content", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const blockWithUndefined = {
				...SampleBlocks.simple,
				content: undefined as any,
			};

			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithUndefined]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
		});

		it("should handle very long content", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const longContent = "Very long text. ".repeat(10000);
			const blockWithLongContent = {
				...SampleBlocks.simple,
				content: longContent,
			};

			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithLongContent]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const content = await extractMarkdownFromZip(zip, "Simple-Page.md");

			expect(content.length).toBeGreaterThan(10000);
		});

		it("should handle special characters in content", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);

			const specialContent = "Content with \0 null bytes and \uFFFD replacement chars";
			const blockWithSpecial = {
				...SampleBlocks.simple,
				content: specialContent,
			};

			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [blockWithSpecial]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
		});
	});
});
