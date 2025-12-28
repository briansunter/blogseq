import { act, renderHook } from "@testing-library/react";
import { saveAs } from "file-saver";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAssets } from "../../../hooks/useAssets";
import type { Asset } from "../../../types";

/**
 * useAssets hook test suite
 * Tests asset downloading, clipboard operations, and error handling
 */

// Mock file-saver at module level
vi.mock("file-saver", () => ({
	saveAs: vi.fn(),
}));

describe("useAssets hook", () => {
	const mockAsset: Asset = {
		fileName: "test-image.png",
		fullPath: "/Users/test/graph/assets/uuid-123.png",
		title: "Test Image",
	};

	const mockDocumentAsset: Asset = {
		fileName: "document.pdf",
		fullPath: "/Users/test/graph/assets/uuid-456.pdf",
		title: "Test Document",
	};

	let mockXHR: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock logseq API
		(global as any).logseq = {
			UI: {
				showMsg: vi.fn(),
			},
		};

		// Mock navigator.clipboard
		Object.defineProperty(navigator, "clipboard", {
			writable: true,
			value: {
				writeText: vi.fn().mockResolvedValue(undefined),
				write: vi.fn().mockResolvedValue(undefined),
			},
		});

		// Create reusable mock XHR
		mockXHR = {
			open: vi.fn(),
			send: vi.fn(),
			onload: null as any,
			onerror: null as any,
			response: new Blob(["test data"], { type: "image/png" }),
			status: 200,
			responseType: "",
		};

		global.XMLHttpRequest = vi.fn(() => mockXHR) as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Initial state", () => {
		it("should export downloadAsset function", () => {
			const { result } = renderHook(() => useAssets());
			expect(typeof result.current.downloadAsset).toBe("function");
		});

		it("should export copyAssetPath function", () => {
			const { result } = renderHook(() => useAssets());
			expect(typeof result.current.copyAssetPath).toBe("function");
		});
	});

	describe("downloadAsset", () => {
		it("should initiate XMLHttpRequest with file:// protocol", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);
			});

			expect(mockXHR.open).toHaveBeenCalledWith("GET", `file://${mockAsset.fullPath}`, true);
			expect(mockXHR.send).toHaveBeenCalled();
		});

		it("should set responseType to blob", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);
			});

			expect(mockXHR.responseType).toBe("blob");
		});

		it("should download asset on successful XHR (status 200)", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);

				// Trigger onload
				if (mockXHR.onload) {
					mockXHR.onload();
				}
			});

			expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), mockAsset.fileName);
			expect(logseq.UI.showMsg).toHaveBeenCalledWith(`Downloaded ${mockAsset.fileName}`, "success");
		});

		it("should download asset on status 0 (file:// success)", async () => {
			mockXHR.status = 0;
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);

				if (mockXHR.onload) {
					mockXHR.onload();
				}
			});

			expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), mockAsset.fileName);
		});

		it("should copy path to clipboard on XHR error", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);

				// Trigger onerror
				if (mockXHR.onerror) {
					await mockXHR.onerror();
				}
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAsset.fullPath);
			expect(logseq.UI.showMsg).toHaveBeenCalledWith(
				`Could not download. Path copied: ${mockAsset.fullPath}`,
				"info",
			);
		});

		it("should handle download exceptions with clipboard fallback", async () => {
			// Make XHR throw an error
			global.XMLHttpRequest = vi.fn(() => {
				throw new Error("XHR creation failed");
			}) as any;

			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAsset.fullPath);
			expect(logseq.UI.showMsg).toHaveBeenCalledWith(`Path copied: ${mockAsset.fullPath}`, "info");
		});

		it("should handle file:// protocol correctly", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);
			});

			expect(mockXHR.open).toHaveBeenCalledWith("GET", expect.stringContaining("file://"), true);
		});
	});

	describe("copyAssetPath", () => {
		describe("Image assets", () => {
			it("should detect PNG as image type", async () => {
				const { result } = renderHook(() => useAssets());
				const pngAsset: Asset = {
					fileName: "image.png",
					fullPath: "/path/to/image.png",
					title: "Image",
				};

				await act(async () => {
					await result.current.copyAssetPath(pngAsset);
				});

				// Should attempt XHR for image
				expect(mockXHR.open).toHaveBeenCalled();
			});

			it("should detect JPG as image type", async () => {
				const { result } = renderHook(() => useAssets());
				const jpgAsset: Asset = {
					fileName: "photo.jpg",
					fullPath: "/path/to/photo.jpg",
					title: "Photo",
				};

				await act(async () => {
					await result.current.copyAssetPath(jpgAsset);
				});

				expect(mockXHR.open).toHaveBeenCalled();
			});

			it("should detect JPEG as image type", async () => {
				const { result } = renderHook(() => useAssets());
				const jpegAsset: Asset = {
					fileName: "photo.jpeg",
					fullPath: "/path/to/photo.jpeg",
					title: "Photo",
				};

				await act(async () => {
					await result.current.copyAssetPath(jpegAsset);
				});

				expect(mockXHR.open).toHaveBeenCalled();
			});

			it("should copy PNG image to clipboard on success", async () => {
				mockXHR.status = 200;
				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(mockAsset);

					if (mockXHR.onload) {
						await mockXHR.onload();
					}
				});

				expect(navigator.clipboard.write).toHaveBeenCalledWith(
					expect.arrayContaining([expect.objectContaining({})]),
				);
				expect(logseq.UI.showMsg).toHaveBeenCalledWith("Image copied to clipboard!", "success");
			});

			it("should handle JPG MIME type correctly (image/jpeg)", async () => {
				const jpgAsset: Asset = {
					fileName: "photo.jpg",
					fullPath: "/path/to/photo.jpg",
					title: "Photo",
				};

				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(jpgAsset);
				});

				// Should create XHR for image
				expect(mockXHR.open).toHaveBeenCalled();
			});

			it("should fallback to path copy if image clipboard fails", async () => {
				mockXHR.status = 200;
				vi.mocked(navigator.clipboard.write).mockRejectedValue(new Error("Clipboard error"));

				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(mockAsset);

					if (mockXHR.onload) {
						await mockXHR.onload();
					}
				});

				expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAsset.fullPath);
				expect(logseq.UI.showMsg).toHaveBeenCalledWith(
					`Path copied: ${mockAsset.fileName}`,
					"info",
				);
			});

			it("should copy path on XHR error for images", async () => {
				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(mockAsset);

					if (mockXHR.onerror) {
						await mockXHR.onerror();
					}
				});

				expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAsset.fullPath);
				expect(logseq.UI.showMsg).toHaveBeenCalledWith(
					`Path copied: ${mockAsset.fullPath}`,
					"info",
				);
			});

			it("should detect GIF as image type", async () => {
				const gifAsset: Asset = {
					fileName: "animation.gif",
					fullPath: "/path/to/animation.gif",
					title: "Animation",
				};

				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(gifAsset);
				});

				expect(mockXHR.open).toHaveBeenCalled();
			});

			it("should detect WEBP as image type", async () => {
				const webpAsset: Asset = {
					fileName: "image.webp",
					fullPath: "/path/to/image.webp",
					title: "WebP Image",
				};

				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(webpAsset);
				});

				expect(mockXHR.open).toHaveBeenCalled();
			});
		});

		describe("Document assets", () => {
			it("should copy PDF path directly to clipboard", async () => {
				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(mockDocumentAsset);
				});

				expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockDocumentAsset.fullPath);
				expect(logseq.UI.showMsg).toHaveBeenCalledWith(
					`Path copied: ${mockDocumentAsset.fileName}`,
					"success",
				);
			});

			it("should not use XHR for non-image files", async () => {
				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(mockDocumentAsset);
				});

				// XHR open should not be called for PDF
				expect(mockXHR.open).not.toHaveBeenCalled();
			});

			it("should copy TXT file path directly", async () => {
				const txtAsset: Asset = {
					fileName: "notes.txt",
					fullPath: "/path/to/notes.txt",
					title: "Notes",
				};

				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(txtAsset);
				});

				expect(navigator.clipboard.writeText).toHaveBeenCalledWith(txtAsset.fullPath);
			});
		});

		describe("Error handling", () => {
			it("should handle exceptions gracefully", async () => {
				const { result } = renderHook(() => useAssets());

				vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("Clipboard error"));

				await act(async () => {
					await result.current.copyAssetPath(mockDocumentAsset);
				});

				// Should still attempt clipboard write
				expect(navigator.clipboard.writeText).toHaveBeenCalled();
			});

			it("should always try clipboard as fallback", async () => {
				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(mockAsset);

					// Simulate XHR error
					if (mockXHR.onerror) {
						await mockXHR.onerror();
					}
				});

				expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAsset.fullPath);
			});
		});

		describe("MIME type handling", () => {
			it("should handle uppercase PNG extension", async () => {
				const asset: Asset = {
					fileName: "IMAGE.PNG",
					fullPath: "/path/to/IMAGE.PNG",
					title: "Image",
				};

				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(asset);
				});

				// Should detect as image despite uppercase
				expect(mockXHR.open).toHaveBeenCalled();
			});

			it("should handle mixed case extensions", async () => {
				const asset: Asset = {
					fileName: "Image.PnG",
					fullPath: "/path/to/Image.PnG",
					title: "Image",
				};

				const { result } = renderHook(() => useAssets());

				await act(async () => {
					await result.current.copyAssetPath(asset);
				});

				expect(mockXHR.open).toHaveBeenCalled();
			});
		});

		describe("Asset types", () => {
			const assetTypes = [
				{ ext: "png", isImage: true },
				{ ext: "jpg", isImage: true },
				{ ext: "jpeg", isImage: true },
				{ ext: "gif", isImage: true },
				{ ext: "webp", isImage: true },
				{ ext: "pdf", isImage: false },
				{ ext: "doc", isImage: false },
				{ ext: "txt", isImage: false },
				{ ext: "mp4", isImage: false },
			];

			assetTypes.forEach(({ ext, isImage }) => {
				it(`should handle .${ext} as ${isImage ? "image" : "document"}`, async () => {
					const asset: Asset = {
						fileName: `file.${ext}`,
						fullPath: `/path/to/file.${ext}`,
						title: "File",
					};

					const { result } = renderHook(() => useAssets());

					await act(async () => {
						await result.current.copyAssetPath(asset);
					});

					if (isImage) {
						expect(mockXHR.open).toHaveBeenCalled();
					} else {
						expect(mockXHR.open).not.toHaveBeenCalled();
						expect(navigator.clipboard.writeText).toHaveBeenCalledWith(asset.fullPath);
					}
				});
			});
		});
	});

	describe("File protocols", () => {
		it("should use file:// protocol for downloads", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);
			});

			expect(mockXHR.open).toHaveBeenCalledWith("GET", expect.stringContaining("file://"), true);
		});

		it("should use file:// protocol for image copying", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.copyAssetPath(mockAsset);
			});

			expect(mockXHR.open).toHaveBeenCalledWith("GET", expect.stringContaining("file://"), true);
		});

		it("should handle paths with spaces", async () => {
			const asset: Asset = {
				fileName: "my image.png",
				fullPath: "/Users/test/graph/assets/my image.png",
				title: "My Image",
			};

			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(asset);
			});

			expect(mockXHR.open).toHaveBeenCalledWith("GET", `file://${asset.fullPath}`, true);
		});

		it("should handle paths with special characters", async () => {
			const asset: Asset = {
				fileName: "image (1).png",
				fullPath: "/Users/test/graph/assets/image (1).png",
				title: "Image with parens",
			};

			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(asset);
			});

			expect(mockXHR.open).toHaveBeenCalledWith("GET", expect.stringContaining("file://"), true);
		});
	});

	describe("Callback memoization", () => {
		it("should maintain callback identity across renders", () => {
			const { result, rerender } = renderHook(() => useAssets());

			const oldDownloadAsset = result.current.downloadAsset;
			const oldCopyAssetPath = result.current.copyAssetPath;

			rerender();

			// Callbacks should be memoized with useCallback
			expect(result.current.downloadAsset).toBe(oldDownloadAsset);
			expect(result.current.copyAssetPath).toBe(oldCopyAssetPath);
		});
	});

	describe("XHR status codes", () => {
		it("should handle status 200 as success", async () => {
			mockXHR.status = 200;
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);

				if (mockXHR.onload) {
					mockXHR.onload();
				}
			});

			expect(saveAs).toHaveBeenCalled();
		});

		it("should handle status 0 as success (file:// protocol)", async () => {
			mockXHR.status = 0;
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);

				if (mockXHR.onload) {
					mockXHR.onload();
				}
			});

			expect(saveAs).toHaveBeenCalled();
		});

		it("should not download on error status codes", async () => {
			mockXHR.status = 404;
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.downloadAsset(mockAsset);

				if (mockXHR.onload) {
					mockXHR.onload();
				}
			});

			expect(saveAs).not.toHaveBeenCalled();
		});
	});

	describe("Clipboard API", () => {
		it("should use navigator.clipboard.writeText for paths", async () => {
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.copyAssetPath(mockDocumentAsset);
			});

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockDocumentAsset.fullPath);
		});

		it("should use ClipboardItem for image data", async () => {
			mockXHR.status = 200;
			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.copyAssetPath(mockAsset);

				if (mockXHR.onload) {
					await mockXHR.onload();
				}
			});

			expect(navigator.clipboard.write).toHaveBeenCalled();
		});

		it("should handle clipboard API errors gracefully", async () => {
			vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
				new Error("Clipboard not available"),
			);

			const { result } = renderHook(() => useAssets());

			await act(async () => {
				await result.current.copyAssetPath(mockDocumentAsset);
			});

			// Should still attempt the operation without crashing
			expect(navigator.clipboard.writeText).toHaveBeenCalled();
		});
	});
});
