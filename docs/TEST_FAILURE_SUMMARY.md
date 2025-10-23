# BlogSeq Test Failure Summary - Quick Reference

**Total Tests:** 563 | **Passing:** 453 (81%) | **Failing:** 110 (19%)

---

## Failing Tests by File

| File | Total | Pass | Fail | Status | Priority |
|------|-------|------|------|--------|----------|
| referenceResolution.test.ts | 27 | 16 | 11 | Critical | P1 |
| assetDetection.test.ts | 28 | 6 | 22 | Critical | P1 |
| blockProcessing.test.ts | 30 | 26 | 4 | Moderate | P2 |
| frontmatterGeneration.test.ts | 31 | 25 | 6 | Moderate | P2 |
| useAppVisible.test.ts | 20 | 19 | 1 | Minor | P3 |
| useBatchExport.test.ts | ? | ? | 2 | Minor | P3 |
| **All Component Tests** | 95 | 95 | 0 | ✓ Pass | - |
| **All Integration Tests** | 16 | 16 | 0 | ✓ Pass | - |

---

## Root Causes: By Category

### Mock System Problems (Blocking 50+ tests)

**Issue:** Old vi.fn()-based mocks vs new MockLogseqAPI class

**Broken Patterns:**
- Manual `mockImplementation()` for each UUID
- No state persistence between calls
- DataScript query patterns not matched
- No automatic error wrapping

**Fix:** Consolidate test-utils.ts with MockLogseqAPI

---

### Reference Resolution Issues (11 tests)

| Test | Expected | Got | Fix |
|------|----------|-----|-----|
| Block refs `((uuid))` | Resolved content | Original UUID | Wire getBlock mock |
| Caching | Call count > 0 | Call count = 0 | Track queries |
| Error handling | `[Unresolved:]` | Exception thrown | Add try/catch |
| Mixed refs | Both resolved | Only UUIDs | Fix sequence |

---

### Asset Detection Issues (22 tests)

| Test | Expected | Got | Fix |
|------|----------|-----|-----|
| DataScript detection | Asset in map | Not found | Parse query results |
| Image links | `![Title](assets/uuid.png)` | Just UUID | Implement format |
| Title from properties | Title from :block/title | UUID | Extract entity property |
| Custom assetPath | `media/uuid.png` | Wrong path | Apply option |
| Tracking | Asset in map | Empty map | Wire tracking |

---

### Block Processing Issues (4 tests)

| Test | Expected | Got | Fix |
|------|----------|-----|-----|
| Null block | No error | NPE on .uuid | Add null check |
| Flatten=false | `- Child 1` indent | Paragraphs | Implement list gen |
| Deep nesting | Indented list | Flat | Fix indentation |
| preserveBlockRefs | Resolved text | `((uuid))` | Respect option |

---

### Frontmatter Issues (6 tests)

| Test | Expected | Got | Fix |
|------|----------|-----|-----|
| Empty props | Empty string | Fallback message | Don't add message |
| Empty tags | No tags: line | `tags:\n` | Filter empty arrays |
| UUID in props | `assets/uuid.png` | Malformed | Fix resolution |
| Boolean values | `draft: false` | Missing | Add serialization |
| Custom path | `media/uuid` | Wrong | Apply assetPath |
| Empty string | Blank value line | Wrong format | Fix YAML |

---

## Files Requiring Changes

### Must Fix (Blocking)

```
src/tests/test-utils.ts
  - Use MockLogseqAPI internally
  - Keep backward-compatible exports
  
src/tests/unit/markdownExporter/referenceResolution.test.ts
  - Migrate all mocks to MockLogseqAPI
  - Use BlockBuilder for test data
  
src/tests/unit/markdownExporter/assetDetection.test.ts
  - Migrate all mocks to MockLogseqAPI
  - Use PageBuilder/BlockBuilder
  - Configure DataScript patterns
  
src/tests/unit/markdownExporter/frontmatterGeneration.test.ts
  - Migrate all mocks to MockLogseqAPI
  - Use builders for test data
  
src/markdownExporter.ts
  - Add null checks in processBlock()
  - Fix indentation logic for flattenNested=false
  - Implement asset link generation
  - Fix reference resolution caching
  - Fix frontmatter edge cases
```

### Should Fix (High Impact)

```
src/tests/unit/markdownExporter/blockProcessing.test.ts
  - Add null check test coverage
  - Fix nested block handling
  
src/tests/unit/hooks/useAppVisible.test.ts
  - Fix hook initialization
  - Verify boolean return type
  
src/tests/unit/hooks/useBatchExport.test.ts
  - Fix null hook initialization
```

### Nice to Have

```
src/tests/e2e/critical-flows.e2e.test.ts
  - Create new file
  - Test critical user journeys
```

---

## Test Failure Patterns

### Pattern 1: Mock Not Wired (30% of failures)
```typescript
// Test expects:
expect(result).toContain('Referenced content');

// But mock returns:
Promise.resolve(null)

// Solution: Add to beforeEach
mockAPI.addBlock(refBlock);
```

### Pattern 2: DataScript Query Mismatch (25% of failures)
```typescript
// Test sets up query mock:
mockAPI.DB.datascriptQuery.mockImplementation(...)

// But real code calls different query
// Or expects different result format

// Solution: Use MockLogseqAPI's pattern matching
mockAPI.addQueryPattern(pattern, handler);
```

### Pattern 3: Missing Implementation (20% of failures)
```typescript
// Test expects:
expect(markdown).toContain('![Image](assets/uuid.png)');

// But implementation just returns:
'uuid'

// Solution: Implement createAssetLink() properly
```

### Pattern 4: Error Not Handled (15% of failures)
```typescript
// Test sets up error mock:
mockAPI.Editor.getPage.mockRejectedValue(error);

// But test expects graceful handling:
expect(result).toContain('[Unresolved:');

// Solution: Add try/catch in implementation
try {
  page = await logseq.Editor.getPage(uuid);
} catch {
  // gracefully handle
}
```

### Pattern 5: Edge Case Not Handled (10% of failures)
```typescript
// Test passes:
null block, empty arrays, special chars

// But implementation doesn't handle:
if (!block) return '';  // Missing check

// Solution: Add defensive checks
```

---

## Quick Fix Checklist

Priority 1 (Do First - ~30% fixes):
- [ ] Consolidate test-utils.ts with MockLogseqAPI
- [ ] Update referenceResolution.test.ts imports
- [ ] Update assetDetection.test.ts imports
- [ ] Update frontmatterGeneration.test.ts imports

Priority 2 (Fix Logic - ~60% more fixes):
- [ ] Add null check to processBlock()
- [ ] Implement createAssetLink() markdown format
- [ ] Fix asset detection DataScript parsing
- [ ] Add error handling try/catch
- [ ] Implement nested block indentation

Priority 3 (Polish - ~10% remaining):
- [ ] Filter empty arrays/strings from frontmatter
- [ ] Add boolean YAML serialization
- [ ] Apply custom assetPath to properties
- [ ] Fix hook initialization
- [ ] Create E2E tests

---

## Test Failure Breakdown

```
110 total failures:
  - 50 from old mock system (Priority 1)
  - 35 from missing logic (Priority 2)
  - 15 from edge cases (Priority 3)
  - 10 from hooks/setup (Priority 3)
```

---

## Success Metrics

**Before:** 453/563 passing (81%)
**After P1:** 490/563 passing (87%)
**After P2:** 545/563 passing (97%)
**After P3:** 563/563 passing (100%)

**Timeline:** 2-3 days for experienced developer
