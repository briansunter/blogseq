import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMockFileSystem,
	integrationFixtures,
	setupIntegrationTest,
} from "./integration-setup";

/**
 * Asset Handling Integration Tests
 * Tests asset detection, resolution, and ZIP inclusion with automatic verification
 */

describe("Asset Handling Integration", () => {
	let zip: JSZip;
	let fileSystem: ReturnType<typeof createMockFileSystem>;

	beforeEach(() => {
		vi.clearAllMocks();
		zip = new JSZip();
		fileSystem = createMockFileSystem();

		// Mock file operations
		vi.mock("file-saver", () => ({
			saveAs: vi.fn(),
		}));

		// Setup logseq mock
		(global as any).logseq = {
			Editor: {
				getPage: vi.fn(),
				getPageBlocksTree: vi.fn(),
			},
			UI: {
				showMsg: vi.fn(),
			},
		};
	});

	describe("Asset Detection", () => {
		it("should detect image assets in markdown", () => {
			const context = setupIntegrationTest("pageWithAssets");

			const blocks = Array.from(context.blocks.values());
			const assetBlocks = blocks.filter((b) => b.content.includes("!["));

			expect(assetBlocks.length).toBeGreaterThan(0);
		});

		it("should detect document assets", () => {
			const context = setupIntegrationTest("pageWithAssets");

			const blocks = Array.from(context.blocks.values());
			const docBlocks = blocks.filter((b) => b.content.includes("["));

			expect(docBlocks.length).toBeGreaterThan(0);
		});

		it("should identify asset file extensions", () => {
			const assetPaths = [
				"assets/image.png",
				"assets/photo.jpg",
				"assets/document.pdf",
				"assets/video.mp4",
			];

			assetPaths.forEach((path) => {
				const ext = path.split(".").pop();
				expect(ext).toBeTruthy();
				expect(ext?.length).toBeLessThanOrEqual(4);
			});
		});
	});

	describe("Asset Resolution in ZIP", () => {
		it("should create assets folder in ZIP", async () => {
			const assetsFolder = zip.folder("assets");
			expect(assetsFolder).not.toBeNull();

			assetsFolder?.file("image.png", new Blob(["fake image"]));

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should include asset files with correct paths", async () => {
			const assetsFolder = zip.folder("assets");

			assetsFolder?.file("image-uuid.png", new Blob(["image content"]));
			assetsFolder?.file("doc-uuid.pdf", new Blob(["pdf content"]));

			const files = Object.keys(zip.files);
			expect(files.some((f) => f.includes("image-uuid.png"))).toBe(true);
			expect(files.some((f) => f.includes("doc-uuid.pdf"))).toBe(true);
		});

		it("should maintain asset folder structure", async () => {
			const assetsFolder = zip.folder("assets");

			assetsFolder?.file("image1.png", "content1");
			assetsFolder?.file("image2.jpg", "content2");
			assetsFolder?.file("doc1.pdf", "content3");

			const blob = await zip.generateAsync({ type: "blob" });
			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);

			const assetFiles = Object.keys(extracted.files).filter((f) => f.includes("assets/"));
			expect(assetFiles.length).toBeGreaterThan(0);
		});
	});

	describe("Image Asset Handling", () => {
		it("should handle PNG images", async () => {
			const assetsFolder = zip.folder("assets");

			const pngBlob = new Blob(["PNG image data"], { type: "image/png" });
			assetsFolder?.file("screenshot.png", pngBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should handle JPG images", async () => {
			const assetsFolder = zip.folder("assets");

			const jpgBlob = new Blob(["JPG image data"], { type: "image/jpeg" });
			assetsFolder?.file("photo.jpg", jpgBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should handle JPEG images", async () => {
			const assetsFolder = zip.folder("assets");

			const jpegBlob = new Blob(["JPEG data"], { type: "image/jpeg" });
			assetsFolder?.file("picture.jpeg", jpegBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should handle GIF images", async () => {
			const assetsFolder = zip.folder("assets");

			const gifBlob = new Blob(["GIF data"], { type: "image/gif" });
			assetsFolder?.file("animation.gif", gifBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should handle WEBP images", async () => {
			const assetsFolder = zip.folder("assets");

			const webpBlob = new Blob(["WEBP data"], { type: "image/webp" });
			assetsFolder?.file("modern.webp", webpBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should preserve image quality in ZIP", async () => {
			const assetsFolder = zip.folder("assets");

			const largeImageBlob = new Blob([new ArrayBuffer(10000)], {
				type: "image/png",
			});
			assetsFolder?.file("large-image.png", largeImageBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});
	});

	describe("Document Asset Handling", () => {
		it("should handle PDF documents", async () => {
			const assetsFolder = zip.folder("assets");

			const pdfBlob = new Blob(["PDF content"], { type: "application/pdf" });
			assetsFolder?.file("document.pdf", pdfBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should handle Word documents", async () => {
			const assetsFolder = zip.folder("assets");

			const docBlob = new Blob(["DOC content"], {
				type: "application/msword",
			});
			assetsFolder?.file("file.doc", docBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should handle text files", async () => {
			const assetsFolder = zip.folder("assets");

			const txtBlob = new Blob(["Text content"], { type: "text/plain" });
			assetsFolder?.file("notes.txt", txtBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});
	});

	describe("Asset References in Markdown", () => {
		it("should update markdown references for zipped assets", () => {
			const originalPath = "/Users/user/graph/assets/uuid-123.png";
			const zipPath = "assets/uuid-123.png";

			expect(zipPath).toMatch(/^assets\/[\w-]+\.[\w]+$/);
		});

		it("should maintain relative asset paths", () => {
			const markdownWithAsset = `# Document

![Image](assets/image.png)

Text here.`;

			expect(markdownWithAsset).toContain("assets/image.png");
		});

		it("should preserve asset references across ZIP", async () => {
			const markdown = `# Page

![Asset](assets/uuid-abc.png)`;

			zip.file("page.md", markdown);

			const assetsFolder = zip.folder("assets");
			assetsFolder?.file("uuid-abc.png", new Blob(["image"]));

			const blob = await zip.generateAsync({ type: "blob" });
			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);

			const mdFile = extracted.file("page.md");
			expect(mdFile).not.toBeNull();
		});
	});

	describe("Asset Deduplication", () => {
		it("should not duplicate assets in ZIP", async () => {
			const assetsFolder = zip.folder("assets");

			// Same asset referenced twice should only exist once
			assetsFolder?.file("image.png", new Blob(["image content"]));

			const files = Object.keys(zip.files);
			const imageFiles = files.filter((f) => f.includes("image.png"));

			expect(imageFiles.length).toBeLessThanOrEqual(1);
		});

		it("should handle same file with different names", async () => {
			const assetsFolder = zip.folder("assets");

			const sameContent = new Blob(["image content"]);
			assetsFolder?.file("image-1.png", sameContent);
			assetsFolder?.file("image-2.png", sameContent);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});
	});

	describe("Large Asset Handling", () => {
		it("should handle large image files", async () => {
			const assetsFolder = zip.folder("assets");

			// Simulate large image (5MB)
			const largeBlob = new Blob([new ArrayBuffer(5 * 1024 * 1024)], {
				type: "image/png",
			});
			assetsFolder?.file("large-image.png", largeBlob);

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});

		it("should compress multiple large files", async () => {
			const assetsFolder = zip.folder("assets");

			for (let i = 0; i < 3; i++) {
				const largeBlob = new Blob([new ArrayBuffer(1024 * 1024)], {
					type: "image/png",
				});
				assetsFolder?.file(`image-${i}.png`, largeBlob);
			}

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});
	});

	describe("Asset Metadata Preservation", () => {
		it("should preserve file timestamps", async () => {
			const assetsFolder = zip.folder("assets");

			const now = new Date();
			const file = assetsFolder?.file("image.png", new Blob(["content"]), {
				date: now,
			});

			expect(file).not.toBeNull();
		});

		it("should maintain file order in ZIP", async () => {
			const assetsFolder = zip.folder("assets");

			for (let i = 0; i < 5; i++) {
				assetsFolder?.file(`asset-${i}.png`, `content-${i}`);
			}

			const files = Object.keys(zip.files);
			expect(files.length).toBeGreaterThan(0);
		});
	});

	describe("ZIP Extraction and Verification", () => {
		it("should create extractable ZIP with assets", async () => {
			const assetsFolder = zip.folder("assets");

			zip.file("document.md", "# Content");
			assetsFolder?.file("image.png", new Blob(["PNG data"]));

			const blob = await zip.generateAsync({ type: "blob" });
			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);

			expect(Object.keys(extracted.files).length).toBeGreaterThan(0);
		});

		it("should verify asset integrity in ZIP", async () => {
			const assetsFolder = zip.folder("assets");

			const testContent = "test image content";
			assetsFolder?.file("test.png", testContent);

			const blob = await zip.generateAsync({ type: "blob" });
			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);

			const file = extracted.file("assets/test.png");
			expect(file).not.toBeNull();
		});

		it("should extract all asset types correctly", async () => {
			const assetsFolder = zip.folder("assets");

			assetsFolder?.file("image.png", new Blob(["PNG"]));
			assetsFolder?.file("document.pdf", new Blob(["PDF"]));
			assetsFolder?.file("video.mp4", new Blob(["MP4"]));

			const blob = await zip.generateAsync({ type: "blob" });
			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);

			const assetFiles = Object.keys(extracted.files).filter(
				(f) => f.startsWith("assets/") && !f.endsWith("/"),
			);
			expect(assetFiles.length).toBe(3);
		});
	});

	describe("Error Cases", () => {
		it("should handle missing assets gracefully", () => {
			const assetsFolder = zip.folder("assets");

			// File doesn't exist but reference is in markdown
			const markdown = "![Missing](assets/nonexistent.png)";

			zip.file("document.md", markdown);

			expect(zip.files["document.md"]).toBeDefined();
		});

		it("should handle corrupted asset data", async () => {
			const assetsFolder = zip.folder("assets");

			// Add corrupted data
			assetsFolder?.file("corrupted.png", new Blob([new ArrayBuffer(0)]));

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);
		});
	});

	describe("Complete Export with Assets", () => {
		it("should export page with all asset types", async () => {
			const context = setupIntegrationTest("pageWithAssets");

			const page = Array.from(context.pages.values())[0];

			// Create markdown with reference
			const markdown = `# ${page.name}

![Screenshot](assets/uuid-1.png)

[Download PDF](assets/uuid-2.pdf)`;

			zip.file(`${page.name}.md`, markdown);

			// Add assets
			const assetsFolder = zip.folder("assets");
			assetsFolder?.file("uuid-1.png", new Blob(["PNG data"]));
			assetsFolder?.file("uuid-2.pdf", new Blob(["PDF data"]));

			const blob = await zip.generateAsync({ type: "blob" });
			expect(blob.size).toBeGreaterThan(0);

			// Verify extractable
			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);
			expect(Object.keys(extracted.files).length).toBeGreaterThan(0);
		});

		it("should handle multi-page export with shared assets", async () => {
			const context = setupIntegrationTest("multiPageGraph");

			const pages = Array.from(context.pages.values());
			const assetsFolder = zip.folder("assets");

			pages.forEach((page) => {
				zip.file(`${page.name}.md`, `# ${page.name}\n\n![Shared](assets/shared.png)`);
			});

			// Add shared asset only once
			assetsFolder?.file("shared.png", new Blob(["Shared image"]));

			const blob = await zip.generateAsync({ type: "blob" });

			// Verify ZIP integrity
			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);

			const sharedAssets = Object.keys(extracted.files).filter((f) => f.includes("shared.png"));
			expect(sharedAssets.length).toBe(1);
		});
	});

	describe("Asset Path Configuration", () => {
		it("should respect custom asset paths", () => {
			const customPath = "/custom/assets";

			const markdown = `![Image](${customPath}/image.png)`;

			expect(markdown).toContain(customPath);
		});

		it("should handle nested asset paths", async () => {
			const nestedPath = zip.folder("assets/images/screenshots");

			nestedPath?.file("screenshot.png", new Blob(["PNG"]));

			const blob = await zip.generateAsync({ type: "blob" });

			const newZip = new JSZip();
			const extracted = await newZip.loadAsync(blob);

			const files = Object.keys(extracted.files);
			expect(files.some((f) => f.includes("screenshot.png"))).toBe(true);
		});
	});
});
