import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetsDropdown } from "../../components/AssetsDropdown";
import { ExportHeader } from "../../components/ExportHeader";
import * as headers from "../../components/ExportHeader.stories";
import { PreviewContent } from "../../components/PreviewContent";
import * as previews from "../../components/PreviewContent.stories";
import { PreviewControls } from "../../components/PreviewControls";
import { SettingsBar } from "../../components/SettingsBar";
import * as settings from "../../components/SettingsBar.stories";
import { Asset } from "../../types";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("Export header scenarios", () => {
	it.each([
		headers.Default,
		headers.Exporting,
		headers.NoActivePage,
		headers.LongPageName,
		headers.SpecialCharactersInName,
		headers.ExportingWithoutPage,
	])("shows page availability and prevents invalid exports ($args.currentPageName)", (story) => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const props = { ...headers.default.args, ...story.args } as React.ComponentProps<
			typeof ExportHeader
		>;
		const { container } = render(<ExportHeader {...props} />);
		const button = screen.getByRole("button", {
			name: props.isExporting ? "Exporting..." : "Export",
		});
		if (props.isExporting || !props.currentPageName) {
			expect(button).toBeDisabled();
			fireEvent.click(button);
			expect(log).not.toHaveBeenCalled();
		} else {
			expect(screen.getByText(props.currentPageName)).toBeInTheDocument();
			fireEvent.click(button);
			expect(log).toHaveBeenCalledWith("Quick export clicked");
		}
		fireEvent.click(container.querySelectorAll("button")[1]);
		expect(log).toHaveBeenCalledWith("Close clicked");
	});
});

describe("Settings scenarios", () => {
	it.each([
		settings.Default,
		settings.AllEnabled,
		settings.AllDisabled,
		settings.DebugMode,
		settings.CustomAssetPath,
		settings.AbsoluteAssetPath,
		settings.MinimalExport,
		settings.MaximumFidelity,
	])("reflects saved settings and reports changed keys ($args.settings.assetPath)", (story) => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const props = { ...settings.default.args, ...story.args } as React.ComponentProps<
			typeof SettingsBar
		>;
		render(<SettingsBar {...props} />);
		const controls = [
			["Page Header", "includePageName"],
			["Flatten", "flattenNested"],
			["References", "preserveBlockRefs"],
			["Frontmatter", "includeProperties"],
			["Debug", "debug"],
		] as const;
		for (const [label, key] of controls) {
			expect(screen.getByLabelText(label)).toHaveProperty("checked", props.settings[key]);
			fireEvent.click(screen.getByLabelText(label));
			expect(log).toHaveBeenCalledWith("Setting changed:", key);
		}
		expect(screen.getByRole("textbox")).toHaveValue(props.settings.assetPath);
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "new/assets/" } });
		expect(log).toHaveBeenCalledWith("Asset path changed:", "new/assets/");
	});
});

describe("Markdown preview scenarios", () => {
	it.each([
		[previews.Default, "Introduction to Logseq"],
		[previews.SimpleContent, "Simple Page"],
		[previews.CodeHeavy, "Code Examples"],
		[previews.LongArticle, "Understanding React Hooks"],
		[previews.WithImages, "Image Gallery"],
		[previews.ComplexFormatting, "Advanced Markdown Features"],
	] as const)("renders documented content as semantic markdown ($1)", (story, heading) => {
		render(<PreviewContent {...(story.args as React.ComponentProps<typeof PreviewContent>)} />);
		expect(screen.getByRole("heading", { name: heading, level: 1 })).toBeInTheDocument();
		if (story === previews.WithImages) {
			expect(screen.getByAltText("Sample Image")).toHaveAttribute(
				"src",
				"file:///Users/test/logseq-graph/assets/sample-image.png",
			);
		}
	});

	it("keeps raw markdown exact and hides frontmatter in rendered mode", () => {
		const { container, rerender } = render(
			<PreviewContent
				{...(previews.RawMode.args as React.ComponentProps<typeof PreviewContent>)}
			/>,
		);
		expect(container.querySelector("pre")?.textContent).toBe(previews.RawMode.args?.preview);
		rerender(
			<PreviewContent
				{...(previews.OnlyFrontmatter.args as React.ComponentProps<typeof PreviewContent>)}
			/>,
		);
		expect(container.textContent).toBe("");
		rerender(
			<PreviewContent {...(previews.Empty.args as React.ComponentProps<typeof PreviewContent>)} />,
		);
		expect(container.textContent).toBe("");
	});

	it("retains all heading levels and safely opens external links", () => {
		render(
			<PreviewContent
				preview={
					"# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six\n[web](https://example.com)"
				}
				previewMode="rendered"
				graphPath="/graph"
			/>,
		);
		for (let level = 1; level <= 6; level++)
			expect(screen.getByRole("heading", { level })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "web" })).toHaveAttribute("rel", "noreferrer");
		expect(screen.getByRole("link", { name: "web" })).toHaveAttribute(
			"href",
			"https://example.com",
		);
	});
});

const image: Asset = { fileName: "photo.png", fullPath: "/graph/assets/photo.png", title: "Photo" };
const documentAsset: Asset = { fileName: "report.pdf", fullPath: "/graph/assets/report.pdf" };

