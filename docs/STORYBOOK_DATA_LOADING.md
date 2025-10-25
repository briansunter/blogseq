# Storybook Data Loading - Fix Summary

## Problem

Storybook stories were not displaying data even though test pages and blocks were being set up in the `mockLogseq.setup` functions.

## Root Cause

The `useAppVisible()` hook uses `_visible` module-level state that is initialized at import time:

```typescript
let _visible = (typeof logseq !== 'undefined' && (logseq as any).isMainUIVisible) ?? false;
```

**Timeline of the issue:**
1. Module loads: `logseq` is not yet defined → `_visible` becomes `false`
2. Storybook decorator runs: Creates and installs the mock logseq object
3. Story renders: App component mounts and calls `useAppVisible()`
4. Hook returns stale `_visible = false` → App component returns null (won't render)

The App component conditionally returns null if not visible:
```typescript
if (!visible) return null;
```

## Solution

### 1. StoryWithVisibility Wrapper Component

Created a React component that emits the visibility event on mount:

```typescript
function StoryWithVisibility({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Emit visibility event on mount to initialize the hook state
    globalMockLogseq.emit('ui:visible:changed', { visible: true }).catch(err => {
      console.error('Failed to emit visibility event:', err);
    });
  }, []);

  return <>{children}</>;
}
```

This allows the event handler registered by `useAppVisible()` hook to properly update `_visible` to true.

### 2. Updated Decorator Logic

The Storybook decorator now:
1. Resets and configures the mock
2. Applies story-specific setup (adds pages/blocks)
3. Ensures current page is set if data was added
4. Wraps the Story with `StoryWithVisibility` to emit visibility event on mount

```typescript
const showUI = context.parameters.mockLogseq?.showUI !== false;

return (
  <div className="storybook-container" style={{ minHeight: "100vh" }}>
    {showUI ? (
      <StoryWithVisibility>
        {withToast ? (
          <ToastProvider>
            <Story />
          </ToastProvider>
        ) : (
          <Story />
        )}
      </StoryWithVisibility>
    ) : (
      // ... no UI case
    )}
  </div>
);
```

### 3. Event-Driven State Management

The solution leverages the event-driven nature of `useAppVisible()`:

**Execution flow in Storybook:**
1. StoryWithVisibility mounts
2. useEffect runs and emits `'ui:visible:changed'` event with `{ visible: true }`
3. useAppVisible hook's event handler receives the event
4. Handler updates `_visible = true`
5. useSyncExternalStore triggers re-render
6. App component now sees `visible = true` and renders content
7. App calls `logseq.Editor.getCurrentPage()` to load the current page
8. Page data displays in the story

## Why This Works

- **Event-based:** Uses the same event system as the real Logseq API
- **Test-compatible:** Tests emit events directly, Storybook emits them on mount
- **Lazy initialization:** `_visible` only updates when events are received or hooks register
- **No property checking:** Avoids the test-breaking issue of checking `logseq.isMainUIVisible` on every render

## Files Modified

1. **`.storybook/preview.tsx`**
   - Added `StoryWithVisibility` component
   - Updated decorator to wrap stories with visibility initializer
   - Removed direct property setting in favor of event emission

2. **`src/utils.ts`**
   - Kept original implementation (no changes needed)
   - Event-driven approach works naturally

## Verification

- ✅ All 601 tests pass
- ✅ Storybook builds successfully
- ✅ All 9 story variants display with proper data:
  - Default (simple page)
  - RichContent (formatting/lists)
  - NestedBlocks (hierarchical structure)
  - WithBlockReferences (block refs)
  - WithFrontmatter (YAML properties)
  - EmptyPage (edge case)
  - NoActivePage (warning state)
  - LongPage (content-heavy)
  - SpecialCharacters (emoji/special chars)

## Technical Details

### Event Handler Registration

When `useAppVisible()` hook mounts:
```typescript
const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent("ui:visible:changed", (...args: unknown[]) => {
    const event = args[0] as { visible: boolean };
    _visible = event.visible;  // <-- Updates stale state
    onChange();               // <-- Triggers re-render
  });
```

### MockLogseqAPI Emit Method

Supports async event delivery with proper error handling:
```typescript
async emit(eventName: string, ...args: unknown[]): Promise<void> {
  const handlers = this.eventHandlers.get(eventName);
  if (!handlers) return;

  for (const handler of handlers) {
    try {
      await handler(...args);
    } catch (error) {
      console.error(`Error in event handler for "${eventName}":`, error);
    }
  }
}
```

## Best Practices Going Forward

1. **Stories setup pattern** - Always set up pages/blocks in `mockLogseq.setup`
2. **Block tree required** - Call `mockAPI.setPageBlocksTree()` for pages with content
3. **Default UI visible** - UI is visible by default in Storybook (set `showUI: false` to hide)
4. **Event-driven testing** - Emit events for interactive behavior testing

## References

- Main hook: `src/utils.ts`
- Component using hook: `src/App.tsx`
- Mock implementation: `src/testing/mock-logseq-sdk/MockLogseqAPI.ts`
- Storybook config: `.storybook/preview.tsx`
- Stories: `src/components/*.stories.tsx`
