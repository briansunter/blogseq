/**
 * Testing Utilities Index
 * Re-exports all testing utilities for easy imports
 */

// React Testing Utilities
export * from './renderWithLogseq';

// Test Setup Utilities (custom utilities only)
export {
  setupLogseqTest,
  createSamplePage,
  createSampleBlock,
  createSampleAsset,
  createBlockTree,
  createPageWithBlocks,
} from './setupLogseqTest';
export type { SetupLogseqTestOptions, SetupLogseqTestResult, AssetInfo } from './setupLogseqTest';

// ZIP Testing Utilities
export * from './zipHelpers';

// Assertion Helpers
export * from './assertionHelpers';

// Re-export mock SDK classes (avoid duplicate exports)
export { MockLogseqAPI, MockFileAPI, MockDOMHelpers } from '../mock-logseq-sdk';
export type { MockLogseqState } from '../mock-logseq-sdk';
