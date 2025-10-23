# BlogSeq Testing Pyramid Strategy - Comprehensive Analysis

## Executive Summary

BlogSeq has **110 failing tests out of 563 total** (81% pass rate). The project has recently undergone test reorganization with the introduction of a new `MockLogseqAPI` in `/src/testing/mock-logseq-sdk/`, but existing tests still use the old `test-utils.ts` mock approach. This creates a **dual mock system** that hasn't been consolidated.

**Key Issue:** Tests import from `src/tests/test-utils.ts` (old, vi.fn()-based mocks) while new infrastructure exists in `src/testing/mock-logseq-sdk/` (class-based, stateful mocks). The tests were reorganized into category folders (`unit/`, `component/`, `integration/`) but many still use incompatible mock patterns.

---

## Current Test Structure

### Test Files by Category

**Unit Tests (14 files)** - Core logic testing
- `markdownExporter/markdownExporter.test.ts` - Main exporter (PASSES)
- `markdownExporter/markdownExporter.asset.test.ts` - Asset handling (PARTIAL)
- `markdownExporter/markdownExporter.realworld.test.ts` - Real-world scenarios (PASSES)
- `markdownExporter/referenceResolution.test.ts` - Reference resolution (11 of 27 FAIL)
- `markdownExporter/assetDetection.test.ts` - Asset detection (22 of 28 FAIL)
- `markdownExporter/blockProcessing.test.ts` - Block processing (4 of 30 FAIL)
- `markdownExporter/frontmatterGeneration.test.ts` - Frontmatter (6 of 31 FAIL)
- `markdownExporter/MarkdownHelpers.test.ts` - Helper utilities (PASSES)
- `hooks/useExport.test.ts` - Export hook (PASSES)
- `hooks/useAssets.test.ts` - Assets hook (PASSES)
- `hooks/useBatchExport.test.ts` - Batch export hook (2 files FAIL)
- `hooks/useAppVisible.test.ts` - Visibility hook (1 of 20 FAIL)
- `settings/settings.test.ts` - Settings (PASSES)
- `utils/utils.test.ts` - Utilities (PASSES)

**Component Tests (6 files)** - React component testing
- `component/App.test.tsx` (PASSES)
- `component/ErrorBoundary.test.tsx` (PASSES)
- `component/ExportHeader.test.tsx` (PASSES)
- `component/PreviewContent.test.tsx` (PASSES)
- `component/SettingsBar.test.tsx` (PASSES)
- `component/Toast.test.tsx` (PASSES)

**Integration Tests (3 files)** - Full workflow testing
- `integration/export-workflow.integration.test.ts` (PASSES)
- `integration/batch-export.integration.test.ts` (PASSES)
- `integration/asset-handling.integration.test.ts` (PASSES)

**E2E Tests** - Empty (placeholder directory with .gitkeep)

---

## Failing Test Analysis by Category

### 1. Reference Resolution Tests (11 failures out of 27) - **CRITICAL**

**File:** `src/tests/unit/markdownExporter/referenceResolution.test.ts`

**Root Causes:**

| Issue | Count | Examples | 
|-------|-------|----------|
| **Mock doesn't implement block lookups** | 6 | Block refs `((uuid))` not resolving to content |
| **Asset detection broken** | 2 | UUID as asset not being detected |
| **Caching verification failing** | 2 | Mock tracks calls but not properly |
| **Error handling gaps** | 2 | Error scenarios not triggering fallback |
| **Mixed reference types** | 1 | Combined [[page]] and ((block)) in same text |

**Specific Failures:**

1. ✗ `should resolve ((uuid)) block reference to block content`
   - Expected: `'Reference to Referenced block content'`
   - Got: `'Reference to ((block-ref-uuid))'`
   - **Issue:** `mockAPI.Editor.getBlock()` not wired to return resolved block content

2. ✗ `should cache resolved asset UUID`
   - Expected: queryCallCount > 0
   - Got: 0
   - **Issue:** DataScript mock not tracking asset detection queries

