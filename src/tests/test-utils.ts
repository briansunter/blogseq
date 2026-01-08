import type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { type Mock, vi } from "vitest";
import { MockDOMHelpers as SDKMockDOMHelpers } from "../testing/mock-logseq-sdk/MockDOMHelpers";
import { MockFileAPI as SDKMockFileAPI } from "../testing/mock-logseq-sdk/MockFileAPI";
import { MockLogseqAPI as SDKMockLogseqAPI } from "../testing/mock-logseq-sdk/MockLogseqAPI";

export type MockLogseqAPI = {
	getCurrentPage: Mock;
	getCurrentBlock: Mock;
	getPage: Mock;
	getBlock: Mock;
	getPageBlocksTree: Mock;
	getCurrentGraph: Mock;
	datascriptQuery: Mock;
	showMsg: Mock;
	Editor: {
		getCurrentPage: Mock;
		getCurrentBlock: Mock;
		getPage: Mock;
		getBlock: Mock;
		getPageBlocksTree: Mock;
	};
	App: { getCurrentGraph: Mock };
	DB: { datascriptQuery: Mock };
	UI: { showMsg: Mock };
};

export type MockFileAPI = {
	fetch: Mock;
	saveAs: Mock;
	createObjectURL: Mock;
	revokeObjectURL: Mock;
	writeToClipboard: Mock;
};

export type MockDOMHelpers = {
	createElement: Mock;
	appendChild: Mock;
	removeChild: Mock;
};

/**
 * Creates a backward-compatible mock API wrapper around the new MockLogseqAPI
 * This maintains compatibility with existing tests while using the new mock system
 */
export const createMockLogseqAPI = (): MockLogseqAPI => {
	const mockInstance = new SDKMockLogseqAPI();

	// Create mock wrappers that delegate to the instance methods
	const getCurrentPageMock = vi.fn(() => mockInstance.getCurrentPage());
	const getCurrentBlockMock = vi.fn(() => mockInstance.getCurrentBlock());
	const getPageMock = vi.fn((uuid: string) => mockInstance.getPage(uuid));
	const getBlockMock = vi.fn((uuid: string) => mockInstance.getBlock(uuid));
	const getPageBlocksTreeMock = vi.fn((uuid: string) => mockInstance.getPageBlocksTree(uuid));
	const getCurrentGraphMock = vi.fn(() => mockInstance.getCurrentGraph());
	const datascriptQueryMock = vi.fn((query: string) => mockInstance.datascriptQuery(query));
	const showMsgMock = vi.fn((msg: string, type: "success" | "error" | "warning") =>
		mockInstance.showMsg(msg, type),
	);

	const api = {
		getCurrentPage: getCurrentPageMock,
		getCurrentBlock: getCurrentBlockMock,
		getPage: getPageMock,
		getBlock: getBlockMock,
		getPageBlocksTree: getPageBlocksTreeMock,
		getCurrentGraph: getCurrentGraphMock,
		datascriptQuery: datascriptQueryMock,
		showMsg: showMsgMock,
		Editor: {
			getCurrentPage: getCurrentPageMock,
			getCurrentBlock: getCurrentBlockMock,
			getPage: getPageMock,
			getBlock: getBlockMock,
			getPageBlocksTree: getPageBlocksTreeMock,
		},
		App: { getCurrentGraph: getCurrentGraphMock },
		DB: { datascriptQuery: datascriptQueryMock },
		UI: { showMsg: showMsgMock },
	};

	// Store the underlying instance for state management
	(api as any)._mockInstance = mockInstance;

	return api;
};

export const createMockPage = (overrides: Partial<PageEntity> = {}): PageEntity =>
	({
		uuid: "page-uuid-123",
		name: "Test Page",
		originalName: "Test Page",
		properties: {},
		file: { path: "/test/path.md" },
		...overrides,
	}) as PageEntity;

export const createMockBlock = (overrides: Partial<BlockEntity> = {}): BlockEntity =>
	({
		uuid: "block-uuid-123",
		content: "Test content",
		children: [],
		properties: {},
		parent: { id: 1 },
		left: { id: 1 },
		format: "markdown",
		page: { id: 1 },
		...overrides,
	}) as BlockEntity;

export const createAssetQueryResponse = (
	uuid: string,
	type: string,
	title: string,
): unknown[][] => [[uuid, type, title]];

