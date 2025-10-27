# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlogSeq is a Logseq plugin that exports pages to clean Markdown format with support for assets, frontmatter, and various export options. Built with React, TypeScript, Vite, and TailwindCSS.

## Development Commands

```bash
# Install dependencies (using pnpm)
pnpm install

# Development mode with HMR
pnpm dev

# Build the plugin for production
pnpm build

# Type checking (run before build)
tsc
```

## Architecture

### Core Components

**Plugin Entry (`src/main.tsx`)**

- Registers toolbar UI items and slash commands
- Creates the Logseq plugin model with `show()` and `exportPage()` methods
- Mounts the React app and manages UI visibility
- Plugin ID: `_briansunter-blogseq`

**React Application (`src/App.tsx`)**

- Main UI component with ultra-compact design
- Three-row header layout: title/export button, settings checkboxes, preview controls
- Handles export settings state and preview generation
- Top spacer (32px) prevents macOS window button overlap

**Markdown Exporter (`src/markdownExporter.ts`)**

- Core export logic as a singleton class
- Key features:
  - Resolves block references `((uuid))` and page references `[[page]]`
  - Handles `logseq.property/heading` to convert blocks to markdown headers (# through ######)
  - Detects and includes referenced assets with UUID-based resolution
  - Generates YAML frontmatter from page properties
  - Supports ZIP export with assets folder

**Utilities (`src/utils.ts`)**

- `useAppVisible` hook syncs React component visibility with Logseq UI state
- Uses Logseq event subscriptions for UI show/hide events

### Export Options

The exporter supports these configurable options:

- `includePageName`: Add page name as H1 header (default: false)
- `flattenNested`: Flatten nested blocks into paragraphs (default: true)
- `preserveBlockRefs`: Resolve ((uuid)) references (default: true)
- `removeLogseqSyntax`: Clean Logseq-specific markup (default: true)
- `includeTags`: Include #tags in export (default: true)
- `includeProperties`: Generate YAML frontmatter (default: true)
- `resolvePlainUuids`: Convert plain UUID text to references (default: true)

### Asset Handling

The plugin detects assets through DataScript queries checking for:

- `logseq.property.asset/type` or similar asset type properties
- Assets are tracked in `referencedAssets` Map during export
- ZIP export includes an `/assets/` folder with all referenced files
- Markdown references are converted to relative paths

### UI Design Principles

- Ultra-compact layout with minimal padding
- Fixed window size: `w-[98vw] h-[98vh]`
- Top spacer bar (32px) prevents macOS traffic light button overlap
- Content max-width: `max-w-3xl` (768px) for optimal readability
- Native browser checkboxes for minimal height in settings

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
  2. Resolving db/ids to block UUIDs
  3. Skipping blocks matching those UUIDs during export
