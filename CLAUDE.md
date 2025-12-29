# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlogSeq is a Logseq plugin that exports pages to clean Markdown format with support for assets, frontmatter, and various export options. Built with React, TypeScript, Vite, and TailwindCSS.

## Requirements

**Logseq DB Graph Version**: This plugin requires Logseq's DB graph version (2025+) and does not support legacy file graphs. Key differences:
- Properties are at root level with colon prefixes (e.g., `:logseq.property/heading`)
- Uses `:block/title` instead of `:block/content`
- Uses `:logseq.property/status` instead of `:block/marker`
- Tags are unified as classes with inheritance
- All blocks and pages are nodes referenced with `[[]]` syntax

The plugin is optimized for DB version APIs and patterns. See the "Critical Architecture Details" section below for specific implementation patterns.

## Development Commands

```bash
# Install dependencies (using pnpm - required)
pnpm install

# Development mode with HMR
pnpm dev

# Build the plugin for production (includes typecheck)
pnpm build

# Type checking only
pnpm typecheck
# or
tsc --noEmit

# Linting
pnpm lint              # Check for issues
pnpm lint:fix          # Auto-fix issues

# Testing
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:ui           # Interactive test dashboard
pnpm test:coverage     # Generate coverage report

# Run specific test suites
pnpm test:unit         # Unit tests only
pnpm test:component    # Component tests only
pnpm test:integration  # Integration tests only

# Full check before committing
pnpm check:all         # typecheck + lint + format:check + test
pnpm fix-all           # lint:fix + format + test

# Storybook
pnpm storybook         # Start Storybook dev server
pnpm build-storybook   # Build Storybook static site
```

## Important: Package Manager

This project **requires pnpm** (enforced by `preinstall` script). Using npm or yarn will fail.

## Architecture

### Core Components

**Plugin Entry (`src/main.tsx`)**

- Registers toolbar UI items and slash commands
- Creates the Logseq plugin model with `show()` and `exportPage()` methods
- Mounts the React app and manages UI visibility
- Plugin ID: `_briansunter-blogseq`
- Provides both toolbar icons: open main UI and quick export
- Registers page menu item and slash command for `/Export page to markdown`

**React Application (`src/App.tsx`)**

- Main UI component with ultra-compact design
- Three-row header layout: title/export button, settings checkboxes, preview controls
- Handles export settings state and preview generation
- Top spacer (32px) prevents macOS window button overlap
- Auto-exports on UI open (with guard to prevent duplicate exports)
- Uses custom hooks for separation of concerns:
  - `useExport()` - export logic and state management
  - `useAssets()` - asset downloading and clipboard operations
  - `useAppVisible()` - syncs visibility with Logseq UI state

**Markdown Exporter (`src/markdownExporter.ts`)**

