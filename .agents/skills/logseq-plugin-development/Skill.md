---
name: Logseq Plugin Development
description: Develop Logseq plugins using @logseq/libs. Covers all APIs for pages, blocks, tags, properties, queries, templates, and UI injection.
version: 1.0.0
dependencies: node>=16.0.0, @logseq/libs>=0.2.8
---

# Logseq Plugin Development Skill

This Skill provides comprehensive knowledge for developing Logseq plugins using `@logseq/libs` v0.2.8. Use this Skill when the user asks about:

- Creating or modifying Logseq plugins
- Using the Logseq plugin API
- Querying Logseq's database with Datascript
- Manipulating pages, blocks, tags, or properties in Logseq
- Injecting UI or commands into Logseq
- Working with DB graphs (classes, typed properties, EDN)
- Setting up Vite bundling for optimized plugin performance

For complete API reference, see [REFERENCE.md](./REFERENCE.md).

---

## Overview

Logseq plugins run in a sandboxed environment and communicate with the main app via RPC. The global `logseq` object provides access to all APIs.

### Plugin Structure

```
my-plugin/
├── package.json
├── index.html
├── index.ts (or index.js)
└── icon.svg
```

### Minimal Plugin

```typescript
import '@logseq/libs';

async function main() {
  console.log('Plugin loaded:', logseq.baseInfo.id);
}

logseq.ready(main).catch(console.error);
```

---

## Core Concepts

### All APIs are Asynchronous

Every `logseq.*` call returns a Promise. Always use `await`:

```typescript
// ✅ Correct
const page = await logseq.Editor.getCurrentPage();

// ❌ Wrong
const page = logseq.Editor.getCurrentPage(); // Returns Promise, not data
```

### API Namespaces

| Namespace | Purpose |
|-----------|---------|
| `logseq.App` | Application state, graphs, templates, commands, navigation |
| `logseq.Editor` | Pages, blocks, tags, properties |
| `logseq.DB` | Datascript queries |
| `logseq.UI` | Toast messages, element queries |
| `logseq.Git` | Git operations |
| `logseq.Assets` | File management |
| `logseq.FileStorage` | Persistent plugin storage |
| `logseq.Request` | HTTP requests |
| `logseq.Experiments` | Experimental APIs |

---

## Data Structures

### BlockEntity

```typescript
interface BlockEntity {
  id: number;           // Internal entity ID
  uuid: string;         // UUID for API calls
  content: string;      // Raw markdown content
  format: 'markdown' | 'org';
  parent: { id: number };
  page: { id: number };
  properties?: Record<string, any>;
  children?: BlockEntity[];
  'collapsed?': boolean;
  level?: number;
  marker?: string;      // TODO/DONE/LATER/NOW
  createdAt: number;
  updatedAt: number;
}
```

### PageEntity

```typescript
interface PageEntity {
  id: number;
  uuid: string;
  name: string;         // Lowercase page name
  originalName?: string;
  format: 'markdown' | 'org';
  type: 'page' | 'journal' | 'whiteboard' | 'class' | 'property' | 'hidden';
  'journal?': boolean;
  journalDay?: number;  // YYYYMMDD for journals
  properties?: Record<string, any>;
}
```

---

## App APIs (logseq.App)

### Graph Information

```typescript
const graph = await logseq.App.getCurrentGraph();
const prefs = await logseq.App.getUserConfigs();
const info = await logseq.App.getInfo();
```

### Favorites & Recent

```typescript
const favorites = await logseq.App.getCurrentGraphFavorites();
const recent = await logseq.App.getCurrentGraphRecent();
```

### Templates

```typescript
const templates = await logseq.App.getCurrentGraphTemplates();
const template = await logseq.App.getTemplate('meeting-notes');
await logseq.App.createTemplate(blockUuid, 'my-template');
await logseq.App.insertTemplate(targetBlockUuid, 'template-name');
await logseq.App.removeTemplate('old-template');
```

### Navigation

```typescript
logseq.App.pushState('page', { name: 'my-page' });
logseq.App.pushState('home');
await logseq.App.openExternalLink('https://example.com');
```

---

## Editor APIs (logseq.Editor)

### Page Operations

```typescript
const page = await logseq.Editor.getCurrentPage();
const page = await logseq.Editor.getPage('page-name');
const pages = await logseq.Editor.getAllPages();

const newPage = await logseq.Editor.createPage('New Page', 
  { status: 'draft' },
  { redirect: true, createFirstBlock: true }
);

await logseq.Editor.deletePage('page-name');
await logseq.Editor.renamePage('old', 'new');

const blocks = await logseq.Editor.getPageBlocksTree('page-name');
const refs = await logseq.Editor.getPageLinkedReferences('page-name');
```

### Block Operations

