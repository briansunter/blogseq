import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExport } from "../../../hooks/useExport";
import type { ExportSettings } from "../../../types";

const mockExporter = {
	exportCurrentPage: vi.fn(),
	getReferencedAssets: vi.fn(),
	getGraphPath: vi.fn(),
	downloadAsZip: vi.fn(),
	downloadMarkdown: vi.fn(),
	copyToClipboard: vi.fn(),
};

vi.mock("../../../markdownExporter", () => ({
	createExporter: () => mockExporter,
}));

describe("useExport", () => {
	const settings: ExportSettings = {
		includeProperties: true,
		preserveBlockRefs: true,
		flattenNested: true,
		includePageName: false,
		assetPath: "assets/",
		debug: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();

		(global as any).logseq = {
			UI: {
				showMsg: vi.fn(),
			},
		};

		(window as any).logseq = {
			hideMainUI: vi.fn(),
		};

		mockExporter.getReferencedAssets.mockReturnValue(
			new Map([
				[
					"550e8400-e29b-41d4-a716-446655440000",
					{
						uuid: "550e8400-e29b-41d4-a716-446655440000",
						title: "Cover",
						type: "png",
						originalPath: "/graph/assets/550e8400-e29b-41d4-a716-446655440000.png",
						exportPath: "assets/550e8400-e29b-41d4-a716-446655440000.png",
					},
				],
			]),
		);
		mockExporter.getGraphPath.mockReturnValue("/graph");
	});

	it("should populate preview, assets, and graphPath after a successful export", async () => {
		mockExporter.exportCurrentPage.mockResolvedValue("# Preview");

		const { result } = renderHook(() => useExport(settings));

		let exportResult: Awaited<ReturnType<typeof result.current.handleExport>>;
		await act(async () => {
			exportResult = await result.current.handleExport();
		});

		expect(exportResult!).toEqual({ success: true, markdown: "# Preview" });
		expect(result.current.preview).toBe("# Preview");
		expect(result.current.graphPath).toBe("/graph");
		expect(result.current.assets).toEqual([
			{
				fileName: "550e8400-e29b-41d4-a716-446655440000.png",
				fullPath: "/graph/assets/550e8400-e29b-41d4-a716-446655440000.png",
				title: "Cover",
			},
		]);
	});

	it("should clear stale export state when a later export fails", async () => {
		mockExporter.exportCurrentPage.mockResolvedValueOnce("# First Preview");
		const { result } = renderHook(() => useExport(settings));

		await act(async () => {
			await result.current.handleExport();
		});

		mockExporter.exportCurrentPage.mockRejectedValueOnce(new Error("Export failed"));

		await act(async () => {
			await result.current.handleExport();
		});

		expect(result.current.preview).toBe("");
		expect(result.current.assets).toEqual([]);
		expect(result.current.graphPath).toBe("");
	});

	it("should reuse the current preview when downloading as ZIP", async () => {
		mockExporter.exportCurrentPage.mockResolvedValue("# Preview");
		const { result } = renderHook(() => useExport(settings));

		await act(async () => {
			await result.current.handleExport();
		});

		mockExporter.exportCurrentPage.mockClear();

		await act(async () => {
			await result.current.downloadAsZip();
		});

		expect(mockExporter.exportCurrentPage).not.toHaveBeenCalled();
		expect(mockExporter.downloadAsZip).toHaveBeenCalledWith("# Preview", undefined, "assets/");
	});
});
