# Storybook Integration - Final Solution

## Overview

This document describes the final, working solution for Storybook data loading and auto-export prevention.

## The Challenge

Storybook needed to:
1. Display component with test data (pages/blocks)
2. Make the component render (visibility = true)
3. NOT trigger auto-export (which shows toast loop)
4. NOT break any of the 601 existing tests

## The Solution

### 1. Global Storybook Mode Flag

**`.storybook/preview.tsx` (top of file):**
```typescript
// Set Storybook mode flag globally so App component detects it
(window as any).__STORYBOOK_MODE__ = true;
```

This flag is set BEFORE any components load, so it's available globally.

### 2. App Component - Auto-Export Prevention

**`src/App.tsx` (in visibility useEffect):**
```typescript
useEffect(() => {
  if (!visible) return;

  // Skip auto-export in Storybook/test environments
  const isStorybook = typeof window !== 'undefined' &&
    (window as any).__STORYBOOK_MODE__ === true;
  if (isStorybook) return;

  // ... auto-export logic only runs in real Logseq
}, [visible, loadCurrentPage, handleExportWithUI]);
```

This checks the flag and skips auto-export when running in Storybook.

### 3. Hook - Simple Event-Based Design

**`src/utils.ts`:**
```typescript
let _visible = (typeof logseq !== 'undefined' && (logseq as any).isMainUIVisible) ?? false;

const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent("ui:visible:changed", (...args: unknown[]) => {
    const event = args[0] as { visible: boolean };
    _visible = event.visible;
    onChange();
  });

export const useAppVisible = () => {
  return useSyncExternalStore(subscribeToUIVisible, () => _visible);
};
```

The hook:
- Initializes from the property if available
- Subscribes to events
- Uses a simple snapshot function

### 4. Storybook Wrapper - Visibility Initialization

**`.storybook/preview.tsx` (StoryWithVisibility component):**
```typescript
function StoryWithVisibility({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Set the property
    (globalMockLogseq as any).isMainUIVisible = true;
    // Emit event to trigger hook updates
    // Auto-export is skipped in Storybook, so no toast loop
    globalMockLogseq.emit('ui:visible:changed', { visible: true }).catch(err => {
      console.error('Failed to emit visibility event:', err);
    });
  }, []);

  return <>{children}</>;
}
```

This:
- Sets the property for any fallback checks
- Emits the visibility event
- Wraps all stories in the decorator

## How It Works

### Execution Flow in Storybook

1. **Preview loads** → Sets `__STORYBOOK_MODE__ = true` globally
2. **Story renders** → App component mounts
3. **useAppVisible hook mounts** → Subscribes to `ui:visible:changed` event
4. **Component renders** → App checks `visible` which is still `false`
5. **Component returns null** (since not visible)
6. **StoryWithVisibility useEffect runs** → Emits `ui:visible:changed` event
7. **Hook event handler runs** → Sets `_visible = true` → Triggers re-render
8. **App re-renders** → Now `visible = true` → Component renders with data
9. **Auto-export effect runs** → Checks `__STORYBOOK_MODE__` → Skips auto-export
10. **No toast loop** ✅ → Component displays cleanly with data

### Why Each Part Is Needed

| Part | Why Needed |
|------|-----------|
| `__STORYBOOK_MODE__` flag | So App component can detect Storybook without checking property on every render |
| Event emission | To update hook state and trigger re-render |
| Property setting | Fallback for any code that checks it directly |
| Event subscription | To handle changes in real Logseq |
| Simple snapshot | To keep tests working (no constant property checking) |

## Test Compatibility

**Why tests don't break:**
- Tests run in Node.js with jsdom/happy-dom
- Tests set up `logseq.on` and `logseq.off` mocks
- Tests emit events to trigger visibility changes
- No code checks `__STORYBOOK_MODE__` in tests (it's never set)
- All 601 tests pass ✅

**Example test pattern:**
```typescript
let handlers: any[] = [];
logseq.on = vi.fn((event, handler) => {
  if (event === 'ui:visible:changed') {
    handlers.push(handler);
  }
});

// Later: emit the event
act(() => {
  handlers.forEach(h => h({ visible: true }));
});
```

## Production Behavior

**In real Logseq:**
- `__STORYBOOK_MODE__` is never set
- Auto-export works normally
- Component shows toast on visibility changes
- Everything works as designed

## Key Files

1. **`.storybook/preview.tsx`** - Sets mode flag, creates wrapper, configures decorator
2. **`src/App.tsx`** - Checks flag to skip auto-export in Storybook
3. **`src/utils.ts`** - Simple event-driven hook

## Verification Results

```
✅ All 601 tests pass
✅ Storybook builds without errors
✅ Stories display with proper test data
✅ No toast loops in Storybook
✅ Manual export button works in Storybook
✅ Real Logseq plugin unaffected
```

## Debugging Tips

If something breaks:

1. **Toast still looping?** → Check `__STORYBOOK_MODE__` is being set
2. **Component not showing?** → Check event is being emitted
3. **Tests failing?** → Check for any property checking in snapshot
4. **Real Logseq broken?** → Verify `__STORYBOOK_MODE__` isn't affecting production

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│ Storybook Preview                       │
│                                         │
│ • Set __STORYBOOK_MODE__ = true         │
│ • Create Mock API (globalMockLogseq)    │
│ • Decorator wraps with StoryWithVisibility
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Story Renders                           │
│                                         │
│ 1. App component mounts                 │
│ 2. useAppVisible hook subscribes        │
│ 3. visible = false → return null        │
│ 4. StoryWithVisibility useEffect runs   │
│ 5. Emits ui:visible:changed event       │
│ 6. Hook handler updates _visible = true │
│ 7. App re-renders with visible = true   │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Component Renders                       │
│                                         │
│ • Visibility check passes (visible=true)
│ • Auto-export effect runs               │
│ • Checks __STORYBOOK_MODE__ → true      │
│ • Skips auto-export                     │
│ • Component displays data cleanly       │
│ • No toast loops ✅                     │
└─────────────────────────────────────────┘
```

## Future Improvements

Potential enhancements:
1. Add parameter to disable auto-export on story basis
2. Add story parameter for initial export state
3. Create story interaction addon for manual export testing
4. Add visual indicators in Storybook showing mock state

## References

- Main App: `src/App.tsx` (lines 110-125)
- Hook: `src/utils.ts`
- Storybook config: `.storybook/preview.tsx`
- Stories: `src/components/*.stories.tsx`
- Mock API: `src/testing/mock-logseq-sdk/MockLogseqAPI.ts`
