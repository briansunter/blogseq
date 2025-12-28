import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownExporter } from "../../markdownExporter";
import { SampleBlocks, SamplePages, TestUUIDs } from "../../testing/mock-logseq-sdk/fixtures";
import { MockDOMHelpers } from "../../testing/mock-logseq-sdk/MockDOMHelpers";
import { MockFileAPI } from "../../testing/mock-logseq-sdk/MockFileAPI";
import { MockLogseqAPI } from "../../testing/mock-logseq-sdk/MockLogseqAPI";
import {
	countZipFiles,
	getZipFilePaths,
	getZipFolderPaths,
	readZipFromBlob,
	verifyZipStructure,
} from "../../testing/utils/zipHelpers";

/**
 * ZIP Structure Tests
 * Verifies that ZIP exports have correct file and folder structure
 */
describe("ZIP Structure Tests", () => {
	let mockAPI: MockLogseqAPI;
	let mockFileAPI: MockFileAPI;
	let mockDOM: MockDOMHelpers;
	let exporter: MarkdownExporter;

	beforeEach(() => {
		mockAPI = new MockLogseqAPI();
		mockFileAPI = new MockFileAPI();
		mockDOM = new MockDOMHelpers();
		exporter = new MarkdownExporter(mockAPI, mockFileAPI, mockDOM);

		// Set up default graph
		mockAPI.setCurrentGraph({ path: "/test/graph", name: "Test Graph" });
	});

	afterEach(() => {
		mockAPI.reset();
		mockFileAPI.reset();
		mockDOM.reset();
	});

	// Helper to setup asset mocking
	const setupAsset = (uuid: string, type: string, title?: string) => {
		mockAPI.addAsset(uuid, type, {
			uuid,
			"block/title": title || `asset-${uuid}`,
		} as any);

		mockFileAPI.setFetchResponse(
			`file:///test/graph/assets/${uuid}.${type}`,
			new Blob(["fake-data"], { type: `image/${type}` }),
		);
	};

	describe("Basic ZIP structure", () => {
		it("should create ZIP with markdown file at root level", async () => {
			// Setup
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			// Export
			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			// Verify
			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
			expect(savedFile?.filename).toMatch(/\.zip$/);

			const zip = await readZipFromBlob(savedFile!.blob);
			const files = getZipFilePaths(zip);

			// Should have exactly one markdown file at root
			const mdFiles = files.filter((f) => f.endsWith(".md") && !f.includes("/"));
			expect(mdFiles).toHaveLength(1);
			expect(mdFiles[0]).toBe("Simple-Page.md");
		});

		it("should create assets folder when assets are present", async () => {
			// Setup page with asset
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const blockWithAsset = {
				...SampleBlocks.simple,
				content: `Check out this image: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.addBlock(blockWithAsset);
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAsset]);

			// Use setupAsset helper for proper asset registration
			setupAsset(TestUUIDs.imageAsset, "png", "Sample Image");

			// Export
			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			// Verify
			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const folders = getZipFolderPaths(zip);

			expect(folders).toContain("assets/");
		});

		it("should not create assets folder when no assets", async () => {
			// Setup
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			// Export
			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			// Verify
			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const folders = getZipFolderPaths(zip);

			expect(folders).toHaveLength(0);
		});

		it("should use consistent folder naming", async () => {
			// Setup with assets
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const blockWithAsset = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.addBlock(blockWithAsset);
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAsset]);

			// Use setupAsset helper for proper asset registration
			setupAsset(TestUUIDs.imageAsset, "png", "Image");

			// Export
			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			// Verify
			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const folders = getZipFolderPaths(zip);

			// Folder should be exactly 'assets/'
			expect(folders).toContain("assets/");
			expect(folders).not.toContain("Assets/");
			expect(folders).not.toContain("ASSETS/");
		});
	});

	describe("File naming conventions", () => {
		it("should sanitize page names for filenames", async () => {
			// Setup with special characters in page name
			const pageWithSpecialChars = {
				...SamplePages.simple,
				name: "Page: With / Special? Characters!",
				uuid: "test-special-123",
			};

			mockAPI.addPage(pageWithSpecialChars);
			mockAPI.setCurrentPage(pageWithSpecialChars);
			mockAPI.setPageBlocksTree("test-special-123", [SampleBlocks.simple]);

			// Export
			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			// Verify
			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const files = getZipFilePaths(zip);

			// Filename should have special chars replaced with hyphens
			const mdFile = files.find((f) => f.endsWith(".md"));
			expect(mdFile).toBeDefined();
			expect(mdFile).toMatch(/^[A-Za-z0-9-]+\.md$/);
			expect(mdFile).not.toContain("/");
			expect(mdFile).not.toContain(":");
			expect(mdFile).not.toContain("?");
			expect(mdFile).not.toContain("!");
		});

		it("should handle page names with spaces", async () => {
			const pageWithSpaces = {
				...SamplePages.simple,
				name: "My Test Page",
				uuid: "test-spaces-123",
			};

			mockAPI.addPage(pageWithSpaces);
			mockAPI.setCurrentPage(pageWithSpaces);
			mockAPI.setPageBlocksTree("test-spaces-123", [SampleBlocks.simple]);

			// Export
			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			// Verify
			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const files = getZipFilePaths(zip);

			const mdFile = files.find((f) => f.endsWith(".md"));
			expect(mdFile).toBe("My-Test-Page.md");
		});

		it("should preserve UUID-based asset filenames", async () => {
			// Setup
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const blockWithAsset = {
				...SampleBlocks.simple,
				content: `Asset: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.addBlock(blockWithAsset);
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAsset]);

			// Use setupAsset helper for proper asset registration
			setupAsset(TestUUIDs.imageAsset, "png");

			// Export
			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			// Verify
			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);
			const files = getZipFilePaths(zip);

			// Asset should be in assets folder with UUID.extension
			const expectedPath = `assets/${TestUUIDs.imageAsset}.png`;
			expect(files).toContain(expectedPath);
		});
	});

	describe("ZIP file count validation", () => {
		it("should have correct file count with no assets", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			expect(countZipFiles(zip)).toBe(1); // Just the markdown file
		});

		it("should have correct file count with one asset", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const blockWithAsset = {
				...SampleBlocks.simple,
				content: `Asset: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAsset]);

			setupAsset(TestUUIDs.imageAsset, "png");

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			expect(countZipFiles(zip)).toBe(2); // Markdown + 1 asset
		});

		it("should have correct file count with multiple assets", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const blockWithAssets = {
				...SampleBlocks.simple,
				content: `Image: [[${TestUUIDs.imageAsset}]] and PDF: [[${TestUUIDs.pdfAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAssets]);

			// Setup both assets using helper
			setupAsset(TestUUIDs.imageAsset, "png");
			setupAsset(TestUUIDs.pdfAsset, "pdf");

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			expect(countZipFiles(zip)).toBe(3); // Markdown + 2 assets
		});
	});

	describe("ZIP structure verification", () => {
		it("should pass structure validation with no assets", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			const isValid = await verifyZipStructure(zip, {
				markdownFile: "Simple-Page.md",
				minFiles: 1,
				maxFiles: 1,
			});

			expect(isValid).toBe(true);
		});

		it("should pass structure validation with assets", async () => {
			mockAPI.addPage(SamplePages.withAssets);
			mockAPI.setCurrentPage(SamplePages.withAssets);

			const blockWithAsset = {
				...SampleBlocks.simple,
				content: `Asset: [[${TestUUIDs.imageAsset}]]`,
			};
			mockAPI.setPageBlocksTree(TestUUIDs.pageWithAssets, [blockWithAsset]);

			setupAsset(TestUUIDs.imageAsset, "png");

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			const isValid = await verifyZipStructure(zip, {
				markdownFile: "Page-With-Assets.md",
				assetFolder: "assets/",
				assetFiles: [`${TestUUIDs.imageAsset}.png`],
				minFiles: 2,
				maxFiles: 3, // Markdown + asset folder + asset file
			});

			expect(isValid).toBe(true);
		});

		it("should fail validation when markdown file missing", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			// Check for wrong filename
			const isValid = await verifyZipStructure(zip, {
				markdownFile: "NonExistent.md",
			});

			expect(isValid).toBe(false);
		});

		it("should fail validation when expected asset missing", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			const zip = await readZipFromBlob(savedFile!.blob);

			// Expect assets that don't exist
			const isValid = await verifyZipStructure(zip, {
				markdownFile: "Simple-Page.md",
				assetFolder: "assets/",
				assetFiles: ["nonexistent.png"],
			});

			expect(isValid).toBe(false);
		});
	});

	describe("ZIP integrity", () => {
		it("should create valid ZIP file", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile).toBeDefined();
			expect(savedFile!.blob.type).toBe("application/zip");

			// Should be readable as ZIP
			await expect(readZipFromBlob(savedFile!.blob)).resolves.toBeDefined();
		});

		it("should create ZIP with correct MIME type", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile!.blob.type).toBe("application/zip");
		});

		it("should have non-zero size", async () => {
			mockAPI.addPage(SamplePages.simple);
			mockAPI.setCurrentPage(SamplePages.simple);
			mockAPI.setPageBlocksTree(TestUUIDs.simplePage, [SampleBlocks.simple]);

			const markdown = await exporter.exportCurrentPage();
			await exporter.downloadAsZip(markdown);

			const savedFile = mockFileAPI.getLastSavedFile();
			expect(savedFile!.blob.size).toBeGreaterThan(0);
		});
	});
});
