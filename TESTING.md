# BlogSeq Plugin - Comprehensive Testing Plan

## Overview

This document outlines the complete testing infrastructure for the BlogSeq Logseq plugin, following the test pyramid approach with unit tests as the foundation, component tests in the middle, and integration tests at the top.

## Test Pyramid Structure

```
          Integration Tests (10%)
             /              \
        API Tests      E2E Workflows
          /                  \
    Component Tests (20%)
      /    |    |    |    \
  Toast ErrorBoundary Export Header etc.
      \    |    |    |    /
    Unit Tests (70%)
    /    |    |    \
Hooks Exporters Utils Services
```

## Test Infrastructure

### 1. Testing Framework

- **Framework**: Vitest 3.2.4
- **DOM Environment**: happy-dom
- **Component Testing**: @testing-library/react
- **Mocking**: vitest mock utilities
- **Coverage Tool**: V8 provider with Codecov integration

### 2. Test Files Structure

```
src/tests/
├── setup.ts                              # Global test setup and mocks
├── mocks/
│   └── logseq.ts                        # Logseq SDK mock interfaces
├── test-utils.ts                        # Test helper functions (existing)
├── component-utils.tsx                  # React component test utilities (NEW)
├── integration-setup.ts                 # Integration test context builder (NEW)
│
├── Unit Tests (70% of tests)
│   ├── markdownExporter.test.ts          # 50 tests (existing)
│   ├── markdownExporter.asset.test.ts    # 2 tests (existing)
│   ├── markdownExporter.realworld.test.ts # 2 tests (existing)
│   ├── useExport.test.ts                 # Hook tests (NEW)
│   ├── useBatchExport.test.ts           # Batch export hook tests (NEW)
│   ├── useAssets.test.ts                # Asset management hook tests (NEW)
│   └── utils.test.ts                    # Utility function tests (PLANNED)
│
├── Component Tests (20% of tests)
│   ├── Toast.test.tsx                   # Toast notifications (NEW)
│   ├── ErrorBoundary.test.tsx           # Error boundary (NEW)
│   ├── ExportHeader.test.tsx            # Export button (PLANNED)
│   ├── SettingsBar.test.tsx             # Settings UI (PLANNED)
│   ├── PreviewContent.test.tsx          # Markdown preview (PLANNED)
│   └── App.test.tsx                     # Main app integration (PLANNED)
│
└── Integration Tests (10% of tests)
    ├── export-workflow.integration.test.ts  # End-to-end export (NEW)
    ├── batch-export.integration.test.ts     # Multi-page export (PLANNED)
    └── asset-handling.integration.test.ts   # Asset resolution (PLANNED)
```

## Test Coverage Requirements

### Coverage Thresholds (vitest.config.ts)

```yaml
Global Thresholds:
  Statements:    80%
  Branches:      75%  # Slightly lower due to error handling complexity
  Functions:     80%
  Lines:         80%

Per-File Settings:
  perFile:       true        # Enforce per-file coverage
  all:           true        # Include uncovered files
  reportOnFailure: true      # Show failures if below threshold
```

### Coverage Reports

Generated reports include:
- **Text**: Console output
- **Text Summary**: Quick overview
- **HTML**: Interactive coverage viewer
- **LCOV**: Integration with Codecov
- **JSON**: Machine-readable format

View HTML report: `coverage/index.html`

## GitHub Actions CI/CD Pipelines

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push to `master` and `new` branches, and on pull requests.

**Jobs (parallel where possible):**

```
┌─────────────────┐
│  Lint & Types   │  (eslint + TypeScript)
└────────┬────────┘
         │
    ┌────▼────────────────┐
    │  Tests & Coverage   │  (vitest + codecov)
    └────┬────────────────┘
         │
    ┌────▼────────────┐
    │  Build Plugin   │
    └─────────────────┘
```

**Steps:**
1. Checkout code
2. Setup Node.js 20 + pnpm 8
3. Install dependencies
4. Type checking: `pnpm typecheck`
5. Linting: `npx eslint src --max-warnings 0`
6. Run tests: `pnpm test --run`
7. Coverage check: Verify 80%+ thresholds
8. Build: `pnpm build`

