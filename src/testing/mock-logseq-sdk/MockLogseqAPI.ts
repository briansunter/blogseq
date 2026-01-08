import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { LogseqAPI } from "../../markdownExporter";

/**
 * Type for DataScript query patterns
 */
type DataScriptQueryPattern = {
	pattern: RegExp | string;
	handler: (query: string, state: MockLogseqState) => unknown[][];
};

/**
 * Error simulation mode configuration
 */
interface ErrorSimulation {
	method: keyof LogseqAPI;
	error: Error;
	afterNCalls?: number;
	callCount: number;
}

/**
 * Timing simulation configuration
 */
interface TimingSimulation {
	method: keyof LogseqAPI;
	delayMs: number;
}

/**
 * Event handler type
 */
type EventHandler = (...args: unknown[]) => void | Promise<void>;

/**
 * Internal state for the mock Logseq API
 */
export interface MockLogseqState {
	pages: Map<string, PageEntity>;
	blocks: Map<string, BlockEntity>;
	currentPage: PageEntity | null;
	currentBlock: BlockEntity | null;
	currentGraph: { path: string; name?: string } | null;
	assets: Map<
		string,
		{
			uuid: string;
			type: string;
			entity: PageEntity | BlockEntity;
		}
	>;
	propertyDefinitions: Map<string, string>;
	messages: Array<{ message: string; type: "success" | "error" | "warning" }>;
}

/**
 * Mock implementation of LogseqAPI
 *
 * This class provides a configurable mock of the Logseq API for testing.
 * It maintains internal state and tracks method calls for assertions.
 */
export class MockLogseqAPI implements LogseqAPI {
	private state: MockLogseqState;
	private queryPatterns: DataScriptQueryPattern[] = [];
	private errorSimulations: Map<keyof LogseqAPI, ErrorSimulation> = new Map();
	private timingSimulations: Map<keyof LogseqAPI, TimingSimulation> = new Map();
	private queryHistory: Array<{ query: string; result: unknown[][]; timestamp: number }> = [];
	private seedState: MockLogseqState | null = null;
	private eventHandlers: Map<string, EventHandler[]> = new Map();

	// Call tracking for spies
	public calls = {
		getCurrentPage: [] as unknown[],
		getCurrentBlock: [] as unknown[],
		getPage: [] as Array<string | number>,
		getBlock: [] as Array<{ id: string | number; opts?: { includeChildren?: boolean } }>,
		getPageBlocksTree: [] as string[],
		getCurrentGraph: [] as unknown[],
		datascriptQuery: [] as string[],
		showMsg: [] as Array<{ message: string; type: "success" | "error" | "warning" }>,
	};

	constructor(initialState?: Partial<MockLogseqState>) {
		this.state = {
			pages: new Map(),
			blocks: new Map(),
			currentPage: null,
			currentBlock: null,
			currentGraph: null,
			assets: new Map(),
			propertyDefinitions: new Map(),
			messages: [],
			...initialState,
		};

		this.setupDefaultQueryPatterns();
	}