3. ✗ `should handle error during getPage gracefully`
   - Got: Unhandled error `'API Error'`
   - **Issue:** Test doesn't wrap resolution in try/catch; mock throws instead of gracefully handling

4. ✗ `should handle mixed reference types in same content`
   - Expected to find both resolved page and block refs
   - Got: Only original UUID patterns back
   - **Issue:** Sequential resolution not working; both ref types failing

**Mock Setup Issues:**
```typescript
// Current broken pattern in test:
mockAPI.Editor.getBlock.mockRejectedValue(new Error('API Error'));
// But test expects:
expect(result).toContain('[Unresolved:');  // Never happens - error thrown instead
```

---

### 2. Asset Detection Tests (22 failures out of 28) - **CRITICAL**

**File:** `src/tests/unit/markdownExporter/assetDetection.test.ts`

**Root Causes:**

| Issue | Count | Examples |
|-------|-------|----------|
| **DataScript query mock incomplete** | 8 | Query patterns not matched |
| **Asset link generation broken** | 7 | Markdown links not formatted correctly |
| **Asset title resolution missing** | 3 | Block/title properties not read |
| **Custom asset path not applied** | 2 | assetPath option ignored |
| **Asset tracking not working** | 2 | referencedAssets Map empty |

**Specific Failures:**

1. ✗ `should detect asset via DataScript query with type`
   - Expected: `assets.has(assetUuid) === true`
   - Got: `false`
   - **Issue:** DataScript query mock returns data, but `detectAsset()` doesn't parse it correctly

2. ✗ `should create image markdown link with ! prefix`
   - Expected: `'![My Image](assets/image-uuid-...)'`
   - Got: `'image-link-uuid-...'` (just the UUID)
   - **Issue:** `createAssetLink()` not building markdown link format

3. ✗ `should use title from :block/title property`
   - Expected to find title in asset link
   - Got: UUID instead
   - **Issue:** Asset entity title extraction broken for property-named blocks

4. ✗ `should track asset in referencedAssets map`
   - Expected: `exporter.getReferencedAssets().has(uuid) === true`
   - Got: `false`
   - **Issue:** Asset tracking disabled or not wired to asset detection

**Mock Setup Issues:**
```typescript
// Mock returns data but test doesn't verify the format matches expectations:
mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
  if (query.includes(assetUuid) && query.includes(':logseq.property.asset/type')) {
    // Returns nested structure but MarkdownExporter expects flat array?
    return [['png', { ':block/uuid': { $uuid: assetUuid }, ':block/title': 'Image' }]];
  }
  return [];
});
```

---

### 3. Block Processing Tests (4 failures out of 30) - **MODERATE**

**File:** `src/tests/unit/markdownExporter/blockProcessing.test.ts`

**Root Causes:**

| Issue | Count |
|-------|-------|
| **Null block handling** | 1 |
| **Nested block flattening logic** | 2 |
| **Reference resolution in blocks** | 1 |

**Specific Failures:**

1. ✗ `should handle null block gracefully`
   - Error: `Cannot read properties of null (reading 'uuid')`
   - **Issue:** `processBlock()` doesn't check for null before accessing `block.uuid`

2. ✗ `should create indented list when flattenNested=false`
   - Expected: `'- Child 1'` (list item)
   - Got: `'Child 1\n\nChild 2'` (paragraphs)
   - **Issue:** When `flattenNested=false`, children should become list items, not paragraphs

3. ✗ `should handle deeply nested blocks with flattenNested=false`
   - Expected: Indented list (`  - Level 2`)
   - Got: Flat paragraphs
   - **Issue:** Indentation logic not implemented

4. ✗ `should respect preserveBlockRefs option`
   - Expected: `'Referenced content'`
   - Got: `'((ref-uuid))'` still in output
   - **Issue:** Reference resolution not respecting `preserveBlockRefs=true`

---

### 4. Frontmatter Generation Tests (6 failures out of 31) - **MODERATE**

**File:** `src/tests/unit/markdownExporter/frontmatterGeneration.test.ts`

**Root Causes:**