export const FIXTURES = {
	simpleBlock: createMockBlock({
		uuid: "simple-block",
		content: "Simple content",
	}),
	blockWithHeading: (level: number) => ({
		...createMockBlock({
			uuid: `heading-${level}`,
			content: `Heading level ${level}`,
		}),
		"logseq.property/heading": level,
	}),
	nestedBlocks: createMockBlock({
		uuid: "parent-block",
		content: "Parent content",
		children: [
			createMockBlock({ uuid: "child-1", content: "Child 1" }),
			createMockBlock({
				uuid: "child-2",
				content: "Child 2",
				children: [createMockBlock({ uuid: "grandchild-1", content: "Grandchild 1" })],
			}),
		],
	}),
	blockWithAsset: createMockBlock({
		uuid: "asset-block",
		content: "![Image](../assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png)",
	}),
	blockWithReference: createMockBlock({
		uuid: "ref-block",
		content: "Content with ((referenced-uuid)) reference",
	}),
	blockWithPageRef: createMockBlock({
		uuid: "page-ref-block",
		content: "Link to [[Another Page]]",
	}),
	blockWithProperties: createMockBlock({
		uuid: "prop-block",
		content: "Block with properties",
		properties: { title: "Test Title", tags: ["tag1", "tag2"], date: "2024-01-01" },
	}),
};

export const setupGlobalMocks = (mockAPI: MockLogseqAPI): void => {
	(global as unknown as { logseq: unknown }).logseq = mockAPI;
	global.fetch = vi.fn();
	global.URL.createObjectURL = vi.fn(() => "blob:test");
	global.URL.revokeObjectURL = vi.fn();

	const mockElement = {
		href: "",
		download: "",
		style: { display: "" },
		click: vi.fn(),
		remove: vi.fn(),
	};
	global.document.createElement = vi.fn(
		() => mockElement,
	) as unknown as typeof document.createElement;
	global.document.body.appendChild = vi.fn();
	global.document.body.removeChild = vi.fn();
};

export const resetAllMocks = (mockAPI: MockLogseqAPI): void => {
	vi.clearAllMocks();

	// Reset the underlying mock instance state
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;
	if (mockInstance) {
		mockInstance.reset();
	}

	Object.values(mockAPI.Editor).forEach((m) => m.mockReset());
	Object.values(mockAPI.App).forEach((m) => m.mockReset());
	Object.values(mockAPI.DB).forEach((m) => m.mockReset());
	Object.values(mockAPI.UI).forEach((m) => m.mockReset());
	if (global.fetch && typeof global.fetch === "function") {
		(global.fetch as Mock).mockReset?.();
	}
};

export const expectMarkdownHeading = (content: string, level: number, text: string): void =>
	expect(content).toMatch(new RegExp(`^${"#".repeat(level)} ${text}`, "m"));

export const expectAssetPath = (content: string, assetPath: string, filename: string): void =>
	expect(content).toContain(`${assetPath}${filename}`);

export const mockCurrentPageResponse = (mockAPI: MockLogseqAPI, page: PageEntity | null): void => {
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;
	if (mockInstance && page) {
		mockInstance.setCurrentPage(page);
		mockInstance.addPage(page);
	}
	mockAPI.Editor.getCurrentPage.mockResolvedValue(page);
};

export const mockCurrentBlockResponse = (
	mockAPI: MockLogseqAPI,
	block: BlockEntity | null,
): void => {
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;
	if (mockInstance && block) {
		mockInstance.setCurrentBlock(block);
		mockInstance.addBlock(block);
	}
	mockAPI.Editor.getCurrentBlock.mockResolvedValue(block);
};

export const mockPageBlocksResponse = (mockAPI: MockLogseqAPI, blocks: BlockEntity[]): void => {
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;
	if (mockInstance) {
		// Track visited blocks to prevent infinite recursion with circular references
		const visited = new Set<string>();

		// Add blocks to the mock instance state (filter out null/undefined)
		blocks.forEach((block) => {
			if (block) {
				mockInstance.addBlock(block);
				if (block.uuid) visited.add(block.uuid);
				if (block.children) {
					const addChildrenRecursive = (children: BlockEntity[]) => {
						children.forEach((child) => {
							if (child && child.uuid && !visited.has(child.uuid)) {
								visited.add(child.uuid);
								mockInstance.addBlock(child);
								if (child.children) {
									addChildrenRecursive(child.children as BlockEntity[]);
								}
							}
						});
					};
					addChildrenRecursive(block.children as BlockEntity[]);
				}
			}
		});
	}
	mockAPI.Editor.getPageBlocksTree.mockResolvedValue(blocks);
};

export const mockGraphResponse = (mockAPI: MockLogseqAPI, path: string | null): void => {
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;
	if (mockInstance) {
		mockInstance.setCurrentGraph(path ? { path } : null);
	}
	mockAPI.App.getCurrentGraph.mockResolvedValue(path ? { path } : null);
};

