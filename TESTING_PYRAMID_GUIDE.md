# BlogSeq Testing Pyramid Guide

## Overview

This guide defines how to categorize and write tests for the BlogSeq project. We follow the **Testing Pyramid** pattern with a **70-20-10 distribution**:

- **70% Unit Tests** - Fast, isolated tests of individual functions/methods
- **20% Component Tests** - UI-focused tests of React components
- **10% Integration Tests** - Tests of how components/functions work together
- **<1% E2E Tests** - Critical user journey tests (minimal)

## Current Status

**Test Distribution (as of analysis):**
- Total Tests: 691
- Unit: 445 (64.4%) - Target: 70%
- Component: 155 (22.4%) - Target: 20%
- Integration: 91 (13.2%) - Target: 10%
- E2E: 0 (0%) - Target: <1%

**Assessment:** Distribution is within acceptable ranges but could be optimized.

---

## Test Categorization Rules

### Unit Tests (70%)

**Location:** `src/tests/unit/`

**Characteristics:**
- Tests ONE function/method in isolation
- Minimal mocking (only external dependencies)
- No DOM rendering
- No React hooks rendering (use `renderHook` sparingly)
- Fast (<50ms per test)
- No network calls
- No file I/O

**When to write:**
- Testing pure functions
- Testing class methods
- Testing utility functions
- Testing business logic
- Testing data transformations
- Testing algorithm correctness

**Example - Good Unit Test:**
```typescript
// src/tests/unit/markdownExporter/referenceResolution.test.ts
describe('MarkdownExporter.resolveReference', () => {
  it('should resolve [[page]] reference to page name', () => {
    const result = exporter.resolvePageReference('[[MyPage]]');
    expect(result).toBe('MyPage');
  });
});
```

**Example - Bad Unit Test (should be component test):**
```typescript
// ❌ This renders React components - should be component test
it('should display export button', () => {
  render(<ExportHeader />);
  expect(screen.getByText('Export')).toBeInTheDocument();
});
```

**Subcategories:**
- `unit/markdownExporter/` - Export logic, parsing, transformations
- `unit/hooks/` - React hook logic (tested via `renderHook`, but no full components)
- `unit/utils/` - Utility functions, helpers
- `unit/settings/` - Settings logic, validation

---

### Component Tests (20%)

**Location:** `src/tests/component/`

**Characteristics:**
- Tests React component rendering and user interactions
- Uses `render()` from `@testing-library/react`
- Tests UI behavior, not implementation
- Tests user events (clicks, typing, etc.)
- Mocks Logseq API via `renderWithLogseq` utility
- Tests accessibility
- Medium speed (50-200ms per test)

**When to write:**
- Testing component rendering
- Testing user interactions (clicks, forms)
- Testing conditional rendering
- Testing props handling
- Testing component state changes
- Testing error boundaries
- Testing accessibility

**Example - Good Component Test:**
```typescript
// src/tests/component/ExportHeader.test.tsx
describe('ExportHeader', () => {
  it('should show loading state during export', async () => {
    render(<ExportHeader isExporting={true} />);
    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });
});
```

**Example - Bad Component Test (should be integration):**
```typescript
// ❌ This tests multiple components working together - should be integration test
it('should export and update preview', async () => {
  render(<App />);
  await userEvent.click(screen.getByText('Export'));
  expect(screen.getByTestId('preview')).toHaveTextContent('# Exported');
  expect(screen.getByText('Export complete')).toBeInTheDocument();
});
```

**Components to test:**
- `component/App.test.tsx` - Main app rendering, layout
- `component/ExportHeader.test.tsx` - Export controls, buttons
- `component/SettingsBar.test.tsx` - Settings checkboxes
- `component/PreviewContent.test.tsx` - Markdown preview rendering
- `component/Toast.test.tsx` - Notification display
- `component/ErrorBoundary.test.tsx` - Error handling UI

---

### Integration Tests (10%)

**Location:** `src/tests/integration/`