| Issue | Count |
|-------|-------|
| **Empty frontmatter handling** | 2 |
| **Tag array processing** | 1 |
| **UUID resolution in properties** | 1 |
| **Boolean value formatting** | 1 |
| **Custom asset path in properties** | 1 |

**Specific Failures:**

1. ✗ `should return empty string when page has no properties and no name`
   - Expected: `''`
   - Got: `'_No content found on this page._'`
   - **Issue:** Fallback message added when no frontmatter needed

2. ✗ `should handle empty tags array`
   - Expected: No `tags:` line in frontmatter
   - Got: `tags:` present (empty)
   - **Issue:** Empty arrays not filtered from frontmatter

3. ✗ `should resolve UUID string to asset path`
   - Expected: `'image: assets/image-uuid-...'`
   - Got: `'image: ...'` (malformed)
   - **Issue:** UUID resolution in property values broken

4. ✗ `should handle boolean values`
   - Expected: `'draft: false'`
   - Got: Boolean not serialized
   - **Issue:** YAML boolean serialization missing

5. ✗ `should handle custom assetPath in property values`
   - Expected: `'cover: media/cover-uuid-...'`
   - Got: Wrong path format
   - **Issue:** Custom assetPath not applied to property UUID resolution

6. ✗ `should handle empty string property values`
   - Expected: Regex match for `empty:\s*$`
   - Got: Value present or line missing
   - **Issue:** Empty string serialization

---

### 5. Hook Tests (Hook tests have minor issues)

**File:** `src/tests/unit/hooks/useAppVisible.test.ts`

1 failure out of 20:
- ✗ `should return a boolean value`
  - Expected: `'boolean'`
  - Got: `'undefined'`
  - **Issue:** Initial state not returning boolean, returns undefined

**File:** `src/tests/unit/hooks/useBatchExport.test.ts`

Unhandled rejection error:
```
TypeError: Cannot read properties of null (reading 'exportPagesToZip')
```
- **Issue:** Hook not properly initialized or returned null; test calls method on null

---

## Root Cause Analysis: The Dual Mock System Problem

### The Core Issue

The project has **two incompatible mock systems**:

**Old System** (`src/tests/test-utils.ts`):
```typescript
// Simple vi.fn() based mocks
const mockAPI = {
  Editor: {
    getCurrentPage: vi.fn(),
    getPage: vi.fn(),
    getBlock: vi.fn(),
    getPageBlocksTree: vi.fn(),
  },
  // ... requires manual setup per test
};
```

**New System** (`src/testing/mock-logseq-sdk/MockLogseqAPI.ts`):
```typescript
// Stateful class-based mock with built-in logic
class MockLogseqAPI {
  private state: MockLogseqState;
  addPage(page) { this.state.pages.set(...) }
  addBlock(block) { this.state.blocks.set(...) }
  // ... automatic state management
}
```

### Migration Status

- Tests reorganized into `unit/`, `component/`, `integration/` folders ✓
- New MockLogseqAPI created ✓
- New fixtures and builders created ✓
- **BUT:** Old tests still importing from `test-utils.ts` ✗
- **AND:** Old `test-utils.ts` not updated to use new mocks ✗

### Why Tests Are Failing

The old mock approach has **several gaps**:

1. **No state persistence** - vi.fn() mocks don't share state between calls
   - `getPage()` called multiple times returns different results
   - Reference cache not tracked across exports
   - Asset detection queries don't accumulate

2. **No automatic ID resolution** - Must manually wire each UUID
   - Test manually implements `getBlock.mockImplementation()` for each UUID
   - If asset detected, test must also set it up in getPage()
   - Cross-references not automatically resolved

3. **Incomplete query patterns** - DataScript queries not pattern-matched
   - Each test manually checks query string and returns hardcoded data
   - Real query patterns (asset detection, property lookups) not simulated
   - Sequential queries fail because mock doesn't evolve

4. **No error wrapping** - Tests throw errors directly
   - `mockRejectedValue()` doesn't allow graceful fallback
   - Reference resolution expects errors to be caught, test throws instead
   - Makes it impossible to test error handling