	/**
	 * Setup default DataScript query patterns
	 */
	private setupDefaultQueryPatterns(): void {
		// Asset detection query pattern
		this.addQueryPattern(
			/\[:find \?type \(pull \?e \[\*\]\).*\[\?e :logseq\.property\.asset\/type \?type\]/s,
			(query: string, state: MockLogseqState) => {
				const uuidMatch = query.match(/#uuid "([a-f0-9-]+)"/);
				if (!uuidMatch) return [];

				const uuid = uuidMatch[1];
				const asset = state.assets.get(uuid);
				if (!asset) return [];

				return [[asset.type, asset.entity]];
			},
		);

		// Asset type query pattern
		this.addQueryPattern(
			/\[:find \?type.*\[\?e :logseq\.property\.asset\/type \?type\]/s,
			(query: string, state: MockLogseqState) => {
				const uuidMatch = query.match(/#uuid "([a-f0-9-]+)"/);
				if (!uuidMatch) return [];

				const uuid = uuidMatch[1];
				const asset = state.assets.get(uuid);
				if (!asset) return [];

				return [[asset.type]];
			},
		);

		// Property definitions query (old format with ?ident ?title)
		this.addQueryPattern(
			/\[:find \?ident \?title.*\[\?e :db\/ident \?ident\].*\[\?e :block\/title \?title\]/s,
			(_query: string, state: MockLogseqState) => {
				return Array.from(state.propertyDefinitions.entries());
			},
		);

		// Property definitions query (new format with ?prop-key ?prop-title)
		this.addQueryPattern(
			/\[:find \?prop-key \?prop-title.*\[\?prop-entity :db\/ident \?prop-key\].*\[\?prop-entity :block\/title \?prop-title\]/s,
			(_query: string, state: MockLogseqState) => {
				return Array.from(state.propertyDefinitions.entries());
			},
		);

		// Page properties query
		this.addQueryPattern(
			/\[:find \?prop-key \?prop-title.*\[?page :block\/uuid #uuid "([a-f0-9-]+)"\]/s,
			(query: string, state: MockLogseqState) => {
				const uuidMatch = query.match(/#uuid "([a-f0-9-]+)"/);
				if (!uuidMatch) return [];

				const uuid = uuidMatch[1];
				const page = state.pages.get(uuid);
				if (!page || !page.properties) return [];

				const results: [string, string][] = [];
				for (const [key] of Object.entries(page.properties)) {
					const cleanKey = key.startsWith(":") ? key : `:${key}`;
					const title = state.propertyDefinitions.get(cleanKey);
					if (title) {
						results.push([cleanKey, title]);
					}
				}
				return results;
			},
		);

		// Asset by title query
		this.addQueryPattern(
			/\[:find \?uuid \?type.*\[?e :block\/title "([^"]+)"\].*\[?e :logseq\.property\.asset\/type \?type\]/s,
			(query: string, state: MockLogseqState) => {
				const titleMatch = query.match(/\[?e :block\/title "([^"]+)"\]/);
				if (!titleMatch) return [];

				const title = titleMatch[1];
				for (const [uuid, asset] of state.assets) {
					const assetTitle = "name" in asset.entity ? asset.entity.name : undefined;
					if (assetTitle === title) {
						return [[{ $uuid: uuid }, asset.type]];
					}
				}
				return [];
			},
		);

		// DB reference query
		this.addQueryPattern(
			/\[:find \?uuid \?type \?title.*\[?e :db\/id (\d+)\]/s,
			(query: string, state: MockLogseqState) => {
				const idMatch = query.match(/\[?e :db\/id (\d+)\]/);
				if (!idMatch) return [];

				const dbId = parseInt(idMatch[1]);
				// For testing purposes, we'll map db/id to asset index
				const assets = Array.from(state.assets.values());
				if (dbId < assets.length) {
					const asset = assets[dbId];
					const title = "name" in asset.entity ? asset.entity.name : asset.uuid;
					return [[{ $uuid: asset.uuid }, asset.type, title]];
				}
				return [];
			},
		);

		// Title-only query
		this.addQueryPattern(
			/\[:find \?title :where \[?e :db\/id (\d+)\] \[?e :block\/title \?title\]\]/s,
			(query: string, state: MockLogseqState) => {
				const idMatch = query.match(/\[?e :db\/id (\d+)\]/);
				if (!idMatch) return [];

				const dbId = parseInt(idMatch[1]);
				const pages = Array.from(state.pages.values());
				if (dbId < pages.length) {
					return [[pages[dbId].name]];
				}
				return [];
			},
		);
	}

	/**
	 * Helper to handle error simulation and timing for any method
	 */
	private async handleMethodSimulation<T>(
		method: keyof LogseqAPI,
		handler: () => Promise<T> | T,
	): Promise<T> {
		// Check for error simulation
		const errorSim = this.errorSimulations.get(method);
		if (errorSim) {
			errorSim.callCount++;

			if (errorSim.afterNCalls !== undefined) {
				if (errorSim.callCount >= errorSim.afterNCalls) {
					throw errorSim.error;
				}
			} else {
				throw errorSim.error;
			}
		}

		// Check for timing simulation
		const timingSim = this.timingSimulations.get(method);
		if (timingSim) {
			await new Promise((resolve) => setTimeout(resolve, timingSim.delayMs));
		}

		return handler();
	}

	/**
	 * Get the current page
	 */
	async getCurrentPage(): Promise<BlockEntity | PageEntity | null> {
		this.calls.getCurrentPage.push(undefined);
		return this.handleMethodSimulation("getCurrentPage", () => this.state.currentPage);
	}

	/**
	 * Get a page by UUID or EntityID
	 */
	async getPage(id: string | number): Promise<BlockEntity | PageEntity | null> {
		this.calls.getPage.push(id);

		return this.handleMethodSimulation("getPage", () => {
			const uuid = String(id);
			// Check pages
			const page = this.state.pages.get(uuid);
			if (page) return page;

			// Check assets (which can be pages)
			const asset = this.state.assets.get(uuid);
			if (asset && "name" in asset.entity) {
				return asset.entity as PageEntity;
			}

			return null;
		});
	}

	/**
	 * Get a block by UUID or EntityID
	 */
	async getBlock(
		id: string | number,
		opts?: { includeChildren?: boolean },
	): Promise<BlockEntity | null> {
		this.calls.getBlock.push({ id, opts });

		return this.handleMethodSimulation("getBlock", () => {
			const uuid = String(id);
			const block = this.state.blocks.get(uuid);
			if (!block) return null;

			// If includeChildren is false, return block without children
			if (opts?.includeChildren === false) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { children, ...blockWithoutChildren } = block;
				return { ...blockWithoutChildren, children: [] };
			}

			return block;
		});
	}

	/**
	 * Get the block tree for a page
	 */
	async getPageBlocksTree(pageUuid: string): Promise<BlockEntity[]> {
		this.calls.getPageBlocksTree.push(pageUuid);

		return this.handleMethodSimulation("getPageBlocksTree", () => {
			const page = this.state.pages.get(pageUuid);
			if (!page) return [];

			// PageEntity.children is typed as PageEntity[], but in practice it can contain BlockEntity
			return (page.children as unknown as BlockEntity[]) || [];
		});
	}

	/**
	 * Get the current graph
	 */
	async getCurrentGraph(): Promise<{ path: string } | null> {
		this.calls.getCurrentGraph.push(undefined);
		return this.handleMethodSimulation("getCurrentGraph", () => this.state.currentGraph);
	}

	/**
	 * Get the currently focused block
	 */
	async getCurrentBlock(): Promise<BlockEntity | null> {
		this.calls.getCurrentBlock.push(undefined);
		return this.handleMethodSimulation("getCurrentBlock", () => this.state.currentBlock);
	}

	/**
	 * Execute a DataScript query
	 */
	async datascriptQuery(query: string): Promise<unknown[][]> {
		this.calls.datascriptQuery.push(query);

		return this.handleMethodSimulation("datascriptQuery", () => {
			// Try each registered pattern
			for (const { pattern, handler } of this.queryPatterns) {
				const matches = typeof pattern === "string" ? query.includes(pattern) : pattern.test(query);

				if (matches) {
					const result = handler(query, this.state);

					// Store in query history
					this.queryHistory.push({
						query,
						result,
						timestamp: Date.now(),
					});

					return result;
				}
			}

			// No pattern matched - store empty result
			const result: unknown[][] = [];
			this.queryHistory.push({
				query,
				result,
				timestamp: Date.now(),
			});

			return result;
		});
	}

	/**
	 * Show a message to the user
	 */
	showMsg(message: string, type: "success" | "error" | "warning"): void {
		this.calls.showMsg.push({ message, type });
		this.state.messages.push({ message, type });
	}

	// Event handler methods

	/**
	 * Register an event handler
	 */
	on(eventName: string, handler: EventHandler): void {
		if (!this.eventHandlers.has(eventName)) {
			this.eventHandlers.set(eventName, []);
		}
		this.eventHandlers.get(eventName)!.push(handler);
	}

	/**
	 * Unregister an event handler
	 */
	off(eventName: string, handler: EventHandler): void {
		const handlers = this.eventHandlers.get(eventName);
		if (!handlers) return;

		const index = handlers.indexOf(handler);
		if (index >= 0) {
			handlers.splice(index, 1);
		}
	}

	/**
	 * Emit an event to all registered handlers
	 * Useful for testing event-driven code
	 */
	async emit(eventName: string, ...args: unknown[]): Promise<void> {
		const handlers = this.eventHandlers.get(eventName);
		if (!handlers) return;

		for (const handler of handlers) {
			try {
				await handler(...args);
			} catch (error) {
				// Log but don't throw - event handlers shouldn't crash other handlers
				console.error(`Error in event handler for "${eventName}":`, error);
			}
		}
	}

	/**
	 * Get all handlers for an event (for testing/debugging)
	 */
	getHandlers(eventName: string): EventHandler[] {
		return [...(this.eventHandlers.get(eventName) || [])];
	}

	/**
	 * Get count of handlers for an event
	 */
	getHandlerCount(eventName: string): number {
		return this.eventHandlers.get(eventName)?.length ?? 0;
	}

	/**
	 * Clear all handlers for an event or all events
	 */
	clearHandlers(eventName?: string): this {
		if (eventName) {
			this.eventHandlers.delete(eventName);
		} else {
			this.eventHandlers.clear();
		}
		return this;
	}

	// State management methods

	/**
	 * Set the current page
	 */
	setCurrentPage(page: PageEntity | null): this {
		this.state.currentPage = page;
		if (page) {
			this.state.pages.set(page.uuid, page);
		}
		return this;
	}

	/**
	 * Set the current block
	 */
	setCurrentBlock(block: BlockEntity | null): this {
		this.state.currentBlock = block;
		return this;
	}

	/**
	 * Add a page to the state
	 */
	addPage(page: PageEntity): this {
		this.state.pages.set(page.uuid, page);
		return this;
	}

	/**
	 * Add a block to the state
	 */
	addBlock(block: BlockEntity): this {
		this.state.blocks.set(block.uuid, block);
		return this;
	}

	/**
	 * Add an asset to the state
	 * This automatically registers the DataScript query patterns for asset detection
	 */
	addAsset(uuid: string, type: string, entity: PageEntity | BlockEntity): this {
		this.state.assets.set(uuid, { uuid, type, entity });

		// Automatically register DataScript query response for this specific asset
		// This makes addAsset a complete replacement for addDataScriptQueryResponse
		// Use a regex pattern with 's' flag to match across newlines
		const assetQueryPattern = new RegExp(
			`\\[:find\\s+\\?type\\s+\\(pull\\s+\\?e\\s+\\[\\*\\]\\).*` +
				`\\[\\?e\\s+:block/uuid\\s+#uuid\\s+"${uuid}"\\].*` +
				`\\[\\?e\\s+:logseq\\.property\\.asset/type\\s+\\?type\\]\\]`,
			"s",
		);

		// Use addQueryPattern directly since we're using a RegExp
		// Handler checks state to ensure we return the most up-to-date asset data
		this.addQueryPattern(assetQueryPattern, () => {
			const asset = this.state.assets.get(uuid);
			if (asset) {
				return [[asset.type, asset.entity]];
			}
			return [[type, entity]];
		});

		return this;
	}

	/**
	 * Set the current graph
	 */
	setCurrentGraph(graph: { path: string; name?: string } | null): this {
		this.state.currentGraph = graph;
		return this;
	}

	/**
	 * Set the blocks tree for a page
	 * This is a helper method that sets the page's children property
	 */
	setPageBlocksTree(pageUuid: string, blocks: BlockEntity[]): this {
		const page = this.state.pages.get(pageUuid);
		if (page) {
			// TypeScript types PageEntity.children as PageEntity[], but it can contain BlockEntity
			page.children = blocks as unknown as PageEntity[];
		}
		return this;
	}

	/**
	 * Add a property definition
	 */
	addPropertyDefinition(ident: string, title: string): this {
		this.state.propertyDefinitions.set(ident, title);
		return this;
	}

	/**
	 * Add a custom DataScript query pattern
	 */
	addQueryPattern(
		pattern: RegExp | string,
		handler: (query: string, state: MockLogseqState) => unknown[][],
	): this {
		this.queryPatterns.push({ pattern, handler });
		return this;
	}

	/**
	 * Add a DataScript query response for exact query match
	 * This is a convenience method for mocking specific query results
	 */
	addDataScriptQueryResponse(query: string, response: unknown[][]): this {
		const normalizedQuery = query.replace(/\s+/g, " ").trim();
		this.addQueryPattern(normalizedQuery, (incomingQuery: string) => {
			const normalizedIncoming = incomingQuery.replace(/\s+/g, " ").trim();
			return normalizedIncoming === normalizedQuery ? response : [];
		});
		return this;
	}

	/**
	 * Reset all state with optional seed
	 */
	reset(seed?: Partial<MockLogseqState>): this {
		// If we have a saved seed state, use it
		if (this.seedState && !seed) {
			this.state = this.cloneState(this.seedState);
		} else if (seed) {
			// Use provided seed
			this.state = {
				pages: seed.pages || new Map(),
				blocks: seed.blocks || new Map(),
				assets: seed.assets || new Map(),
				propertyDefinitions: seed.propertyDefinitions || new Map(),
				messages: seed.messages || [],
				currentPage: seed.currentPage || null,
				currentBlock: seed.currentBlock || null,
				currentGraph: seed.currentGraph || null,
			};
		} else {
			// Full reset
			this.state.pages.clear();
			this.state.blocks.clear();
			this.state.assets.clear();
			this.state.propertyDefinitions.clear();
			this.state.messages = [];
			this.state.currentPage = null;
			this.state.currentGraph = null;
		}

		this.resetCalls();
		this.errorSimulations.clear();
		this.timingSimulations.clear();
		this.queryHistory = [];
		this.clearHandlers();
		return this;
	}

	/**
	 * Save current state as seed for future resets
	 */
	saveSeed(): this {
		this.seedState = this.cloneState(this.state);
		return this;
	}

	/**
	 * Clone state for seed storage
	 */
	private cloneState(state: MockLogseqState): MockLogseqState {
		return {
			pages: new Map(state.pages),
			blocks: new Map(state.blocks),
			assets: new Map(state.assets),
			propertyDefinitions: new Map(state.propertyDefinitions),
			messages: [...state.messages],
			currentPage: state.currentPage,
			currentBlock: state.currentBlock,
			currentGraph: state.currentGraph,
		};
	}

	/**
	 * Reset call tracking
	 */
	resetCalls(): this {
		this.calls = {
			getCurrentPage: [],
			getCurrentBlock: [],
			getPage: [],
			getBlock: [],
			getPageBlocksTree: [],
			getCurrentGraph: [],
			datascriptQuery: [],
			showMsg: [],
		};
		return this;
	}

	/**
	 * Get the current state (for testing/debugging)
	 */
	getState(): MockLogseqState {
		return this.state;
	}

	/**
	 * Get all messages shown
	 */
	getMessages(): Array<{ message: string; type: "success" | "error" | "warning" }> {
		return [...this.state.messages];
	}

	// Error Simulation Methods

	/**
	 * Configure the mock to throw an error on next call to a method
	 */
	throwOnNextCall(method: keyof LogseqAPI, error: Error = new Error("Mock error")): this {
		this.errorSimulations.set(method, {
			method,
			error,
			callCount: 0,
		});
		return this;
	}

	/**
	 * Configure the mock to throw an error after N calls to a method
	 */
	throwAfterNCalls(
		method: keyof LogseqAPI,
		n: number,
		error: Error = new Error("Mock error"),
	): this {
		this.errorSimulations.set(method, {
			method,
			error,
			afterNCalls: n,
			callCount: 0,
		});
		return this;
	}

	/**
	 * Clear error simulation for a method
	 */
	clearErrorSimulation(method: keyof LogseqAPI): this {
		this.errorSimulations.delete(method);
		return this;
	}

	/**
	 * Clear all error simulations
	 */
	clearAllErrorSimulations(): this {
		this.errorSimulations.clear();
		return this;
	}

	// Timing Simulation Methods

	/**
	 * Configure a method to delay responses by N milliseconds
	 */
	delayResponse(method: keyof LogseqAPI, delayMs: number): this {
		this.timingSimulations.set(method, { method, delayMs });
		return this;
	}

	/**
	 * Clear timing simulation for a method
	 */
	clearTimingSimulation(method: keyof LogseqAPI): this {
		this.timingSimulations.delete(method);
		return this;
	}

	/**
	 * Clear all timing simulations
	 */
	clearAllTimingSimulations(): this {
		this.timingSimulations.clear();
		return this;
	}

	// Query Inspection Methods

	/**
	 * Get the last DataScript query executed
	 */
	getLastQuery(): string | undefined {
		return this.calls.datascriptQuery[this.calls.datascriptQuery.length - 1];
	}

	/**
	 * Get full query history with results and timestamps
	 */
	getQueryHistory(): Array<{ query: string; result: unknown[][]; timestamp: number }> {
		return [...this.queryHistory];
	}

	/**
	 * Get queries matching a pattern
	 */
	getQueriesMatching(pattern: RegExp | string): string[] {
		return this.calls.datascriptQuery.filter((query) => {
			if (typeof pattern === "string") {
				return query.includes(pattern);
			}
			return pattern.test(query);
		});
	}

	/**
	 * Clear query history
	 */
	clearQueryHistory(): this {
		this.queryHistory = [];
		return this;
	}

	// Call Verification Methods

	/**
	 * Check if a method was called
	 */
	wasCalled(method: keyof typeof this.calls): boolean {
		return (this.calls[method] as unknown[]).length > 0;
	}

	/**
	 * Check if a method was called with specific arguments
	 */
	wasCalledWith(method: "getPage" | "getBlock" | "getPageBlocksTree", ...args: unknown[]): boolean {
		const callList = this.calls[method];

		if (method === "getPage") {
			return (callList as Array<string | number>).some((call) => args.includes(call));
		}

		if (method === "getPageBlocksTree") {
			return (callList as string[]).some((call) => args.includes(call));
		}

		if (method === "getBlock") {
			return (
				callList as Array<{ id: string | number; opts?: { includeChildren?: boolean } }>
			).some((call) => args.includes(call.id));
		}

		return false;
	}

	/**
	 * Get number of times a method was called
	 */
	getCallCount(method: keyof typeof this.calls): number {
		return (this.calls[method] as unknown[]).length;
	}

	/**
	 * Get all calls to a specific method
	 */
	getCalls(method: keyof typeof this.calls): unknown[] {
		return [...(this.calls[method] as unknown[])];
	}

	// State Inspection Methods

	/**
	 * Get all pages in state
	 */
	getPages(): PageEntity[] {
		return Array.from(this.state.pages.values());
	}

	/**
	 * Get all blocks in state
	 */
	getBlocks(): BlockEntity[] {
		return Array.from(this.state.blocks.values());
	}

	/**
	 * Get all assets in state
	 */
	getAssets(): Array<{ uuid: string; type: string; entity: PageEntity | BlockEntity }> {
		return Array.from(this.state.assets.values());
	}

	/**
	 * Get page count
	 */
	getPageCount(): number {
		return this.state.pages.size;
	}

	/**
	 * Get block count
	 */
	getBlockCount(): number {
		return this.state.blocks.size;
	}

	/**
	 * Get asset count
	 */
	getAssetCount(): number {
		return this.state.assets.size;
	}

	/**
	 * Check if a page exists
	 */
	hasPage(uuid: string): boolean {
		return this.state.pages.has(uuid);
	}

	/**
	 * Check if a block exists
	 */
	hasBlock(uuid: string): boolean {
		return this.state.blocks.has(uuid);
	}

	/**
	 * Check if an asset exists
	 */
	hasAsset(uuid: string): boolean {
		return this.state.assets.has(uuid);
	}

	// Legacy compatibility methods (deprecated but maintained for backward compatibility)

	/**
	 * @deprecated Use throwOnNextCall instead
	 */
	throwErrorOn(method: keyof LogseqAPI, error: Error = new Error("Mock error")): this {
		return this.throwOnNextCall(method, error);
	}

	/**
	 * @deprecated Use throwOnNextCall with a null return simulation instead
	 */
	returnNullOn(method: keyof LogseqAPI): this {
		return this.throwOnNextCall(method, new Error("Method returned null"));
	}
}