**Characteristics:**
- Tests how multiple components/functions work together
- Tests complete workflows/features
- May involve multiple files/modules
- Tests data flow through system
- May test with ZIP creation, file handling
- Slower (200ms-2s per test)
- Tests realistic scenarios

**When to write:**
- Testing complete export workflows
- Testing multi-step user journeys
- Testing data flow from UI → exporter → ZIP
- Testing asset handling end-to-end
- Testing batch operations
- Testing error propagation
- Testing system behavior under load

**Example - Good Integration Test:**
```typescript
// src/tests/integration/export-workflow.integration.test.ts
describe('Export Workflow Integration', () => {
  it('should export page with assets to ZIP', async () => {
    // Setup page with assets
    const page = setupPageWithAssets();

    // Export
    const result = await exporter.exportCurrentPage(settings);

    // Create ZIP
    const zip = await createZip(result, assets);

    // Verify ZIP structure
    expect(zip.file('page.md')).toBeDefined();
    expect(zip.file('assets/image.png')).toBeDefined();
  });
});
```

**Example - Bad Integration Test (too broad, should be E2E):**
```typescript
// ❌ This tests entire app with browser - should be E2E
it('should complete full user workflow', async () => {
  await openLogseq();
  await createPage();
  await addContent();
  await openPlugin();
  await clickExport();
  await verifyDownload();
});
```

**Integration test categories:**
- `integration/export-workflow.integration.test.ts` - Complete export flows
- `integration/asset-handling.integration.test.ts` - Asset detection → ZIP
- `integration/batch-export.integration.test.ts` - Multi-page exports

---

### E2E Tests (<1%)

**Location:** `src/tests/e2e/`

**Characteristics:**
- Tests critical user journeys in browser
- Uses Playwright or similar
- Tests real plugin in Logseq environment
- Very slow (2s-10s per test)
- Only for CRITICAL flows
- Fragile, expensive to maintain

**When to write:**
- ONLY for critical user-facing flows
- Testing plugin installation
- Testing export → download → verify file
- Testing critical failure scenarios
- Smoke testing before release

**Example - Good E2E Test:**
```typescript
// src/tests/e2e/critical-flows.e2e.test.ts
describe('Critical User Flows', () => {
  it('should export page and download ZIP', async () => {
    await page.goto('logseq://graph/test');
    await page.click('[data-testid="blogseq-export"]');
    await page.click('[data-testid="export-button"]');

    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });
});
```

**DO NOT write E2E tests for:**
- Logic that can be unit tested
- UI that can be component tested
- Workflows that can be integration tested
- Edge cases (test these at lower levels)

---

## Test Writing Guidelines

### General Principles

1. **Test behavior, not implementation**
   - ✅ `expect(button).toBeDisabled()`
   - ❌ `expect(component.state.loading).toBe(true)`

2. **Use descriptive test names**
   - ✅ `should resolve ((uuid)) block reference to block content`
   - ❌ `test block refs`

3. **One assertion focus per test**
   - Test one thing well
   - Multiple assertions OK if testing same behavior

4. **Arrange-Act-Assert pattern**
   ```typescript
   it('should do something', () => {
     // Arrange - Setup
     const input = createInput();

     // Act - Execute
     const result = doSomething(input);

     // Assert - Verify
     expect(result).toBe(expected);
   });
   ```

5. **Use fixtures and builders**
   - Create reusable test data
   - Use builder pattern for complex objects
   - Keep tests DRY but readable

### Unit Test Guidelines

1. **Minimize mocking**
   - Only mock external dependencies (Logseq API, file system)
   - Don't mock code under test
   - Prefer real objects when possible

2. **Test edge cases**
   - Null/undefined inputs
   - Empty arrays/strings
   - Boundary values
   - Error conditions

3. **Fast execution**
   - Target <50ms per test
   - No setTimeout/setInterval
   - No async unless necessary