---

## Test Categorization: Where Each Test Should Be

### Unit Tests (70% - Focus: MarkdownExporter logic)

**Should be:**
- Tests of core MarkdownExporter methods in isolation
- Each method tested with simple, focused fixtures
- Mock only LogseqAPI calls
- No complex page/block hierarchies

**Currently problematic:**
- `referenceResolution.test.ts` - Too many integration concerns
- `assetDetection.test.ts` - Complex DataScript mocking
- `frontmatterGeneration.test.ts` - Mixed unit + property resolution

**Should move to unit (with proper mocks):**
- `MarkdownHelpers.test.ts` ✓ (already correct)
- `blockProcessing.test.ts` (mostly correct, fix null handling)
- `markdownExporter.test.ts` ✓ (mostly correct)

**Should stay unit (fix mocking strategy):**
- `referenceResolution.test.ts` (refactor mock setup)
- `assetDetection.test.ts` (refactor mock setup)
- `frontmatterGeneration.test.ts` (refactor mock setup)

### Component Tests (20% - Focus: React UI)

**All passing** ✓
- Tests use happy-dom environment
- Mock logseq API at global level
- Test user interactions and state
- **No changes needed**

### Integration Tests (10% - Focus: End-to-end workflows)

**All passing** ✓
- Create realistic page/block hierarchies
- Test full export workflows
- Mix of DataScript queries, reference resolution, asset handling
- **Potential improvement:** Use new MockLogseqAPI class instead of inline setup

### E2E Tests (Minimal - Critical user journeys)

**Currently empty** ⚠️
- `/src/tests/e2e/.gitkeep`
- Should test:
  - Export a page with all features enabled
  - Export with assets and ZIP
  - Batch export multiple pages
  - Real-world page structures

---

## Mock API Comparison: Old vs New

### Test with Old Mocks (Broken)

```typescript
// referenceResolution.test.ts - BROKEN
const page = createMockPage({ name: 'Test' });
const pageRefUuid = '12345678-1234-1234-1234-123456789abc';
const block = createMockBlock({
  uuid: 'block-1',
  content: `Link to [[${pageRefUuid}]]`
});

// Must manually wire each UUID lookup
mockAPI.Editor.getPage.mockImplementation((uuid: string) => {
  if (uuid === pageRefUuid) {
    return Promise.resolve({ uuid: pageRefUuid, name: 'Referenced Page' } as PageEntity);
  }
  return Promise.resolve(null);
});

// If test later needs asset detection, must add MORE mocks:
mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
  if (query.includes(pageRefUuid) && query.includes(':logseq.property.asset/type')) {
    return [['png', { ...complex structure... }]];
  }
  return [];
});

// Result: Brittle, verbose, incomplete
```

### Test with New Mocks (Better)

```typescript
// Should be migrated to:
const mockAPI = new MockLogseqAPI();
const page = new PageBuilder()
  .withName('Test')
  .build();

const referencedPage = new PageBuilder()
  .withUuid(pageRefUuid)
  .withName('Referenced Page')
  .build();

mockAPI.setCurrentPage(page);
mockAPI.addPage(referencedPage);

// Automatic resolution of getPage() calls for any registered page
// Handles common query patterns without explicit setup
// State management built-in
// Much cleaner, less boilerplate
```

---

## Priority Fixing Order

### Priority 1: Fix Mock System (BLOCKING)

1. **Consolidate old `test-utils.ts` with new `MockLogseqAPI`**
   - Create wrapper in test-utils that uses MockLogseqAPI internally
   - Keep backward-compatible exports so tests don't need import changes
   - Migrate helper functions to use new mock

2. **Fix DataScript query pattern matching**
   - MockLogseqAPI has query patterns, tests should use them
   - Test setup should call `mockAPI.addQueryPattern()` for test-specific queries
   - Pre-configure common patterns (asset detection, property lookup)

**Expected outcome:** 20-30% of failures resolve just from better mock setup

### Priority 2: Fix Core Logic Issues