- Core export logic as a singleton class (`exporter` instance)
- Designed for testability with dependency injection for Logseq API, file API, and DOM helpers
- Key features:
  - Resolves block references `((uuid))` and page references `[[page]]`
  - Handles `logseq.property/heading` to convert blocks to markdown headers (# through ######)
  - Detects and includes referenced assets with UUID-based resolution
  - Generates YAML frontmatter from page properties
  - Supports ZIP export with assets folder
  - Tracks and filters property value blocks to avoid duplicate content

**Custom Hooks (`src/hooks/`)**

- `useExport.ts` - Main export orchestration, manages preview generation and asset tracking
- `useAssets.ts` - Asset download and clipboard operations
- `useBatchExport.ts` - Multi-page export functionality (available for future UI)

**Settings (`src/settings.ts`)**

- Logseq settings schema definition
- Settings persistence and retrieval
- Type-safe export settings with defaults

### Export Options

The exporter supports these configurable options (defined in `src/settings.ts`):

- `includePageName`: Add page name as H1 header (default: false)
- `flattenNested`: Flatten nested blocks into paragraphs (default: true)
- `preserveBlockRefs`: Resolve ((uuid)) references (default: true)
- `removeLogseqSyntax`: Clean Logseq-specific markup (default: true)
- `includeTags`: Include #tags in export (default: true - NOTE: this field is in ExportOptions type but not in settings schema)
- `includeProperties`: Generate YAML frontmatter (default: true)
- `resolvePlainUuids`: Convert plain UUID text to references (default: true)
- `assetPath`: Custom asset folder path (default: "assets/")
- `debug`: Enable debug logging (default: false)

**IMPORTANT:** There's a discrepancy - `includeTags` is in the `ExportOptions` type but NOT in the settings schema. When working with export options, be aware that this option exists in code but isn't user-configurable through settings.

### Test Structure

The project follows the testing pyramid with comprehensive test coverage (80%+ threshold):

```
src/tests/
├── setup.ts                    # Global test setup, mocks Logseq API
├── mocks/
│   └── logseq.ts              # Logseq SDK mock interfaces
├── unit/                       # Unit tests (70%)
│   ├── markdownExporter/      # Core export logic tests
│   ├── hooks/                 # Custom hook tests
│   ├── settings/              # Settings tests
│   └── utils/                 # Utility tests
├── component/                  # Component tests (20%)
│   └── ErrorBoundary.test.tsx
└── integration/                # Integration tests (10%)
    ├── export-workflow.integration.test.ts
    ├── asset-handling.integration.test.ts
    ├── zip-*.test.ts           # ZIP export tests
    └── batch-export.integration.test.ts
```

**Testing Framework:**
- Vitest with happy-dom for DOM environment
- React Testing Library for component tests
- Coverage thresholds: 85% for all metrics (statements, branches, functions, lines)
- Mock setup in `src/tests/setup.ts` with full Logseq API mocks

**Key Testing Patterns:**
- Use `src/tests/setup.ts` for global Logseq mocks
- Mock at module boundaries (file-saver, jszip)
- Prefer integration test fixtures over extensive unit mocking
- Test async operations with proper cleanup
- Use `describe`/`it` structure with clear test names

### UI Design Principles

- Ultra-compact layout with minimal padding
- Fixed window size: `w-[98vw] h-[98vh]`
- Top spacer bar (32px) prevents macOS traffic light button overlap
- Content max-width: `max-w-3xl` (768px) for optimal readability
- Native browser checkboxes for minimal height in settings
- Components include ErrorBoundary for error isolation
- Toast notifications for user feedback

### Build and Configuration

**Build System:**
- Vite for fast HMR and optimized production builds
- `vite-plugin-logseq` for Logseq plugin development (skipped in Storybook mode)
- TypeScript strict mode enabled
- TailwindCSS for styling
- Storybook for component development (use `STORYBOOK=true` environment variable)

**Environment Variables:**
- `STORYBOOK=true` - Disables vite-plugin-logseq for Storybook compatibility

**Git Hooks:**
- Husky configured for pre-commit hooks
- lint-staged runs eslint and prettier on staged files
- Automatic formatting on commit

### Continuous Integration

**GitHub Actions Workflows:**

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Runs on push to `master`/`new` branches and on PRs
   - Jobs: Typecheck → Lint → Tests → Build
   - Parallel execution where possible
   - Must pass before merging

2. **Release Pipeline** (`.github/workflows/main.yml`)
   - Runs on push to `master` after CI passes
   - Semantic release with conventional commits
   - Automatic changelog generation
   - GitHub releases and NPM publishing

**Pre-commit Checks:**
- `pnpm check:all` - Runs all checks before committing
- `pnpm fix-all` - Auto-fixes linting and formatting issues

## Loading the Plugin

1. Build with `pnpm build`
2. Enable Developer Mode in Logseq
3. Go to Plugins → Load unpacked plugin
4. Select the project root directory (not `/dist`)
5. Plugin appears in toolbar with export icon

## Key Implementation Notes

- Block heading levels are determined by `logseq.property/heading` property (1-6)
- UUID resolution attempts multiple lookups: DataScript query → Page → Block
- Assets use `file://` protocol for local file access in preview
- Preview uses ReactMarkdown with custom component overrides for styling
- Export triggers auto-preview on UI open for immediate feedback
- **Dependency Injection Pattern:** `MarkdownExporter` accepts injected Logseq API, file API, and DOM helpers for testing

## Critical Architecture Details

### DataScript Query Pattern for Entity Resolution

The codebase has migrated from complex DataScript queries to simpler Logseq Editor API calls:

**Old Pattern (complex DataScript queries):**
```typescript
// ❌ AVOID - Complex query with :db/id
const query = `[:find ?uuid :where [?e :db/id 45204] [?e :block/uuid ?uuid]]`;
```

**New Pattern (simple API calls):**
```typescript
// ✅ PREFER - Use Logseq API directly
const block = await logseq.Editor.getBlock(45204);
const page = await logseq.Editor.getPage(45204);
const uuid = block?.uuid;
```

**When to use DataScript:**
- Asset type detection: `logseq.property.asset/type` has no API equivalent
- Property name mappings: Querying db/ident for user properties
- Complex entity filtering across multiple attributes

### Logseq Page Property Structure

**IMPORTANT**: When accessing page properties via `logseq.Editor.getPage()`, the JavaScript API returns properties **at the root level** with colon-prefixed keys, NOT nested under a `.properties` object.

```typescript
// ❌ WRONG - properties field does not exist
const props = page.properties;

// ✅ CORRECT - properties are root-level keys starting with colons
const propertyKeys = Object.keys(page).filter(
  key => key.startsWith(':user.property/') || key.startsWith(':logseq.property/') || key === 'tags'
);
```

**Property Value Format:**

- Property values are often stored as **numeric db/ids** (e.g., `45204`)
- These must be resolved to actual content or UUIDs using DataScript queries
- Use direct entity ID syntax: `[:find ?uuid :where [45204 :block/uuid ?uuid]]`
- NOT `:db/id` attribute syntax: `[?e :db/id 45204]` ❌ (causes parse errors)

**Example Page Structure:**

```typescript
{
  updatedAt: 1761556235265,
  createdAt: 1738211909658,
  ':logseq.property/status': 73,  // db/id reference
  'tags': [135, 138, 27350],      // array of db/ids
  ':user.property/blogTags-Mx0ii3sb': [45204, 45205, 47532],
  ':user.property/publishDate-kRxfHtUv': 819,
  ':user.property/bogtitle-FiJnwhpb': 45116,
  'name': 'central pacific update',
  'uuid': '679b0245-582a-4ff3-b13d-81bd8db0dfcb',
  // ... other fields
}
```

**Property Value Blocks:**

- Logseq creates hidden blocks to store property values (tags, dates, custom values)
- These blocks appear in `getPageBlocksTree()` results at the end
- Must be filtered out by:
  1. Collecting all property db/ids from the page
  2. Resolving db/ids to block UUIDs using `logseq.Editor.getBlock(dbId)`
  3. Skipping blocks matching those UUIDs during export

**Implementation:** See `collectPropertyValueUUIDs()` and export block filtering in `markdownExporter.ts:257-264`

### Asset Detection and Resolution

Assets are identified through multiple strategies:

1. **DataScript Query (primary):**
   ```typescript
   [:find ?type (pull ?e [*])
    :where [?e :block/uuid #uuid "${uuid}"]
           [?e :logseq.property.asset/type ?type]]
   ```

2. **Page Property Fallback:**
   - Check if UUID is a page with asset properties
   - Use `findAssetType()` helper

3. **Asset by Title Lookup:**
   - Query for blocks with matching `:block/title` and asset type
   - Used when property values reference assets by title instead of UUID

4. **Asset Tracking:**
   - All discovered assets stored in `referencedAssets` Map
   - ZIP export fetches assets via `file://` protocol
   - Paths converted to relative paths in markdown output

**Key Methods:**
- `detectAsset(uuid)` - Determines if a UUID is an asset
- `trackAssets(content)` - Extracts asset references from markdown
- `createAssetLink()` - Creates markdown links and tracks assets
- `downloadAsZip()` - Bundles assets into ZIP file

## Development Best Practices

### When Working with Logseq APIs

1. **Prefer Editor API over DataScript:**
   - Use `logseq.Editor.getPage()` and `logseq.Editor.getBlock()` for simple lookups
   - Reserve DataScript for complex queries involving asset types or property namespaces

2. **Handle Property Values Carefully:**
   - Property values are often numeric db/ids, not actual content
   - Always resolve db/ids using Editor API, not DataScript `:db/id` queries
   - Filter out property value blocks to avoid duplicates in export

3. **Error Handling:**
   - DataScript queries may fail on invalid UUIDs - wrap in try/catch
   - Editor API calls may return null - check for existence
   - Use intentional error swallowing for optional lookups (see `markdownExporter.ts:419-420`)

### Testing Guidelines

1. **Mock at Boundaries:**
   ```typescript
   // Good: Mock external dependencies
   vi.mock('file-saver');
   vi.mock('jszip');

   // Bad: Mock implementation details
   // Don't mock internal functions of markdownExporter
   ```

2. **Use Test Fixtures:**
   - Reusable mock data in test files
   - Consistent block/page structures across tests
   - Avoid creating new mocks for every test

3. **Async Testing:**
   ```typescript
   // Always await async operations
   await act(async () => {
     await result.current.handleExport();
   });

   // Use waitFor for UI updates
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument();
   });
   ```

4. **Coverage Requirements:**
   - Maintain 85%+ coverage across all metrics
   - Run `pnpm test:coverage` before PRs
   - Check HTML report at `coverage/index.html` for gaps

### Common Pitfalls

1. **Property Access:**
   ```typescript
   // ❌ WRONG - properties object doesn't exist
   const props = page.properties;

   // ✅ CORRECT - properties are at root level
   const keys = Object.keys(page).filter(k => k.startsWith(':'));
   ```

2. **DataScript db/id Queries:**
   ```typescript
   // ❌ WRONG - :db/id attribute syntax causes parse errors
   [:find ?uuid :where [?e :db/id 45204]]

   // ✅ CORRECT - Direct entity ID syntax
   [:find ?uuid :where [45204 :block/uuid ?uuid]]

   // ✅ BETTER - Use Editor API instead
   const block = await logseq.Editor.getBlock(45204);
   ```

3. **Asset Type Detection:**
   - Only `logseq.property.asset/type` reliably indicates assets
   - Don't assume all pages with UUIDs are assets
   - Always query for asset type property

4. **Testing Environment Issues:**
   - Logseq global undefined → Check `src/tests/setup.ts` is loaded
   - Coverage below threshold → Run `pnpm test:coverage` to see details
   - Tests timeout → Check for unresolved promises or missing awaits

### Code Style

- Use functional components with hooks
- Prefer composition over complex inheritance
- Keep components small and focused
- Use TypeScript strict mode (already enabled)
- Follow existing naming conventions (camelCase for variables, PascalCase for components)
- Add JSDoc comments for public APIs
- Use meaningful variable names (avoid single-letter variables except in iterators)