4. **Example structure:**
   ```typescript
   describe('FunctionName', () => {
     describe('happy path', () => {
       it('should handle normal input', () => {});
     });

     describe('edge cases', () => {
       it('should handle null input', () => {});
       it('should handle empty string', () => {});
     });

     describe('error cases', () => {
       it('should throw on invalid input', () => {});
     });
   });
   ```

### Component Test Guidelines

1. **Use Testing Library best practices**
   - Query by role/label (accessibility)
   - Avoid testid unless necessary
   - Use `user-event` for interactions

2. **Test user behavior**
   - What user sees
   - What user can click
   - What happens when they interact

3. **Mock external dependencies**
   - Use `renderWithLogseq` for Logseq API
   - Mock network calls
   - Mock file operations

4. **Example structure:**
   ```typescript
   describe('ComponentName', () => {
     describe('rendering', () => {
       it('should render with props', () => {});
     });

     describe('interactions', () => {
       it('should handle button click', async () => {});
     });

     describe('state management', () => {
       it('should update on prop change', () => {});
     });
   });
   ```

### Integration Test Guidelines

1. **Test realistic scenarios**
   - Use real-world data
   - Test complete workflows
   - Verify end-to-end behavior

2. **Setup and teardown**
   - Create realistic test context
   - Clean up after tests
   - Use fixtures for consistency

3. **Test data flow**
   - Input → Processing → Output
   - Verify each step
   - Test error propagation

4. **Example structure:**
   ```typescript
   describe('Feature Integration', () => {
     beforeEach(() => {
       setupTestContext();
     });

     afterEach(() => {
       cleanupTestContext();
     });

     describe('complete workflow', () => {
       it('should process data end-to-end', async () => {});
     });
   });
   ```

---

## Test Organization Best Practices

### File Structure

```
src/tests/
├── unit/                          # 70% of tests
│   ├── markdownExporter/          # Core export logic
│   │   ├── markdownExporter.test.ts
│   │   ├── blockProcessing.test.ts
│   │   ├── assetDetection.test.ts
│   │   ├── referenceResolution.test.ts
│   │   ├── frontmatterGeneration.test.ts
│   │   └── MarkdownHelpers.test.ts
│   ├── hooks/                     # React hook logic
│   │   ├── useExport.test.ts
│   │   ├── useBatchExport.test.ts
│   │   ├── useAssets.test.ts
│   │   └── useAppVisible.test.ts
│   ├── utils/                     # Utilities
│   │   └── utils.test.ts
│   └── settings/                  # Settings logic
│       └── settings.test.ts
├── component/                     # 20% of tests
│   ├── App.test.tsx
│   ├── ExportHeader.test.tsx
│   ├── SettingsBar.test.tsx
│   ├── PreviewContent.test.tsx
│   ├── Toast.test.tsx
│   └── ErrorBoundary.test.tsx
├── integration/                   # 10% of tests
│   ├── export-workflow.integration.test.ts
│   ├── asset-handling.integration.test.ts
│   └── batch-export.integration.test.ts
└── e2e/                          # <1% of tests
    └── critical-flows.e2e.test.ts
```

### Naming Conventions

1. **Unit tests:** `[module].test.ts` or `[functionality].test.ts`
   - `markdownExporter.test.ts`
   - `referenceResolution.test.ts`
   - `useExport.test.ts`

2. **Component tests:** `[ComponentName].test.tsx`
   - `ExportHeader.test.tsx`
   - `SettingsBar.test.tsx`

3. **Integration tests:** `[feature].integration.test.ts`
   - `export-workflow.integration.test.ts`
   - `asset-handling.integration.test.ts`

4. **E2E tests:** `[flow].e2e.test.ts`
   - `critical-flows.e2e.test.ts`

### Test Suite Organization

```typescript
describe('Module/Component Name', () => {
  // Setup
  beforeEach(() => {});
  afterEach(() => {});

  // Group related tests
  describe('feature/behavior category', () => {
    describe('subcategory (optional)', () => {
      it('should do specific thing', () => {});
    });
  });
});
```

---

## Common Pitfalls