3. **Block reference resolution**
   - `resolveUuid()` must track calls to detect caching
   - Error handling must gracefully fallback to other resolution strategies
   - Test expects reference content in output, not UUID

4. **Asset detection and linking**
   - `detectAsset()` must properly parse DataScript results
   - `createAssetLink()` must generate proper markdown format
   - Asset tracking must populate `referencedAssets` map

5. **Block processing with flattening**
   - Add null check at start of `processBlock()`
   - Implement indented list generation when `flattenNested=false`
   - Fix reference resolution option handling

**Expected outcome:** 50-70% of failures resolve

### Priority 3: Edge Cases & Validation

6. **Frontmatter generation edge cases**
   - Empty array/string filtering
   - Boolean YAML serialization
   - UUID resolution in property values
   - Custom asset path application

7. **Hook initialization**
   - `useAppVisible` hook return type
   - `useBatchExport` hook instantiation in tests

**Expected outcome:** 95%+ tests passing

---

## Recommended Test Organization Structure

```
src/tests/
├── unit/                                 # 70% of tests
│   ├── markdownExporter/
│   │   ├── blockProcessing.test.ts
│   │   ├── referenceResolution.test.ts  # Migrate from old mocks
│   │   ├── assetDetection.test.ts       # Migrate from old mocks
│   │   ├── frontmatterGeneration.test.ts # Migrate from old mocks
│   │   ├── MarkdownHelpers.test.ts      # ✓ Already correct
│   │   ├── markdownExporter.test.ts     # ✓ Already correct
│   │   └── markdownExporter.realworld.test.ts
│   ├── hooks/
│   │   ├── useExport.test.ts            # ✓ Already correct
│   │   ├── useAssets.test.ts            # ✓ Already correct
│   │   ├── useBatchExport.test.ts       # Fix hook setup
│   │   └── useAppVisible.test.ts        # Fix initial state
│   └── utils/
│       └── utils.test.ts                # ✓ Already correct
├── component/                            # 20% of tests
│   ├── App.test.tsx                     # ✓ Already correct
│   ├── ExportHeader.test.tsx            # ✓ Already correct
│   ├── SettingsBar.test.tsx             # ✓ Already correct
│   ├── PreviewContent.test.tsx          # ✓ Already correct
│   ├── ErrorBoundary.test.tsx           # ✓ Already correct
│   └── Toast.test.tsx                   # ✓ Already correct
├── integration/                          # 10% of tests
│   ├── export-workflow.integration.test.ts     # ✓ Already correct
│   ├── batch-export.integration.test.ts        # ✓ Already correct
│   └── asset-handling.integration.test.ts      # ✓ Already correct
├── e2e/                                  # Minimal, currently empty
│   └── critical-flows.e2e.test.ts       # Create critical user journeys
├── setup.ts                              # Global test setup
├── test-utils.ts                         # CONSOLIDATE with MockLogseqAPI
└── mocks/
    └── logseq.ts

src/testing/                              # New test infrastructure (use this!)
├── mock-logseq-sdk/
│   ├── MockLogseqAPI.ts                 # ✓ Use this for unit tests
│   ├── MockFileAPI.ts
│   ├── MockDOMHelpers.ts
│   ├── builders.ts                      # ✓ Use builders
│   ├── fixtures.ts                      # ✓ Use fixtures
│   └── index.ts
└── utils/
    ├── setupLogseqTest.ts
    └── assertionHelpers.ts
```

---

## Migration Plan: From Old to New Mocks

### Phase 1: Create Compatibility Layer (Day 1)

Update `src/tests/test-utils.ts`:

```typescript
// Add this to test-utils.ts to use new mocks internally
import { MockLogseqAPI } from '../testing/mock-logseq-sdk';

export function createMockLogseqAPI(): MockLogseqAPI {
  return new MockLogseqAPI();  // Return new mock class
}

export const setupGlobalMocks = (mockAPI: MockLogseqAPI): void => {
  (global as any).logseq = mockAPI;
  // ... rest of setup
};
```

