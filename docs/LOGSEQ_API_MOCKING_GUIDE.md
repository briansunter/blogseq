# Logseq API Mocking Guide

This guide explains how our mock implementation compares to the official Logseq plugin API and how to use it effectively.

## Official Logseq API Reference

### Event System (from @logseq/libs)

The official Logseq `logseq` object is an **EventEmitter** that supports exactly 2 events:

```typescript
type LSPluginUserEvents = 'ui:visible:changed' | 'settings:changed';
```

These are inherited from `EventEmitter<LSPluginUserEvents>`, which provides:
- `on(eventName: string, handler: Function): void`
- `off(eventName: string, handler: Function): void`
- `once(eventName: string, handler: Function): void`
- `emit(eventName: string, ...args: any[]): void`

### Event Payloads

Based on official documentation and code usage:

#### 1. `ui:visible:changed`
Fires when the plugin UI visibility state changes (shown/hidden).
```typescript
logseq.on('ui:visible:changed', (event: { visible: boolean }) => {
  console.log('UI is now', event.visible ? 'visible' : 'hidden');
});
```

#### 2. `settings:changed`
Fires when plugin settings are changed by the user.
```typescript
logseq.on('settings:changed', (newSettings: any, oldSettings: any) => {
  console.log('Settings changed:', newSettings);
});
```

### Main API Namespaces

Our `LogseqAPI` type covers the essential methods:

```typescript
type LogseqAPI = {
  // Editor access
  getCurrentPage: () => Promise<BlockEntity | PageEntity | null>;
  getPage: (uuid: string) => Promise<BlockEntity | PageEntity | null>;
  getBlock: (uuid: string, opts?: { includeChildren?: boolean }) => Promise<BlockEntity | null>;
  getPageBlocksTree: (pageUuid: string) => Promise<BlockEntity[]>;

  // Graph information
  getCurrentGraph: () => Promise<{ path: string } | null>;

  // Database queries
  datascriptQuery: (query: string) => Promise<unknown[][]>;

  // UI notifications
  showMsg: (message: string, type: 'success' | 'error' | 'warning') => void;
}
```

## Our Mock Implementation

### Architecture

**File**: `src/testing/mock-logseq-sdk/MockLogseqAPI.ts`

The `MockLogseqAPI` class provides:

1. **Full LogseqAPI implementation** - All methods from the official API
2. **Event system** - `on()`, `off()`, `emit()` for triggering events
3. **State management** - Pages, blocks, assets, properties
4. **Query patterns** - DataScript query matching and mocking
5. **Error simulation** - Throw errors on specific calls
6. **Timing simulation** - Add delays to methods
7. **Call tracking** - Verify what methods were called

### Public Methods

#### Event Handling

```typescript
// Register event handler
on(eventName: string, handler: EventHandler): void

// Unregister event handler
off(eventName: string, handler: EventHandler): void

// Emit event to all handlers (async)
async emit(eventName: string, ...args: unknown[]): Promise<void>

// Get all handlers for an event
getHandlers(eventName: string): EventHandler[]

// Get handler count
getHandlerCount(eventName: string): number

// Clear handlers for an event or all events
clearHandlers(eventName?: string): this
```

#### State Management

```typescript
// Set current page
setCurrentPage(page: PageEntity | null): this

// Add pages/blocks to state
addPage(page: PageEntity): this
addBlock(block: BlockEntity): this
addAsset(uuid: string, type: string, entity: PageEntity | BlockEntity): this

// Set graph information
setCurrentGraph(graph: { path: string; name?: string } | null): this

// Add property definitions (for property queries)
addPropertyDefinition(ident: string, title: string): this

// Add custom DataScript query patterns
addQueryPattern(pattern: RegExp | string, handler: (query, state) => unknown[][]): this
```

#### Error & Timing Simulation

```typescript
// Throw error on next call
throwOnNextCall(method: keyof LogseqAPI, error?: Error): this

// Throw error after N calls
throwAfterNCalls(method: keyof LogseqAPI, n: number, error?: Error): this

// Clear error simulation
clearErrorSimulation(method: keyof LogseqAPI): this

// Add response delay
delayResponse(method: keyof LogseqAPI, delayMs: number): this

// Clear timing simulation
clearTimingSimulation(method: keyof LogseqAPI): this
```

#### Call Verification

```typescript
// Check if method was called
wasCalled(method: keyof typeof calls): boolean

// Check if called with specific args
wasCalledWith(method: 'getPage' | 'getBlock' | 'getPageBlocksTree', ...args: unknown[]): boolean

// Get call count
getCallCount(method: keyof typeof calls): number

// Get all calls to a method
getCalls(method: keyof typeof calls): unknown[]
```

#### Query Inspection

```typescript
// Get last DataScript query
getLastQuery(): string | undefined

// Get full query history
getQueryHistory(): Array<{ query: string; result: unknown[][]; timestamp: number }>

// Get queries matching pattern
getQueriesMatching(pattern: RegExp | string): string[]

// Clear query history
clearQueryHistory(): this
```

#### State Inspection

```typescript
// Get all entities
getPages(): PageEntity[]
getBlocks(): BlockEntity[]
getAssets(): Array<{ uuid: string; type: string; entity: PageEntity | BlockEntity }>

// Get counts
getPageCount(): number
getBlockCount(): number
getAssetCount(): number

// Check existence
hasPage(uuid: string): boolean
hasBlock(uuid: string): boolean
hasAsset(uuid: string): boolean

// Get entire state
getState(): MockLogseqState
getMessages(): Array<{ message: string; type: string }>
```

## Usage Examples