### 2. Release Workflow (`.github/workflows/main.yml`)

Runs on push to `master` branch when CI passes.

**Jobs (sequential):**

```
Test Suite
    ↓
Build Plugin
    ↓
Semantic Release
```

**Features:**
- Test and build must pass before release
- Semantic versioning with conventional commits
- Automatic changelog generation
- GitHub tag and release creation
- NPM publishing

### 3. Running Tests Locally

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test

# Run with UI dashboard
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Type check
pnpm typecheck

# Lint
npx eslint src

# Full pre-commit checks
pnpm typecheck && npx eslint src && pnpm test --run
```

## Test Utilities

### Component Test Utilities (`component-utils.tsx`)

Provides React Testing Library helpers optimized for this project:

```typescript
// Render with providers (ToastProvider, ErrorBoundary)
renderWithProviders(<MyComponent />)

// Create mock Logseq context
const mockContext = createMockLogseqContext()
setupLogseqMock()

// Common test fixtures
componentFixtures.simpleBlock
componentFixtures.blockWithProperties
componentFixtures.nestedBlocks

// Create test pages
const page = createMockPageForComponent({ name: 'Test' })
```

### Integration Test Setup (`integration-setup.ts`)

Complete Logseq environment simulation:

```typescript
// Create test context with full API mocks
const context = createIntegrationTestContext()

// Add pages and blocks dynamically
const page = addPageToContext(context, 'Page Name')
addBlocksToPage(context, pageUuid, ['Block 1', 'Block 2'])
addNestedBlocksToPage(context, pageUuid, [{
  content: 'Parent',
  children: ['Child 1', 'Child 2']
}])

// Use pre-built fixtures
const context = setupIntegrationTest('simplePage')
const context = setupIntegrationTest('multiPageGraph')

// Mock file system
const fs = createMockFileSystem()
fs.writeFile('/path/to/file.md', content)
```

### Global Mocks (setup.ts)

```typescript
// Logseq API mocks
global.logseq = {
  Editor: { getCurrentPage, getPage, getBlock, getPageBlocksTree },
  App: { getCurrentGraph },
  DB: { datascriptQuery },
  UI: { showMsg }
}