```typescript
const block = await logseq.Editor.getCurrentBlock();
const block = await logseq.Editor.getBlock('uuid', { includeChildren: true });
const selected = await logseq.Editor.getSelectedBlocks();

const prev = await logseq.Editor.getPreviousSiblingBlock('uuid');
const next = await logseq.Editor.getNextSiblingBlock('uuid');

const newBlock = await logseq.Editor.insertBlock(parentUuid, 'Content', {
  sibling: false,
  properties: { key: 'value' }
});

await logseq.Editor.insertBatchBlock(parentUuid, [
  { content: 'Block 1', children: [{ content: 'Child' }] },
  { content: 'Block 2' }
], { sibling: true });

await logseq.Editor.updateBlock('uuid', 'New content');
await logseq.Editor.removeBlock('uuid');
await logseq.Editor.setBlockCollapsed('uuid', 'toggle');

await logseq.Editor.prependBlockInPage('page-name', 'First block');
await logseq.Editor.appendBlockInPage('page-name', 'Last block');
```

### Tag Operations

```typescript
// Get All Tags
const allTags = await logseq.Editor.getAllTags();

// Create Tag (Class)
const zotTag = await logseq.Editor.createTag('zot');

// Create Namespaced Tag
const nsTag = await logseq.Editor.createTag('my-plugin-data', {
  uuid: 'my-plugin-id-tag-uuid'
});

// Defining Class Schema (Properties)
// 1. Define types first
await logseq.Editor.upsertProperty('author', { type: 'string' });
await logseq.Editor.upsertProperty('year', { type: 'number' });

// 2. Add to tag
await logseq.Editor.addTagProperty(zotTag.uuid, 'author');
await logseq.Editor.addTagProperty(zotTag.uuid, 'year');
```

   ### Property Operations

   **CRITICAL**: In DB graphs, properties are typed entities. Always define types before use.

   **Supported Types**:

   | Type | Example | Storage |
   |------|---------|---------|
   | `string` | `"Text"` | Direct value |
   | `number` | `2024` | Entity reference (if not typed) / Value (if typed) |
   | `datetime` | `Date.now()` | Number (ms) |
   | `date` | `journalPage.id` | Entity ID of journal page |
   | `checkbox` | `true` | Boolean |

   ```typescript
   // 1. Define Types
   const types = {
     author: 'string',
     year: 'number',
     isRead: 'checkbox'
   };
   
   for (const [prop, type] of Object.entries(types)) {
     await logseq.Editor.upsertProperty(prop, { type });
   }
   
   // 2. Set Properties Atomic
   await logseq.Editor.createPage('My Article', {
     tags: ['zot'],
     author: 'Jane Doe',
     year: 2024,
     isRead: false
   });
   ```

### Editing Operations
```typescript
const allProps = await logseq.Editor.getAllProperties();
const prop = await logseq.Editor.getProperty('status');

const props = await logseq.Editor.getBlockProperties('block-uuid');
const status = await logseq.Editor.getBlockProperty('uuid', 'status');

await logseq.Editor.upsertBlockProperty('uuid', 'status', 'done');
await logseq.Editor.removeBlockProperty('uuid', 'status');

const pageProps = await logseq.Editor.getPageProperties('page-name');
```

---

## Database Queries (logseq.DB)

### Simple DSL Query

```typescript
const results = await logseq.DB.q('(property status done)');
```

### Datascript Queries

```typescript
// Find all journal pages
const journals = await logseq.DB.datascriptQuery(`
  [:find (pull ?p [:block/name :block/uuid :block/journal-day])
   :where [?p :block/journal? true]]
`);

// Find blocks with property
const blocks = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [*])
   :where
   [?b :block/properties ?props]
   [(get ?props :status) ?v]
   [(= ?v "in-progress")]]
`);

// Find blocks with tag
const tagged = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [*])
   :where
   [?b :block/refs ?ref]
   [?ref :block/name "my-tag"]]
`);

// Find TODO items
const todos = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [:block/uuid :block/content :block/marker])
   :where
   [?b :block/marker ?m]
   [(contains? #{"TODO" "NOW" "LATER"} ?m)]]
`);
```

### Subscribe to Changes

```typescript
const unsub = logseq.DB.onChanged(({ blocks, txData }) => {
  console.log('Changed:', blocks);
});

const unsub = logseq.DB.onBlockChanged('uuid', (block) => {
  console.log('Block updated:', block);
});
```

---

## UI APIs

### Toast Messages

```typescript
await logseq.UI.showMsg('Success!', 'success');
await logseq.UI.showMsg('Error!', 'error');
const key = await logseq.UI.showMsg('Info', 'info', { timeout: 5000 });
logseq.UI.closeMsg(key);
```

---

## Commands & Shortcuts

### Slash Commands

```typescript
logseq.Editor.registerSlashCommand('My Command', async () => {
  const block = await logseq.Editor.getCurrentBlock();
  if (block) {
    await logseq.Editor.insertBlock(block.uuid, 'Inserted!');
  }
});
```

### Block Context Menu

```typescript
logseq.Editor.registerBlockContextMenuItem('Copy UUID', async ({ uuid }) => {
  await navigator.clipboard.writeText(uuid);
  logseq.UI.showMsg('Copied!', 'success');
});
```

### Keyboard Shortcuts

```typescript
logseq.App.registerCommandShortcut(
  { binding: 'mod+shift+t' },
  async () => { /* handler */ }
);
```

### Command Palette

```typescript
logseq.App.registerCommandPalette(
  { key: 'my-cmd', label: 'My Plugin: Action' },
  async () => { /* handler */ }
);
```

---

## UI Injection

```typescript
logseq.provideStyle(`
  .my-class { color: var(--ls-primary-text-color); }
`);