### In Tests (Vitest)

#### Basic Setup

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('my component', () => {
  beforeEach(() => {
    // Reset logseq mocks before each test
    vi.clearAllMocks();
  });

  it('handles UI visibility events', async () => {
    let handlers: any[] = [];
    logseq.on = vi.fn((event, handler) => {
      handlers.push(handler);
    });

    // Your component registers the event
    useAppVisible(); // Component that uses logseq.on()

    // Verify handler was registered
    expect(logseq.on).toHaveBeenCalledWith('ui:visible:changed', expect.any(Function));

    // Simulate the event
    await act(() => {
      handlers[0]({ visible: true });
    });

    // Verify component state updated
    expect(componentVisible).toBe(true);
  });
});
```

#### With MockLogseqAPI

```typescript
import { MockLogseqAPI } from '@/testing/mock-logseq-sdk';

describe('markdown exporter', () => {
  it('exports page to markdown', async () => {
    const mock = new MockLogseqAPI();

    // Setup test data
    mock.setCurrentGraph({ path: '/test', name: 'Test' })
      .addPage({ uuid: 'page-1', name: 'Test Page', children: [] })
      .addPropertyDefinition(':user.property/author', 'author');

    // Use mock in your code
    (window as any).logseq = mock;

    // Run your export logic
    const result = await exportPage('page-1');

    // Verify
    expect(mock.wasCalled('getCurrentPage')).toBe(true);
    expect(mock.getLastQuery()).toContain('asset');
  });
});
```

### In Storybook

#### Basic Story

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { globalMockLogseq } from '.storybook/preview';

export default {
  title: 'Components/ExportPanel',
  component: ExportPanel,
} satisfies Meta<typeof ExportPanel>;

export const Default: StoryObj = {
  render: () => <ExportPanel />,
};
```

#### Story with Custom Setup

```typescript
export const WithPageLoaded: StoryObj = {
  parameters: {
    mockLogseq: {
      setup: (mock) => {
        // Setup test data
        mock.setCurrentPage({
          uuid: 'page-1',
          name: 'My Article',
          children: [
            {
              uuid: 'block-1',
              content: 'Introduction text',
              children: [],
            },
          ],
        });
      },
    },
  },
};
```

#### Story with Event Simulation

```typescript
export const UIVisibilityEvent: StoryObj = {
  parameters: {
    mockLogseq: {
      setup: (mock) => {
        // Component should listen to this event
        mock.on('ui:visible:changed', ({ visible }) => {
          console.log('UI visibility changed:', visible);
        });

        // Later, emit the event
        setTimeout(() => {
          mock.emit('ui:visible:changed', { visible: true });
        }, 1000);
      },
    },
  },
};
```

## Alignment with Official API

| Feature | Official | Our Mock | Notes |
|---------|----------|----------|-------|
| `on(event, handler)` | ✅ EventEmitter | ✅ Full | Supports any event name (more flexible) |
| `off(event, handler)` | ✅ EventEmitter | ✅ Full | Complete deregistration support |
| `ui:visible:changed` | ✅ Official event | ✅ Testable | Can emit for testing |
| `settings:changed` | ✅ Official event | ✅ Testable | Can emit for testing |
| Editor API | ✅ 7 methods | ✅ 4 methods | Covers what BlogSeq uses |
| DB API | ✅ DataScript | ✅ Pattern matching | Flexible query simulation |
| Error simulation | ❌ Real errors | ✅ Full | Testing feature |
| Timing simulation | ❌ Real delays | ✅ Full | Testing feature |
| Call tracking | ❌ N/A | ✅ Full | Testing/debugging feature |

## Testing Best Practices

### 1. Reset Between Tests
```typescript
beforeEach(() => {
  mock.reset(); // Clear all state and handlers
});
```

### 2. Use Seeds for Complex Setup
```typescript
const mock = new MockLogseqAPI();

// ... complex setup ...

mock.saveSeed(); // Save state

// Later, reset to this state
mock.reset(); // Restores from seed
```

### 3. Verify Event Flow
```typescript
// Verify handlers registered
expect(mock.getHandlerCount('ui:visible:changed')).toBe(1);

// Verify event emissions
await mock.emit('ui:visible:changed', { visible: true });
expect(someComponent.isVisible).toBe(true);
```

### 4. Test Error Handling
```typescript
mock.throwOnNextCall('getCurrentPage', new Error('Graph unavailable'));

await expect(() => exportPage()).rejects.toThrow('Graph unavailable');
```

## Differences from Official API

Our implementation is **more powerful** than the official API for testing:

1. **`emit()` method** - Official API doesn't expose this, but our mock does
2. **Error simulation** - Throw errors on demand for error testing
3. **Timing simulation** - Add delays to test async behavior
4. **Call tracking** - Verify method calls and arguments
5. **Query inspection** - See all DataScript queries executed
6. **State inspection** - Access internal state for verification

All of these are testing-specific features that don't exist in the real plugin.

## Migration from Other Mocks

If migrating from other test utilities:

```typescript
// Old: Direct vi.fn() calls
logseq.on = vi.fn();

// New: Use MockLogseqAPI
const mock = new MockLogseqAPI();
(window as any).logseq = mock;
```

The MockLogseqAPI is backward compatible with simple mock patterns but provides much more power.

## References

- Official @logseq/libs: https://github.com/logseq/logseq
- Plugin API docs: https://plugins-doc.logseq.com
- Plugin samples: https://github.com/logseq/logseq-plugin-samples
- Our mock: `src/testing/mock-logseq-sdk/MockLogseqAPI.ts`
