import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownExporter } from "../../markdownExporter";
import { MockDOMHelpers } from "../../testing/mock-logseq-sdk/MockDOMHelpers";
import { MockFileAPI } from "../../testing/mock-logseq-sdk/MockFileAPI";
import { MockLogseqAPI } from "../../testing/mock-logseq-sdk/MockLogseqAPI";

describe("ZIP Error Handling Tests - No Page", () => {
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

	describe("Export with no pages", () => {
		it("should throw error when no current page", async () => {
			mockAPI.setCurrentPage(null);

			await expect(exporter.exportCurrentPage()).rejects.toThrow("NO_ACTIVE_PAGE");
		});

		it("should not create ZIP when export fails", async () => {
			mockAPI.setCurrentPage(null);

			try {
				const markdown = await exporter.exportCurrentPage();
				await exporter.downloadAsZip(markdown);
			} catch {
				// Expected to fail
			}

			expect(mockFileAPI.calls.saveAs).toHaveLength(0);
		});
	});
});
