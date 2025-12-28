/**
 * Mock Logseq SDK for Testing
 *
 * This module provides comprehensive mocks for the Logseq API, File API, and DOM helpers.
 * It's designed to be reusable across unit tests, integration tests, and Historia stories.
 *
 * @example Basic usage in a test
 * ```typescript
 * import { MockLogseqAPI, MockFileAPI, MockDOMHelpers, SamplePages } from '@/testing/mock-logseq-sdk';
 *
 * const mockLogseq = new MockLogseqAPI();
 * mockLogseq.setCurrentPage(SamplePages.simple);
 *
 * const exporter = new MarkdownExporter(mockLogseq);
 * const result = await exporter.exportCurrentPage();
 * ```
 *
 * @example Using builders
 * ```typescript
 * import { PageBuilder, BlockBuilder } from '@/testing/mock-logseq-sdk';
 *
 * const page = new PageBuilder()
 *   .withName('Test Page')
 *   .withProperty('author', 'Brian')
 *   .build();
 * ```
 *
 * @example Configuring responses
 * ```typescript
 * const mockFile = new MockFileAPI();
 * mockFile.setFetchResponse('file:///path/to/asset.png', new Blob(['image data']));
 * ```
 */

export { MockDOMHelpers } from "./MockDOMHelpers";
export { MockFileAPI } from "./MockFileAPI";
// Export mock implementations
export { MockLogseqAPI } from "./MockLogseqAPI";

import { MockDOMHelpers } from "./MockDOMHelpers";
import { MockFileAPI } from "./MockFileAPI";
// Import for internal use
import { MockLogseqAPI } from "./MockLogseqAPI";

// Export builders
export {
	AssetBuilder,
	BlockBuilder,
	createBlockTree,
	// Factory methods
	createBlogPost,
	createDocumentationPage,
	createJournalPage,
	createNotesPage,
	createPageWithBlocks,
	createTaskPage,
	GraphBuilder,
	PageBuilder,
} from "./builders";
// Export fixtures
export {
	AssetVarietyFixtures,
	BlockWithManyChildren,
	// New complex fixtures
	ComplexBlogPost,
	createDeeplyNestedBlocks,
	createMockBlob,
	createMockResponse,
	DeeplyNestedPage,
	JournalPage,
	LargeContentBlock,
	PageWithComplexReferences,
	PropertyVarietyPage,
	SampleAssets,
	SampleBlocks,
	SampleBlockTrees,
	SampleDataScriptResults,
	SampleGraph,
	SamplePages,
	ScenarioFixtures,
	TestUUIDs,
} from "./fixtures";

/**
 * Factory function to create a complete mock SDK
 */
export function createMockSDK() {
	return {
		logseq: new MockLogseqAPI(),
		file: new MockFileAPI(),
		dom: new MockDOMHelpers(),
	};
}

/**
 * Factory function to create a pre-configured mock SDK with common data
 */
export function createPreConfiguredSDK() {
	const sdk = createMockSDK();

	// Add property definitions
	sdk.logseq.addPropertyDefinition(":user.property/author", "author");
	sdk.logseq.addPropertyDefinition(":user.property/tags", "tags");
	sdk.logseq.addPropertyDefinition(":user.property/date", "date");
	sdk.logseq.addPropertyDefinition(":user.property/blogTags", "blogTags");

	// Set graph
	sdk.logseq.setCurrentGraph({
		path: "/Users/test/logseq-graph",
		name: "Test Graph",
	});

	return sdk;
}

/**
 * Utility to reset all mocks in an SDK
 */
export function resetMockSDK(sdk: ReturnType<typeof createMockSDK>) {
	sdk.logseq.reset();
	sdk.file.reset();
	sdk.dom.reset();
}

/**
 * Type guard to check if a value is a PageEntity
 */
export function isPageEntity(
	entity: unknown,
): entity is import("@logseq/libs/dist/LSPlugin").PageEntity {
	return typeof entity === "object" && entity !== null && "name" in entity && "uuid" in entity;
}

/**
 * Type guard to check if a value is a BlockEntity
 */
export function isBlockEntity(
	entity: unknown,
): entity is import("@logseq/libs/dist/LSPlugin").BlockEntity {
	return typeof entity === "object" && entity !== null && "content" in entity && "uuid" in entity;
}

// Re-export types from Logseq for convenience
export type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
export type { MockLogseqState } from "./MockLogseqAPI";

// Export commonly used types
export type MockSDK = ReturnType<typeof createMockSDK>;
export type PreConfiguredSDK = ReturnType<typeof createPreConfiguredSDK>;