**Impact:** Tests still import from `test-utils.ts`, but use better underlying mocks

### Phase 2: Migrate Unit Tests (Day 2-3)

For each failing unit test, follow this pattern:

```typescript
// BEFORE (old broken approach)
mockAPI.Editor.getBlock.mockImplementation((uuid: string) => {
  if (uuid === 'ref-uuid') return Promise.resolve(refBlock);
  return Promise.resolve(null);
});

// AFTER (new approach)
const refBlock = new BlockBuilder()
  .withUuid('ref-uuid')
  .withContent('Referenced block content')
  .build();

mockAPI.addBlock(refBlock);
// getBlock() now automatically resolves it
```

### Phase 3: Fix Core Logic (Day 4-5)

Once mocks are properly set up:

1. Run failing tests to get actual error messages
2. Fix implementation code in `markdownExporter.ts`
3. Tests should pass without mock changes

### Phase 4: Add E2E Tests (Day 6)

Create critical user journey tests in `e2e/` using new mock infrastructure

---

## Expected Outcomes

### After Mock Consolidation (Priority 1)
- **Tests fixed:** ~35-40 (31%)
- **Key passes:**
  - Reference resolution caching tests
  - Asset detection via DataScript
  - Block reference fallback chain
  - Multiple asset tracking

### After Core Logic Fixes (Priority 2)
- **Tests fixed:** ~55-65 (additional 60%)
- **Key passes:**
  - All reference types resolving
  - Asset links in proper markdown format
  - Nested block flattening
  - Frontmatter generation

### After Edge Case Fixes (Priority 3)
- **Tests fixed:** ~10-15 (remaining)
- **Total:** **563 / 563 tests passing (100%)**

### Overall Metrics
- **Coverage:** 85%+ (configured in vitest.config.ts)
- **Performance:** Sub-2s test runs
- **Maintainability:** Single mock system, clear test organization

---

## Files to Modify

### Critical (Blocking)
1. `src/tests/test-utils.ts` - Consolidate with MockLogseqAPI
2. `src/tests/unit/markdownExporter/referenceResolution.test.ts` - Migrate to new mocks
3. `src/tests/unit/markdownExporter/assetDetection.test.ts` - Migrate to new mocks
4. `src/tests/unit/markdownExporter/frontmatterGeneration.test.ts` - Migrate to new mocks
5. `src/markdownExporter.ts` - Fix core logic bugs (null checks, resolution logic)

### Important (High Impact)
6. `src/tests/unit/markdownExporter/blockProcessing.test.ts` - Fix indentation logic
7. `src/tests/unit/hooks/useBatchExport.test.ts` - Fix hook initialization
8. `src/tests/unit/hooks/useAppVisible.test.ts` - Fix return type

### Nice to Have (Lower Impact)
9. Create `src/tests/e2e/critical-flows.e2e.test.ts` - New E2E tests

---

## Testing Pyramid Metrics

### Current Distribution
- Unit Tests: ~14 files (452 tests)
- Component Tests: 6 files (95 tests)
- Integration Tests: 3 files (16 tests)
- E2E Tests: 0 files (0 tests)

### Recommended Distribution (for 70-20-10 pyramid)
- Unit Tests: 400-450 tests ✓ (current is higher)
- Component Tests: 80-120 tests ✓ (current is good)
- Integration Tests: 30-50 tests (should increase slightly)
- E2E Tests: 10-20 tests (need to create)

**Adjustment:** Consolidate/remove some lower-value unit tests, add critical E2E tests

---

## Verification Checklist

Before claiming success:

- [ ] All 563 tests passing
- [ ] Coverage maintained above 85%
- [ ] No test takes longer than 100ms
- [ ] Full test suite completes in < 30 seconds
- [ ] MockLogseqAPI used in all unit tests
- [ ] No vi.fn() mocks for Logseq API (use MockLogseqAPI instead)
- [ ] Component tests use happy-dom environment
- [ ] Integration tests use realistic page/block structures
- [ ] E2E tests verify critical user journeys
- [ ] All error cases handled gracefully in tests