### 1. Testing Implementation Details
❌ **Bad:**
```typescript
it('should set loading state', () => {
  const { result } = renderHook(() => useExport());
  expect(result.current._internalLoadingState).toBe(true);
});
```

✅ **Good:**
```typescript
it('should disable button while loading', () => {
  render(<ExportHeader isExporting={true} />);
  expect(screen.getByRole('button')).toBeDisabled();
});
```

### 2. Tests Too Broad
❌ **Bad:** (Component test testing integration)
```typescript
it('should export and show toast', async () => {
  render(<App />);
  await userEvent.click(screen.getByText('Export'));
  expect(screen.getByText('Success!')).toBeInTheDocument();
});
```

✅ **Good:** (Separate into component + integration)
```typescript
// Component test
it('should show toast when onSuccess called', () => {
  render(<Toast message="Success!" />);
  expect(screen.getByText('Success!')).toBeInTheDocument();
});

// Integration test
it('should trigger success toast after export', async () => {
  const { exportPage, onSuccess } = setupExport();
  await exportPage();
  expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('Success'));
});
```

### 3. Tests Too Narrow
❌ **Bad:** (Testing mock, not behavior)
```typescript
it('should call getPage', () => {
  const mock = vi.fn();
  logseq.Editor.getPage = mock;
  exporter.export();
  expect(mock).toHaveBeenCalled();
});
```

✅ **Good:** (Testing actual behavior)
```typescript
it('should resolve page reference', async () => {
  logseq.Editor.getPage = vi.fn().mockResolvedValue({ name: 'MyPage' });
  const result = await exporter.resolveReference('[[MyPage]]');
  expect(result).toBe('MyPage');
});
```

### 4. Flaky Tests
❌ **Bad:**
```typescript
it('should update eventually', async () => {
  render(<Component />);
  await sleep(1000);  // ❌ Race condition
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

✅ **Good:**
```typescript
it('should update when ready', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

---

## Test Review Checklist

When reviewing tests, verify:

- [ ] Test is in correct category (unit/component/integration/e2e)
- [ ] Test name clearly describes behavior
- [ ] Test follows Arrange-Act-Assert pattern
- [ ] Test uses appropriate mocking level
- [ ] Test is not flaky (no race conditions)
- [ ] Test is fast for its category
- [ ] Test is readable and maintainable
- [ ] Test covers meaningful behavior
- [ ] Test doesn't test implementation details
- [ ] Test has proper setup/teardown

---

## Coverage Targets

**Overall:** 85% coverage (enforced by vitest.config.ts)

**By Category:**
- Unit: >90% coverage (core logic)
- Component: >80% coverage (UI rendering)
- Integration: >70% coverage (workflows)
- E2E: N/A (not measured by coverage)

**Run coverage:**
```bash
npm test -- --coverage
```

---

## Migration Guide

### Moving Component Test to Unit Test

If a component test doesn't actually render components:

**Before:**
```typescript
// src/tests/component/helpers.test.tsx
it('should format date', () => {
  const result = formatDate('2024-01-01');
  expect(result).toBe('Jan 1, 2024');
});
```

**After:**
```typescript
// src/tests/unit/utils/dateUtils.test.ts
it('should format date', () => {
  const result = formatDate('2024-01-01');
  expect(result).toBe('Jan 1, 2024');
});
```

### Moving Unit Test to Component Test

If a unit test renders components:

**Before:**
```typescript
// src/tests/unit/hooks/useExport.test.ts
it('should render export button', () => {
  render(<ExportButton />);  // ❌ Rendering component
  expect(screen.getByText('Export')).toBeInTheDocument();
});
```

**After:**
```typescript
// src/tests/component/ExportButton.test.tsx
it('should render export button', () => {
  render(<ExportButton />);
  expect(screen.getByText('Export')).toBeInTheDocument();
});
```

---

## References

- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Vitest Documentation](https://vitest.dev)
- [Test Pyramid by Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)
- Project's `TESTING.md` for test infrastructure details

---

**Last Updated:** 2024-10-23
**Status:** Active Guide