export const mockAssetQuery = (
	mockAPI: MockLogseqAPI,
	uuid: string,
	type: string | null = null,
): void => {
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;
	if (mockInstance && type) {
		// Use the underlying mock instance to add the asset
		const entity = { uuid, name: "Asset", ":block/title": "Asset" };
		mockInstance.addAsset(uuid, type, entity as any);
	}

	mockAPI.DB.datascriptQuery.mockImplementation((query: string) =>
		query.includes(uuid) && query.includes(":logseq.property.asset/type")
			? Promise.resolve(
					type ? [[type, { ":block/uuid": { $uuid: uuid }, ":block/title": "Asset" }]] : [],
				)
			: Promise.resolve([]),
	);
};

export const mockBlockReference = (
	mockAPI: MockLogseqAPI,
	uuid: string,
	block: BlockEntity | null,
): void => {
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;
	if (mockInstance && block) {
		mockInstance.addBlock(block);
	}
	mockAPI.Editor.getBlock.mockImplementation((id: string) =>
		id === uuid ? Promise.resolve(block) : Promise.resolve(null),
	);
};

export const mockFetchResponse = (status: number, arrayBuffer?: ArrayBuffer): void => {
	const ab = arrayBuffer ?? new ArrayBuffer(0);
	(global.fetch as Mock).mockResolvedValue({
		ok: status === 200,
		status,
		arrayBuffer: vi.fn().mockResolvedValue(ab),
		blob: vi.fn().mockResolvedValue(new Blob([ab])),
	});
};

/**
 * Setup comprehensive asset mocking for tests
 *
 * This helper configures both the MockLogseqAPI and DataScript queries to properly
 * handle asset detection. It ensures that:
 * 1. Assets are registered in the mock API state
 * 2. DataScript queries return asset data in the correct format: [[type, entity]]
 * 3. Asset entities have proper UUID and title properties
 *
 * @param mockAPI - The mock Logseq API instance
 * @param assets - Array of asset configurations to set up
 */
export interface AssetSetup {
	uuid: string;
	type: string;
	title?: string;
	assetPath?: string;
}

export const setupAssetMocking = (mockAPI: MockLogseqAPI, assets: AssetSetup[]): void => {
	const mockInstance = (mockAPI as any)._mockInstance as SDKMockLogseqAPI;

	assets.forEach((asset) => {
		// Create asset entity with proper structure
		const entity = {
			uuid: asset.uuid,
			name: asset.title || `asset-${asset.uuid.substring(0, 8)}`,
			":block/uuid": { $uuid: asset.uuid },
			":block/title": asset.title || `asset-${asset.uuid.substring(0, 8)}`,
			"block/title": asset.title || `asset-${asset.uuid.substring(0, 8)}`,
			properties: {
				"logseq.property.asset/type": asset.type,
			},
		} as unknown as PageEntity;

		// Add to mock instance state
		if (mockInstance) {
			mockInstance.addAsset(asset.uuid, asset.type, entity);
		}
	});
};

/**
 * Setup asset file fetching for ZIP exports
 *
 * Mocks the file:// protocol fetch responses needed when exporting assets to ZIP.
 * When MarkdownExporter tries to fetch asset files, it uses file:// URLs based on
 * the graph path and asset UUIDs.
 *
 * @param mockFileAPI - The mock file API instance with fetch method
 * @param graphPath - The graph path (e.g., '/test/graph')
 * @param assets - Array of assets to set up fetch responses for
 */
export const setupAssetFileFetching = (
	mockFileAPI: MockFileAPI,
	graphPath: string,
	assets: AssetSetup[],
): void => {
	// Build a map of all asset URLs to their blob data
	const assetUrlMap = new Map<string, Blob>();

	assets.forEach((asset) => {
		const fileUrl = `file://${graphPath}/assets/${asset.uuid}.${asset.type}`;
		const assetData = `Binary asset data for ${asset.uuid}`;
		assetUrlMap.set(fileUrl, new Blob([assetData], { type: `application/${asset.type}` }));
	});

	// Mock fetch to handle all asset URLs
	mockFileAPI.fetch.mockImplementation(async (url: string) => {
		const blob = assetUrlMap.get(url);
		if (blob) {
			return {
				ok: true,
				status: 200,
				blob: () => Promise.resolve(blob),
			} as Response;
		}
		// Default fallback for unknown URLs
		return {
			ok: false,
			status: 404,
			blob: () => Promise.resolve(new Blob([])),
		} as Response;
	});
};
