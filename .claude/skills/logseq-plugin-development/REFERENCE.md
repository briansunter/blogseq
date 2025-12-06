# Logseq Plugin API Reference

Complete API reference for `@logseq/libs` v0.2.8. This is supplemental documentation for the main Skill.md file.

---

## Table of Contents

1. [Type Definitions](#type-definitions)
2. [IAppProxy Complete Reference](#iappproxy-complete-reference)
3. [IEditorProxy Complete Reference](#ieditorproxy-complete-reference)
4. [IDBProxy Complete Reference](#idbproxy-complete-reference)
5. [IUIProxy Complete Reference](#iuiproxy-complete-reference)
6. [IGitProxy Complete Reference](#igitproxy-complete-reference)
7. [IAssetsProxy Complete Reference](#iassetsproxy-complete-reference)
8. [LSPluginFileStorage Complete Reference](#lspluginfilestorage-complete-reference)
9. [LSPluginRequest Complete Reference](#lspluginrequest-complete-reference)
10. [LSPluginExperiments Complete Reference](#lspluginexperiments-complete-reference)
11. [Settings Schema Reference](#settings-schema-reference)
12. [Hooks & Events Reference](#hooks--events-reference)
13. [Advanced Datascript Queries](#advanced-datascript-queries)

---

## Type Definitions

### Core Identity Types

```typescript
type EntityID = number;
type BlockUUID = string;
type BlockUUIDTuple = ['uuid', BlockUUID];
type PluginLocalIdentity = string;
type ThemeMode = 'light' | 'dark';

interface IEntityID {
  id: EntityID;
  [key: string]: any;
}

type BlockIdentity = BlockUUID | Pick<BlockEntity, 'uuid'>;
type BlockPageName = string;
type PageIdentity = BlockPageName | BlockIdentity;
```

### LSPluginBaseInfo

```typescript
interface LSPluginBaseInfo {
  id: string;
  mode: 'shadow' | 'iframe';
  settings: { disabled: boolean } & Record<string, unknown>;
  effect: boolean;
  iir: boolean;
  lsr: string;
}
```

### BlockEntity (Full)

```typescript
interface BlockEntity {
  id: EntityID;
  uuid: BlockUUID;
  order: string;
  format: 'markdown' | 'org';
  parent: IEntityID;
  title: string;
  fullTitle: string;
  content?: string;
  page: IEntityID;
  createdAt: number;
  updatedAt: number;
  ident?: string;
  properties?: Record<string, any>;
  'collapsed?': boolean;
  anchor?: string;
  body?: any;
  children?: Array<BlockEntity | BlockUUIDTuple>;
  container?: string;
  file?: IEntityID;
  level?: number;
  meta?: {
    timestamps: any;
    properties: any;
    startPos: number;
    endPos: number;
  };
  marker?: string;
  [key: string]: unknown;
}
```

### PageEntity (Full)

```typescript
interface PageEntity {
  id: EntityID;
  uuid: BlockUUID;
  name: string;
  format: 'markdown' | 'org';
  type: 'page' | 'journal' | 'whiteboard' | 'class' | 'property' | 'hidden';
  updatedAt: number;
  createdAt: number;
  'journal?': boolean;
  title?: string;
  file?: IEntityID;
  originalName?: string;
  namespace?: IEntityID;
  children?: Array<PageEntity>;
  properties?: Record<string, any>;
  journalDay?: number;
  ident?: string;
  [key: string]: unknown;
}
```

### IBatchBlock

```typescript
interface IBatchBlock {
  content: string;
  properties?: Record<string, any>;  // Not supported in DB graphs
  children?: Array<IBatchBlock>;
}
```

### Theme Types

```typescript
interface LegacyTheme {
  name: string;
  url: string;
  description?: string;
  mode?: ThemeMode;
  pid: PluginLocalIdentity;
}

interface Theme extends LegacyTheme {
  mode: ThemeMode;
}
```

### UI Option Types

```typescript
type StyleString = string;

type StyleOptions = {
  key?: string;
  style: StyleString;
};

type UIContainerAttrs = {
  draggable: boolean;
  resizable: boolean;
};

type UIBaseOptions = {
  key?: string;
  replace?: boolean;
  template: string | null;
  style?: CSS.Properties;
  attrs?: Record<string, string>;
  close?: 'outside' | string;
  reset?: boolean;
};

type UIPathIdentity = { path: string };
type UISlotIdentity = { slot: string };
type UISlotOptions = UIBaseOptions & UISlotIdentity;
type UIPathOptions = UIBaseOptions & UIPathIdentity;
type UIOptions = UIBaseOptions | UIPathOptions | UISlotOptions;
```

### App Info Types

```typescript
interface AppUserInfo {
  [key: string]: any;
}

interface AppInfo {
  version: string;
  supportDb: boolean;
  [key: string]: unknown;
}

interface AppUserConfigs {
  preferredThemeMode: ThemeMode;
  preferredFormat: 'markdown' | 'org';
  preferredDateFormat: string;
  preferredStartOfWeek: string;
  preferredLanguage: string;
  preferredWorkflow: string;
  currentGraph: string;
  showBracket: boolean;
  enabledFlashcards: boolean;
  enabledJournals: boolean;
  [key: string]: unknown;
}

interface AppGraphInfo {
  name: string;
  url: string;
  path: string;
  [key: string]: unknown;
}
```

### Cursor & Command Types

```typescript
type BlockCursorPosition = {
  left: number;
  top: number;
  height: number;
  pos: number;
  rect: DOMRect;
};

type SlashCommandActionCmd = 
  | 'editor/input' 
  | 'editor/hook' 
  | 'editor/clear-current-slash' 
  | 'editor/restore-saved-cursor';

type SlashCommandAction = [cmd: SlashCommandActionCmd, ...args: any];

type Keybinding = string | Array<string>;

type SimpleCommandKeybinding = {
  mode?: 'global' | 'non-editing' | 'editing';
  binding: Keybinding;
  mac?: string;
};
```

### Git Types

```typescript
type IGitResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};
```

### Datom Type

```typescript
type IDatom = [
  e: number,      // Entity ID
  a: string,      // Attribute
  v: any,         // Value
  t: number,      // Transaction ID
  added: boolean  // Added or retracted
];
```

---

## IAppProxy Complete Reference

### Information Methods

| Method | Signature |
|--------|-----------|
| `getInfo` | `(key?: keyof AppInfo) => Promise<AppInfo \| any>` |
| `getUserInfo` | `() => Promise<AppUserInfo \| null>` |
| `getUserConfigs` | `() => Promise<AppUserConfigs>` |
| `getCurrentGraph` | `() => Promise<AppGraphInfo \| null>` |
| `getCurrentGraphConfigs` | `(...keys: string[]) => Promise<any>` |
| `getCurrentGraphFavorites` | `() => Promise<Array<string \| PageEntity> \| null>` |
| `getCurrentGraphRecent` | `() => Promise<Array<string \| PageEntity> \| null>` |
| `getStateFromStore` | `<T>(path: string \| string[]) => Promise<T>` |
| `getExternalPlugin` | `(pid: string) => Promise<{} \| null>` |

### Template Methods

| Method | Signature |
|--------|-----------|
| `getCurrentGraphTemplates` | `() => Promise<Record<string, BlockEntity> \| null>` |
| `getTemplate` | `(name: string) => Promise<BlockEntity \| null>` |
| `createTemplate` | `(target: BlockUUID, name: string, opts?: { overwrite? }) => Promise<any>` |
| `insertTemplate` | `(target: BlockUUID, name: string) => Promise<any>` |
| `removeTemplate` | `(name: string) => Promise<any>` |

### Navigation Methods

| Method | Signature |
|--------|-----------|
| `pushState` | `(k: string, params?, query?) => void` |
| `replaceState` | `(k: string, params?, query?) => void` |
| `openExternalLink` | `(url: string) => Promise<void>` |
| `quit` | `() => Promise<void>` |
| `relaunch` | `() => Promise<void>` |

### Command Registration

| Method | Signature |
|--------|-----------|
| `registerCommand` | `(type, opts: { key, label, desc?, palette?, keybinding? }, action) => void` |
| `registerCommandPalette` | `(opts: { key, label, keybinding? }, action) => void` |
| `registerCommandShortcut` | `(keybinding, action, opts?) => void` |
| `registerPageMenuItem` | `(tag: string, action: ({ page }) => void) => void` |
| `registerSearchService` | `<T extends IPluginSearchServiceHooks>(s: T) => void` |
| `invokeExternalCommand` | `(type: ExternalCommandType, ...args) => Promise<void>` |

### Hooks

| Hook | Payload |
|------|---------|
| `onCurrentGraphChanged` | `void` |
| `onThemeModeChanged` | `{ mode: ThemeMode }` |
| `onRouteChanged` | `{ path: string, template: string }` |
| `onSidebarVisibleChanged` | `{ visible: boolean }` |
| `onMacroRendererSlotted` | `{ slot, payload: { arguments, uuid } }` |
| `onBlockRendererSlotted` | `BlockEntity` |
| `onPageHeadActionsSlotted` | slot info |
| `onBeforeCommandInvoked` | `IHookEvent` |
| `onAfterCommandInvoked` | `IHookEvent` |

---

## IEditorProxy Complete Reference

### Command Registration

| Method | Signature |
|--------|-----------|
| `registerSlashCommand` | `(tag: string, action: BlockCommandCallback \| SlashCommandAction[]) => unknown` |
| `registerBlockContextMenuItem` | `(label: string, action: BlockCommandCallback) => unknown` |
| `registerHighlightContextMenuItem` | `(label, action, opts?: { clearSelection }) => unknown` |

### Editing State

| Method | Signature |
|--------|-----------|
| `checkEditing` | `() => Promise<BlockUUID \| boolean>` |
| `insertAtEditingCursor` | `(content: string) => Promise<void>` |
| `restoreEditingCursor` | `() => Promise<void>` |
| `exitEditingMode` | `(selectBlock?: boolean) => Promise<void>` |
| `getEditingCursorPosition` | `() => Promise<BlockCursorPosition \| null>` |
| `getEditingBlockContent` | `() => Promise<string>` |

### Current Context

| Method | Signature |
|--------|-----------|
| `getCurrentPage` | `() => Promise<PageEntity \| BlockEntity \| null>` |
| `getCurrentBlock` | `() => Promise<BlockEntity \| null>` |
| `getSelectedBlocks` | `() => Promise<BlockEntity[] \| null>` |
| `clearSelectedBlocks` | `() => Promise<void>` |
| `getCurrentPageBlocksTree` | `() => Promise<BlockEntity[]>` |

### Page Operations

| Method | Signature |
|--------|-----------|
| `getPage` | `(src: PageIdentity \| EntityID, opts?) => Promise<PageEntity \| null>` |
| `getAllPages` | `(repo?: string) => Promise<PageEntity[] \| null>` |
| `createPage` | `(name, properties?, opts?) => Promise<PageEntity \| null>` |
| `createJournalPage` | `(date: string \| Date) => Promise<PageEntity \| null>` |
| `deletePage` | `(name: BlockPageName) => Promise<void>` |
| `renamePage` | `(oldName: string, newName: string) => Promise<void>` |
| `getPageBlocksTree` | `(srcPage: PageIdentity) => Promise<BlockEntity[]>` |
| `getPageLinkedReferences` | `(srcPage) => Promise<[PageEntity, BlockEntity[]][] \| null>` |
| `getPagesFromNamespace` | `(namespace) => Promise<PageEntity[] \| null>` |
| `getPagesTreeFromNamespace` | `(namespace) => Promise<PageEntity[] \| null>` |

### Block Operations

| Method | Signature |
|--------|-----------|
| `getBlock` | `(src: BlockIdentity \| EntityID, opts?) => Promise<BlockEntity \| null>` |
| `insertBlock` | `(srcBlock, content, opts?) => Promise<BlockEntity \| null>` |
| `insertBatchBlock` | `(srcBlock, batch, opts?) => Promise<BlockEntity[] \| null>` |
| `updateBlock` | `(srcBlock, content, opts?) => Promise<void>` |
| `removeBlock` | `(srcBlock: BlockIdentity) => Promise<void>` |
| `setBlockCollapsed` | `(uuid, opts) => Promise<void>` |
| `appendBlockInPage` | `(page, content, opts?) => Promise<BlockEntity \| null>` |
| `prependBlockInPage` | `(page, content, opts?) => Promise<BlockEntity \| null>` |
| `getPreviousSiblingBlock` | `(srcBlock) => Promise<BlockEntity \| null>` |
| `getNextSiblingBlock` | `(srcBlock) => Promise<BlockEntity \| null>` |
| `newBlockUUID` | `() => Promise<string>` |
| `isPageBlock` | `(block) => boolean` |

### Tag Operations

| Method | Signature |
|--------|-----------|
| `getAllTags` | `() => Promise<PageEntity[] \| null>` |
| `getTag` | `(nameOrIdent: string) => Promise<PageEntity \| null>` |
| `createTag` | `(tagName: string, opts?: { uuid? }) => Promise<PageEntity \| null>` |
| `getTagObjects` | `(nameOrIdent: string) => Promise<BlockEntity[] \| null>` |
| `addBlockTag` | `(blockId, tagId) => Promise<void>` |
| `removeBlockTag` | `(blockId, tagId) => Promise<void>` |
| `addTagProperty` | `(tagId, propertyIdOrName) => Promise<void>` |
| `removeTagProperty` | `(tagId, propertyIdOrName) => Promise<void>` |

> **Note**: Tag properties define the **Class Schema**. Adding a property to a tag makes it available for all pages/blocks with that tag.

### Property Operations

| Method | Signature |
|--------|-----------|
| `getAllProperties` | `() => Promise<PageEntity[] \| null>` |
| `getProperty` | `(key: string) => Promise<BlockEntity \| null>` |
| `removeProperty` | `(key: string) => Promise<void>` |
| `upsertBlockProperty` | `(block, key, value) => Promise<void>` |
| `removeBlockProperty` | `(block, key) => Promise<void>` |
| `getBlockProperty` | `(block, key) => Promise<BlockEntity \| unknown>` |
| `getBlockProperties` | `(block) => Promise<Record<string, any> \| null>` |
| `getPageProperties` | `(page) => Promise<Record<string, any> \| null>` |
| `upsertProperty` | `(name: string, opts: { type: string }) => Promise<void>` |

#### Supported Property Types (DB Graphs)

| Type Identifier | Description | Storage |
|-----------------|-------------|---------|
| `string` | Explicit text string | Direct value |
| `default` | Default text | Entity reference |
| `number` | Numeric value | Entity reference (untyped) / Value (typed) |
| `datetime` | Timestamp (ms) | Numeric value |
| `date` | Journal Date | **Entity ID** of journal page |
| `checkbox` | Boolean | Direct boolean |
| `url` | URL string | Entity reference |
| `node` | Page reference | Entity reference |

> **Critical**: Always define property type using `upsertProperty` BEFORE using it on pages/blocks to ensure correct storage behavior, especially for `number` and `date` types.

### Navigation

| Method | Signature |
|--------|-----------|
| `scrollToBlockInPage` | `(pageName, blockId, opts?) => void` |
| `openInRightSidebar` | `(id: BlockUUID \| EntityID) => void` |

---

## IDBProxy Complete Reference

| Method | Signature |
|--------|-----------|
| `q` | `<T>(dsl: string) => Promise<T[] \| null>` |
| `datascriptQuery` | `<T>(query: string, ...inputs: any[]) => Promise<T>` |
| `onChanged` | `IUserHook<{ blocks, txData, txMeta? }>` |
| `onBlockChanged` | `(uuid, callback) => IUserOffHook` |

---

## IUIProxy Complete Reference

| Method | Signature |
|--------|-----------|
| `showMsg` | `(content, status?, opts?) => Promise<string>` |
| `closeMsg` | `(key: string) => void` |
| `queryElementRect` | `(selector: string) => Promise<DOMRectReadOnly \| null>` |
| `queryElementById` | `(id: string) => Promise<string \| boolean>` |
| `checkSlotValid` | `(slot: string) => Promise<boolean>` |
| `resolveThemeCssPropsVals` | `(props: string \| string[]) => Promise<Record<string, string \| undefined> \| null>` |

---

## IGitProxy Complete Reference

| Method | Signature |
|--------|-----------|
| `execCommand` | `(args: string[]) => Promise<IGitResult>` |
| `loadIgnoreFile` | `() => Promise<string>` |
| `saveIgnoreFile` | `(content: string) => Promise<void>` |

---

## IAssetsProxy Complete Reference

| Method | Signature |
|--------|-----------|
| `listFilesOfCurrentGraph` | `(exts?: string \| string[]) => Promise<FileInfo[]>` |
| `makeSandboxStorage` | `() => IAsyncStorage` |
| `makeUrl` | `(path: string) => Promise<string>` |
| `builtInOpen` | `(path: string) => Promise<boolean \| undefined>` |

---

## LSPluginFileStorage Complete Reference

| Method | Signature |
|--------|-----------|
| `getItem` | `(key: string) => Promise<string \| undefined>` |
| `setItem` | `(key: string, value: string) => Promise<void>` |
| `removeItem` | `(key: string) => Promise<void>` |
| `hasItem` | `(key: string) => Promise<boolean>` |
| `allKeys` | `() => Promise<string[]>` |
| `clear` | `() => Promise<void>` |
| `ctxId` | property: Plugin ID |

---

## LSPluginRequest Complete Reference

### IRequestOptions

```typescript
type IRequestOptions<R> = {
  url: string;
  abortable: boolean;
  headers: Record<string, string>;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: Object | ArrayBuffer;
  timeout: number;
  returnType: 'json' | 'text' | 'base64' | 'arraybuffer';
  success: (result: R) => void;
  fail: (err: any) => void;
  final: () => void;
};
```

| Method | Signature |
|--------|-----------|
| `_request` | `<R>(options) => Promise<R \| LSPluginRequestTask<R>>` |

---

## LSPluginExperiments Complete Reference

| Property/Method | Type/Signature |
|-----------------|----------------|
| `React` | `unknown` |
| `ReactDOM` | `unknown` |
| `Components` | `{ Editor }` |
| `Utils` | `{ toClj, jsxToClj, toJs, toKeyword, toSymbol }` |
| `pluginLocal` | `PluginLocal` |
| `invokeExperMethod` | `(type, ...args) => any` |
| `loadScripts` | `(...scripts: string[]) => Promise<void>` |
| `registerFencedCodeRenderer` | `(lang, opts) => any` |
| `registerDaemonRenderer` | `(key, opts) => any` |
| `registerRouteRenderer` | `(key, opts) => any` |
| `registerExtensionsEnhancer` | `<T>(type, enhancer) => any` |
| `ensureHostScope` | `() => any` |

---

## Settings Schema Reference

```typescript
type SettingSchemaDesc = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'heading';
  default: string | number | boolean | Array<any> | object | null;
  title: string;
  description: string;
  inputAs?: 'color' | 'date' | 'datetime-local' | 'range' | 'textarea';
  enumChoices?: Array<string>;
  enumPicker?: 'select' | 'radio' | 'checkbox';
};
```

### All Setting Types

```typescript
// Heading (section divider)
{ key: 'section', type: 'heading', title: 'Section', default: null, description: '' }

// String
{ key: 'text', type: 'string', default: '', title: 'Text', description: '' }

// String as textarea
{ key: 'notes', type: 'string', default: '', title: 'Notes', description: '', inputAs: 'textarea' }

// String as color picker
{ key: 'color', type: 'string', default: '#000000', title: 'Color', description: '', inputAs: 'color' }

// String as date picker
{ key: 'date', type: 'string', default: '', title: 'Date', description: '', inputAs: 'date' }

// Number
{ key: 'count', type: 'number', default: 10, title: 'Count', description: '' }

// Number as range slider
{ key: 'level', type: 'number', default: 5, title: 'Level', description: '', inputAs: 'range' }

// Boolean
{ key: 'enabled', type: 'boolean', default: true, title: 'Enabled', description: '' }

// Enum with select
{ key: 'theme', type: 'enum', default: 'auto', enumChoices: ['light', 'dark', 'auto'], enumPicker: 'select', title: 'Theme', description: '' }

// Enum with radio
{ key: 'mode', type: 'enum', default: 'a', enumChoices: ['a', 'b'], enumPicker: 'radio', title: 'Mode', description: '' }

// Enum with checkbox (multi-select)
{ key: 'features', type: 'enum', default: ['a'], enumChoices: ['a', 'b', 'c'], enumPicker: 'checkbox', title: 'Features', description: '' }

// Object (JSON)
{ key: 'config', type: 'object', default: {}, title: 'Config', description: '' }
```

---

## Hooks & Events Reference

### Hook Types

```typescript
type IHookEvent = { [key: string]: any };
type IUserOffHook = () => void;
type IUserHook<E, R = IUserOffHook> = (callback: (e: IHookEvent & E) => void) => IUserOffHook;
type SimpleCommandCallback<E> = (e: IHookEvent & E) => void;
type BlockCommandCallback = (e: IHookEvent & { uuid: BlockUUID }) => Promise<void>;
```

### External Command Types

```typescript
type ExternalCommandType =
  | 'logseq.command/run'
  | 'logseq.editor/cycle-todo'
  | 'logseq.editor/down'
  | 'logseq.editor/up'
  | 'logseq.editor/expand-block-children'
  | 'logseq.editor/collapse-block-children'
  | 'logseq.editor/open-file-in-default-app'
  | 'logseq.editor/open-file-in-directory'
  | 'logseq.editor/select-all-blocks'
  | 'logseq.editor/toggle-open-blocks'
  | 'logseq.editor/zoom-in'
  | 'logseq.editor/zoom-out'
  | 'logseq.editor/indent'
  | 'logseq.editor/outdent'
  | 'logseq.editor/copy'
  | 'logseq.editor/cut'
  | 'logseq.go/home'
  | 'logseq.go/journals'
  | 'logseq.go/keyboard-shortcuts'
  | 'logseq.go/next-journal'
  | 'logseq.go/prev-journal'
  | 'logseq.go/search'
  | 'logseq.go/tomorrow'
  | 'logseq.go/backward'
  | 'logseq.go/forward'
  | 'logseq.search/re-index'
  | 'logseq.sidebar/clear'
  | 'logseq.sidebar/open-today-page'
  | 'logseq.ui/goto-plugins'
  | 'logseq.ui/select-theme-color'
  | 'logseq.ui/toggle-brackets'
  | 'logseq.ui/toggle-contents'
  | 'logseq.ui/toggle-document-mode'
  | 'logseq.ui/toggle-help'
  | 'logseq.ui/toggle-left-sidebar'
  | 'logseq.ui/toggle-right-sidebar'
  | 'logseq.ui/toggle-settings'
  | 'logseq.ui/toggle-theme'
  | 'logseq.ui/toggle-wide-mode';
```

---

## Advanced Datascript Queries

### Find Pages Created Today

```typescript
const today = new Date();
const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();

const pages = await logseq.DB.datascriptQuery(`
  [:find (pull ?p [*])
   :in $ ?start
   :where
   [?p :block/name _]
   [?p :block/created-at ?created]
   [(>= ?created ?start)]]
`, startOfDay);
```

### Find Blocks Modified in Last 7 Days

```typescript
const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

const blocks = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [:block/uuid :block/content :block/updated-at])
   :in $ ?since
   :where
   [?b :block/updated-at ?updated]
   [(>= ?updated ?since)]]
`, weekAgo);
```

### Find Orphan Pages (No Backlinks)

```typescript
const orphans = await logseq.DB.datascriptQuery(`
  [:find (pull ?p [:block/name])
   :where
   [?p :block/name _]
   (not [_ :block/refs ?p])]
`);
```

### Count Blocks Per Tag

```typescript
const counts = await logseq.DB.datascriptQuery(`
  [:find ?tag-name (count ?b)
   :where
   [?b :block/refs ?tag]
   [?tag :block/name ?tag-name]]
`);
```

### Find Blocks with Multiple Tags

```typescript
const blocks = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [*])
   :where
   [?b :block/refs ?t1]
   [?b :block/refs ?t2]
   [?t1 :block/name "tag1"]
   [?t2 :block/name "tag2"]]
`);
```

### Find Empty Pages

```typescript
const empty = await logseq.DB.datascriptQuery(`
  [:find (pull ?p [:block/name :block/uuid])
   :where
   [?p :block/name _]
   (not [?b :block/page ?p]
        [?b :block/content ?c]
        [(not= ?c "")])]
`);
```

### Aggregate: Sum Property Values

```typescript
const totals = await logseq.DB.datascriptQuery(`
  [:find (sum ?hours)
   :where
   [?b :block/properties ?props]
   [(get ?props :hours) ?hours]]
`);
```

### Namespace Querying

Properties in plugins are namespaced to avoid conflicts:

```clojure
;; Query namespaced property
{:query [:find (pull ?b [*])
         :where
         [?b :plugin.property.my-plugin/my-prop ?v]
         [(= ?v "value")]]}
```