logseq.provideUI({
  key: 'my-panel',
  path: '#app-container',
  template: `<div data-on-click="handleClick">Click</div>`
});

logseq.provideModel({
  handleClick() { logseq.UI.showMsg('Clicked!'); }
});
```

---

## Settings

```typescript
logseq.useSettingsSchema([
  { key: 'apiKey', type: 'string', default: '', title: 'API Key', description: '' },
  { key: 'enabled', type: 'boolean', default: true, title: 'Enabled', description: '' },
  { key: 'theme', type: 'enum', default: 'auto', enumChoices: ['light', 'dark', 'auto'], enumPicker: 'select', title: 'Theme', description: '' }
]);

const settings = logseq.settings;
logseq.onSettingsChanged((newSettings, oldSettings) => { });
logseq.updateSettings({ enabled: false });
```

---

## Storage & Requests

```typescript
// File Storage
await logseq.FileStorage.setItem('cache.json', JSON.stringify(data));
const raw = await logseq.FileStorage.getItem('cache.json');
await logseq.FileStorage.removeItem('cache.json');

// HTTP Requests
const data = await logseq.Request._request({
  url: 'https://api.example.com/data',
  method: 'GET',
  returnType: 'json'
});
```

---

## Event Handling

```typescript
logseq.App.onCurrentGraphChanged(() => { });
logseq.App.onThemeModeChanged(({ mode }) => { });
logseq.App.onRouteChanged(({ path }) => { });

logseq.beforeunload(async () => {
  await saveData();
});
```

---

## Complete Plugin Example

```typescript
import '@logseq/libs';

async function main() {
  logseq.useSettingsSchema([
    { key: 'enabled', type: 'boolean', default: true, title: 'Enabled', description: '' }
  ]);

  logseq.provideStyle(`.my-highlight { background: yellow; }`);

  logseq.Editor.registerSlashCommand('Timestamp', async () => {
    const block = await logseq.Editor.getCurrentBlock();
    if (block) {
      await logseq.Editor.insertBlock(block.uuid, new Date().toISOString());
    }
  });

  logseq.beforeunload(async () => { console.log('Unloading'); });
  console.log('Plugin loaded!');
}

logseq.ready(main).catch(console.error);
```

---

## Project Setup: Vite Bundling

**CRITICAL**: Use Vite for optimized plugin performance.

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import logseqDevPlugin from 'vite-plugin-logseq';

export default defineConfig({
  plugins: [logseqDevPlugin()],
  build: { target: 'esnext', minify: 'esbuild' }
});
```

---

## Practical Plugin Patterns

### Pattern 1: Tag Schema Setup

```typescript
async function initSchema() {
  // 1. Create Class/Tag
  const tag = await logseq.Editor.createTag('Book');
  
  // 2. Define Properties
  const props = ['author', 'year', 'rating'];
  for (const p of props) {
    // Define type
    await logseq.Editor.upsertProperty(p, { type: 'string' });
    // Add to schema
    await logseq.Editor.addTagProperty(tag.uuid, p);
  }
}
```

### Pattern 2: Import Workflow

```typescript
async function importItem(data) {
  // Atomic creation with properties
  await logseq.Editor.createPage(data.title, {
    tags: ['Book'],
    author: data.author,
    year: parseInt(data.year), // Ensure number type
    ...data.props
  });
}
```

### Pattern 3: Date Property Handling

Date properties store the **Entity ID** of a journal page.

```typescript
// 1. Define type
await logseq.Editor.upsertProperty('dueDate', { type: 'date' });

// 2. Get/Create Journal Page (ISO format)
const journal = await logseq.Editor.createPage('2024-12-25', {}, { redirect: false });

// 3. Set Property using Page ID
await logseq.Editor.upsertBlockProperty(uuid, 'dueDate', journal.id);
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------
| Forgetting `await` | All `logseq.*` calls are async |
| Number properties failing | Define type `number` with `upsertProperty` FIRST |
| Date properties empty | Set value to `journalPage.id` (number), not date string |
| Slow plugin load | Use Vite bundling + `vite-plugin-logseq` |
| Using `created`/`modified` | Reserved. Use `dateAdded` / `dateModified` |
| Empty properties | Just set them; DB automatically hides null/empty values |
| Tag Creation fails | Ensure tag name is non-empty string, no slashes |

---

## When to Apply This Skill

Apply this Skill when:
- Creating new Logseq plugins
- Debugging existing plugin code
- Understanding Logseq plugin APIs
- Writing Datascript queries for Logseq
- Injecting custom UI into Logseq
- Working with Logseq's page/block/tag/property systems