describe("Assets dropdown", () => {
	it("offers previews, downloads, clipboard paths and compatible drag payloads", () => {
		vi.useFakeTimers();
		const download = vi.fn();
		const copy = vi.fn();
		const { container, unmount } = render(
			<AssetsDropdown
				assets={[image, documentAsset]}
				graphPath="/graph"
				onDownloadAsset={download}
				onCopyAssetPath={copy}
			/>,
		);
		fireEvent.mouseEnter(screen.getByText("2 assets"));
		expect(screen.getByText("Referenced Assets")).toBeInTheDocument();
		expect(screen.getByText("📄")).toBeInTheDocument();
		fireEvent.click(screen.getAllByTitle("Download file")[0]);
		expect(download).toHaveBeenCalledWith(image);
		fireEvent.click(screen.getAllByTitle("Copy image/path to clipboard")[1]);
		expect(copy).toHaveBeenCalledWith(documentAsset);
		const transfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "" };
		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		const dragEvent = createEvent.dragStart(row, { dataTransfer: transfer });
		fireEvent(row, dragEvent);
		expect(transfer.setData).toHaveBeenCalledWith("text/plain", image.fullPath);
		expect(transfer.setData).toHaveBeenCalledWith("text/uri-list", `file://${image.fullPath}`);
		expect(transfer.setData).toHaveBeenCalledWith(
			"DownloadURL",
			`image/png:photo.png:file://${image.fullPath}`,
		);
		expect((dragEvent as DragEvent).dataTransfer?.effectAllowed).toBe("copy");
		expect(row).toHaveStyle({ opacity: "0.5" });
		fireEvent.dragEnd(row);
		expect(row).toHaveStyle({ opacity: "1" });
		fireEvent.error(screen.getByAltText("photo.png"));
		expect(screen.getByAltText("photo.png")).toHaveStyle({ display: "none" });
		fireEvent.mouseLeave(screen.getByText("2 assets"));
		act(() => {
			vi.advanceTimersByTime(299);
		});
		expect(screen.getByText("Referenced Assets")).toBeInTheDocument();
		fireEvent.mouseEnter(screen.getByText("Referenced Assets"));
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(screen.getByText("Referenced Assets")).toBeInTheDocument();
		fireEvent.mouseLeave(screen.getByText("Referenced Assets"));
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(screen.queryByText("Referenced Assets")).not.toBeInTheDocument();
		fireEvent.mouseEnter(screen.getByText("2 assets"));
		fireEvent.mouseLeave(screen.getByText("2 assets"));
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("falls back to the system clipboard and handles unknown files without image dragging", () => {
		const clipboard = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
		const asset = { fileName: "README", fullPath: "/graph/assets/README" };
		const { container, rerender } = render(
			<AssetsDropdown assets={[asset]} graphPath="/graph" onDownloadAsset={vi.fn()} />,
		);
		fireEvent.mouseEnter(screen.getByText("1 asset"));
		expect(screen.getByText("📎")).toBeInTheDocument();
		fireEvent.click(screen.getByTitle("Copy image/path to clipboard"));
		expect(clipboard).toHaveBeenCalledWith(asset.fullPath);
		const transfer = { setData: vi.fn(), setDragImage: vi.fn() };
		fireEvent.dragStart(container.querySelector('[draggable="true"]') as HTMLElement, {
			dataTransfer: transfer,
		});
		expect(transfer.setDragImage).not.toHaveBeenCalled();
		rerender(<AssetsDropdown assets={[]} graphPath="/graph" onDownloadAsset={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
	});
});

it("wires preview actions and disables refresh while exporting", () => {
	const actions = {
		onRefresh: vi.fn(),
		onPreviewModeChange: vi.fn(),
		onCopyToClipboard: vi.fn(),
		onDownload: vi.fn(),
		onDownloadAsZip: vi.fn(),
		onDownloadAsset: vi.fn(),
		onCopyAssetPath: vi.fn(),
	};
	const { rerender } = render(
		<PreviewControls
			assetCount={1}
			assets={[image]}
			graphPath="/graph"
			isExporting={false}
			previewMode="rendered"
			{...actions}
		/>,
	);
	fireEvent.click(screen.getByTitle("Refresh preview"));
	fireEvent.click(screen.getByText("Raw"));
	fireEvent.click(screen.getByText("Rendered"));
	fireEvent.click(screen.getByText("Copy"));
	fireEvent.click(screen.getByText("Download MD"));
	fireEvent.click(screen.getByText("ZIP (1)"));
	expect(actions.onRefresh).toHaveBeenCalledOnce();
	expect(actions.onPreviewModeChange.mock.calls).toEqual([["raw"], ["rendered"]]);
	expect(actions.onCopyToClipboard).toHaveBeenCalledOnce();
	expect(actions.onDownload).toHaveBeenCalledOnce();
	expect(actions.onDownloadAsZip).toHaveBeenCalledOnce();
	rerender(
		<PreviewControls
			assetCount={0}
			assets={[]}
			graphPath="/graph"
			isExporting={true}
			previewMode="raw"
			{...actions}
		/>,
	);
	expect(screen.getByTitle("Refresh preview")).toBeDisabled();
	expect(screen.queryByText(/ZIP/)).not.toBeInTheDocument();
});