// Browser APIs
global.fetch = vi.fn()
navigator.clipboard.writeText = vi.fn()
```

## Test Suites

### Unit Tests (70%)

#### MarkdownExporter Tests (54 tests)
- Core export functionality
- Block reference resolution
- Asset detection
- Frontmatter generation
- ZIP file creation
- Error handling

**Files:**
- `markdownExporter.test.ts` - 50 tests
- `markdownExporter.asset.test.ts` - 2 tests
- `markdownExporter.realworld.test.ts` - 2 tests

#### Hook Tests (NEW)

**useExport.test.ts** (~25 tests)
- Export state management
- Preview generation
- Asset population
- Settings dependency
- Error handling
- Callback memoization

**useBatchExport.test.ts** (~30 tests)
- Batch export flow
- Progress tracking
- ZIP generation
- Block conversion
- Error handling per page
- Memory management

**useAssets.test.ts** (~25 tests)
- Asset downloading
- Clipboard operations
- Image MIME type handling
- Path copying
- XHR status handling
- Fallback mechanisms

### Component Tests (20%)

#### Toast Component Tests (`Toast.test.tsx`) (~30 tests)
- Notification display (success, error, warning, info)
- Auto-dismiss functionality
- Manual dismissal
- Styling per type
- Multiple toasts management
- Accessibility features

#### ErrorBoundary Component Tests (`ErrorBoundary.test.tsx`) (~30 tests)
- Normal child rendering
- Error catching
- Error state management
- Error callbacks
- Nested boundaries
- Accessibility
- TypeScript types

#### Planned Component Tests
- **ExportHeader**: Button interactions, icon rendering, accessibility
- **SettingsBar**: Checkbox toggles, setting changes, validation
- **PreviewContent**: Markdown rendering, syntax highlighting
- **App**: Integration with providers, state management

### Integration Tests (10%)

#### Export Workflow Tests (`export-workflow.integration.test.ts`) (~50 tests)
- Simple page export
- Page with headings
- Cross-page references
- Asset detection and inclusion
- Multi-page batch export
- Nested block structures
- Export settings validation
- Error scenarios
- ZIP file generation
- File system operations
- Performance with moderate-sized exports

## Best Practices

### 1. Test Organization

```typescript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup mocks and state
  })

  afterEach(() => {
    // Cleanup and verification
  })

  describe('Feature Group', () => {
    it('should specific behavior', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### 2. Mocking Strategy

**Mock at module boundaries:**
```typescript
vi.mock('file-saver')
vi.mock('jszip')
```

**Mock Logseq API selectively:**
```typescript
// Mock only what you need
logseq.Editor.getPage = vi.fn().mockResolvedValue(mockPage)
```

**Avoid over-mocking:**
```typescript
// Good: Test real behavior
// Bad: Mock everything
```

### 3. Test Fixtures

Use pre-built fixtures from `componentFixtures` and `integrationFixtures`:
```typescript
// Consistent, reusable test data
const block = componentFixtures.nestedBlocks
const context = setupIntegrationTest('pageWithHeadings')
```

### 4. Async Testing

```typescript
// Use act() for state updates
await act(async () => {
  await result.current.handleExport()
})

// Use waitFor for async assertions
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

### 5. Coverage

- Aim for >80% coverage
- Focus on critical paths first
- Mark untestable code with `/* v8 ignore */`
- Use coverage reports to identify gaps

## Continuous Integration

### GitHub Actions Status Badges

Add to README.md:
```markdown
[![CI Status](https://github.com/briansunter/blogseq/workflows/CI/badge.svg)](https://github.com/briansunter/blogseq/actions)
[![Release Status](https://github.com/briansunter/blogseq/workflows/Release/badge.svg)](https://github.com/briansunter/blogseq/actions)
```

### Codecov Integration

- Automatic coverage uploads from CI
- Pull request coverage comments
- Coverage trend tracking

View coverage: https://codecov.io/gh/briansunter/blogseq

## Debugging Tests

### Run Single Test File
```bash
pnpm test -- Toast.test.tsx
```

### Run Tests Matching Pattern
```bash
pnpm test -- --grep "should export"
```

### Debug Mode
```bash
# Run in debug mode
node --inspect-brk ./node_modules/vitest/vitest.mjs --run
```

### View Test UI
```bash
pnpm test:ui  # Opens http://localhost:51204
```

## Future Enhancements

### Phase 3: Advanced Testing
- [ ] E2E tests with Playwright
- [ ] Performance benchmarks
- [ ] Visual regression testing
- [ ] Snapshot testing for markdown output
- [ ] Pre-commit hooks with husky

### Phase 4: Advanced Coverage
- [ ] Coverage trend tracking
- [ ] Coverage comments on PRs
- [ ] Coverage badges
- [ ] Mutation testing

## Scripts in package.json

```json
{
  "scripts": {
    "test": "vitest",                     // Watch mode
    "test:ui": "vitest --ui",             // Dashboard
    "test:coverage": "vitest run --coverage",  // With coverage
    "typecheck": "tsc --noEmit",          // TypeScript
  }
}
```

## Troubleshooting

### Tests fail with "logseq is not defined"
- Ensure `src/tests/setup.ts` is running
- Check vitest.config.ts `setupFiles` setting

### Coverage below threshold
- Run `pnpm test:coverage` to see detailed report
- Add tests to uncovered files
- Check HTML report for specific lines

### Tests timeout
- Increase timeout in vitest.config.ts
- Check for unresolved promises
- Verify mocks are working

### Snapshot test failures
- Review changes in git diff
- Update snapshot with `u` key in watch mode
- Use `--update` flag: `pnpm test -- --update`

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [JavaScript Mock Functions](https://vitest.dev/api/vi.html)
