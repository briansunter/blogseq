import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import * as stories from "../../components/App.stories";
import { MockLogseqAPI } from "../../testing/mock-logseq-sdk";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

let api: MockLogseqAPI;
let hideMainUI: ReturnType<typeof vi.fn>;
let updateSettings: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
	api = new MockLogseqAPI();
	api.setCurrentGraph({ path: "/graph", name: "Test" });
	hideMainUI = vi.fn();
	updateSettings = vi.fn();
	const host = {
		Editor: {
			getCurrentPage: () => api.getCurrentPage(),
			getCurrentBlock: () => api.getCurrentBlock(),
			getPage: (id: string | number) => api.getPage(id),
			getBlock: (id: string | number) => api.getBlock(id),
			getPageBlocksTree: (id: string) => api.getPageBlocksTree(id),
		},
		App: { getCurrentGraph: () => api.getCurrentGraph() },
		DB: { datascriptQuery: (query: string) => api.datascriptQuery(query) },
		UI: { showMsg: vi.fn() },
		on: api.on.bind(api),
		off: api.off.bind(api),
		settings: {},
		updateSettings,
		hideMainUI,
	};
	vi.stubGlobal("logseq", host);
});

afterEach(async () => {
	await act(async () => {
		await api.emit("ui:visible:changed", { visible: false });
	});
	cleanup();
	vi.unstubAllGlobals();
});

async function open() {
	render(<App />);
	await act(async () => {
		await api.emit("ui:visible:changed", { visible: true });
	});
}

const scenarios = [
	["simple page", stories.Default, "My First Blog Post", "React is a powerful UI library"],
	["rich content", stories.RichContent, "React Hooks Tutorial", "Manages component state"],
	["project tasks", stories.NestedBlocks, "Project Planning", "Write tests"],
	["references", stories.WithBlockReferences, "Meeting Notes", "Action item: Review the codebase"],
	[
		"properties",
		stories.WithFrontmatter,
		"Blog Post Draft",
		"New frameworks and tools emerge every year.",
	],
	[
		"long page",
		stories.LongPage,
		"Complete Guide to TypeScript",
		"Interfaces define the structure of objects.",
	],
	[
		"unicode",
		stories.SpecialCharacters,
		"🚀 Project Launch 2024/01/15",
		"Emojis work too: 💡 🔥 ⚡ 🎯",
	],
] as const;

describe("App export sessions", () => {
	it.each(
		scenarios,
	)("auto-exports the %s Storybook scenario", async (_label, story, name, text) => {
		story.parameters?.mockLogseq.setup(api);
		await open();
		expect(await screen.findByText(name)).toBeInTheDocument();
		expect(await screen.findByText(text, { exact: false })).toBeInTheDocument();
		expect(screen.queryByText("Export successful!")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Raw" }));
		expect(document.querySelector("pre")).toHaveTextContent(text);
	});

	it("keeps an empty page usable without a preview", async () => {
		stories.EmptyPage.parameters?.mockLogseq.setup(api);
		await open();
		expect(await screen.findByText("Empty Page")).toBeInTheDocument();
		expect(screen.getByText("No page content to preview")).toBeInTheDocument();
	});

	it("disables export when no page is active", async () => {
		stories.NoActivePage.parameters?.mockLogseq.setup(api);
		await open();
		expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
		expect(screen.getByText(/No active page/)).toBeInTheDocument();
	});

	it("persists controls, refreshes, copies, and downloads a page", async () => {
		stories.Default.parameters?.mockLogseq.setup(api);
		await open();
		await screen.findByRole("button", { name: "Raw" });
		fireEvent.click(screen.getByLabelText("Page Header"));
		expect(updateSettings).toHaveBeenCalledWith({ includePageName: true });
		fireEvent.change(screen.getByPlaceholderText("assets/"), { target: { value: "images/" } });
		expect(updateSettings).toHaveBeenCalledWith({ assetPath: "images/" });
		fireEvent.click(screen.getByTitle("Refresh preview"));
		expect(await screen.findByText("Export successful!")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Copy" }));
		await waitFor(() =>
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				expect.stringContaining("My First Blog Post"),
			),
		);
		fireEvent.click(screen.getByRole("button", { name: "Download MD" }));
		await waitFor(() =>
			expect(logseq.UI.showMsg).toHaveBeenCalledWith("Markdown downloaded!", "success"),
		);
		fireEvent.click(screen.getByRole("main"));
		expect(hideMainUI).toHaveBeenCalledOnce();
	});

	it("reloads external settings and exports once per visible session", async () => {
		stories.Default.parameters?.mockLogseq.setup(api);
		await open();
		await screen.findByRole("button", { name: "Raw" });
		const initialExports = api.calls.getPageBlocksTree.length;
		Object.assign(logseq, { settings: { includePageName: true } });
		await act(async () => {
			await api.emit("settings:changed");
		});
		expect(screen.getByLabelText("Page Header")).toBeChecked();
		expect(api.calls.getPageBlocksTree).toHaveLength(initialExports);
		await act(async () => {
			await api.emit("ui:visible:changed", { visible: false });
		});
		expect(screen.queryByRole("main")).not.toBeInTheDocument();
		await act(async () => {
			await api.emit("ui:visible:changed", { visible: true });
		});
		await waitFor(() => expect(api.calls.getPageBlocksTree.length).toBe(initialExports + 1));
	});

	it("shows a failed refresh and recovers on the next attempt", async () => {
		stories.Default.parameters?.mockLogseq.setup(api);
		await open();
		await screen.findByRole("button", { name: "Raw" });
		vi.spyOn(api, "getPageBlocksTree").mockRejectedValueOnce(new Error("Graph unavailable"));
		fireEvent.click(screen.getByTitle("Refresh preview"));
		expect(await screen.findByText("Graph unavailable")).toBeInTheDocument();
		expect(screen.getByText("No page content to preview")).toBeInTheDocument();
		await act(async () => {
			await api.emit("ui:visible:changed", { visible: false });
		});
		await act(async () => {
			await api.emit("ui:visible:changed", { visible: true });
		});
		expect(await screen.findByRole("button", { name: "Raw" })).toBeInTheDocument();
	});
});
