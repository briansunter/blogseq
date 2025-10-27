import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppVisible } from '../../../utils';

/**
 * useAppVisible hook test suite
 * Tests UI visibility tracking and event subscriptions
 *
 * NOTE: This hook uses useSyncExternalStore with module-level state (_visible),
 * so test isolation is limited. Tests focus on core functionality.
 */

describe('useAppVisible hook', () => {
  let visibilityHandlers: Array<(...args: any[]) => void> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    visibilityHandlers = [];

    // Mock logseq global API
    (global as any).logseq = {
      isMainUIVisible: true,
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (event === 'ui:visible:changed') {
          visibilityHandlers.push(handler);
        }
      }),
      off: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (event === 'ui:visible:changed') {
          const index = visibilityHandlers.indexOf(handler);
          if (index > -1) {
            visibilityHandlers.splice(index, 1);
          }
        }
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should export useAppVisible hook', () => {
      expect(typeof useAppVisible).toBe('function');
    });

    it('should return a boolean value', () => {
      const { result } = renderHook(() => useAppVisible());

      expect(typeof result.current).toBe('boolean');
    });

    it('should be importable from utils module', () => {
      expect(useAppVisible).toBeDefined();
    });
  });

  describe('Event subscription', () => {
    it('should subscribe to ui:visible:changed event on mount', () => {
      const mockOn = (global as any).logseq.on;

      renderHook(() => useAppVisible());

      expect(mockOn).toHaveBeenCalledWith('ui:visible:changed', expect.any(Function));
    });

    it('should unsubscribe from ui:visible:changed on unmount', () => {
      const mockOff = (global as any).logseq.off;

      const { unmount } = renderHook(() => useAppVisible());

      unmount();

      expect(mockOff).toHaveBeenCalledWith('ui:visible:changed', expect.any(Function));
    });

    it('should handle visibility change events', () => {
      const { result } = renderHook(() => useAppVisible());

      const initialValue = result.current;

      // Trigger visibility change
      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: !initialValue });
        });
      });

      expect(result.current).not.toBe(initialValue);
    });

    it('should update to visible when event indicates visible', () => {
      const { result } = renderHook(() => useAppVisible());

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: true });
        });
      });

      expect(result.current).toBe(true);
    });

    it('should update to hidden when event indicates hidden', () => {
      const { result } = renderHook(() => useAppVisible());

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: false });
        });
      });

      expect(result.current).toBe(false);
    });
  });

  describe('Multiple hook instances', () => {
    it('should share state between multiple hook instances', () => {
      const hook1 = renderHook(() => useAppVisible());
      const hook2 = renderHook(() => useAppVisible());

      // Both should return the same value (shared external store)
      expect(hook1.result.current).toBe(hook2.result.current);

      // Update via event
      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: false });
        });
      });

      // Both should reflect the update
      expect(hook1.result.current).toBe(false);
      expect(hook2.result.current).toBe(false);
    });

    it('should all update when visibility changes', () => {
      const hook1 = renderHook(() => useAppVisible());
      const hook2 = renderHook(() => useAppVisible());
      const hook3 = renderHook(() => useAppVisible());

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: true });
        });
      });

      expect(hook1.result.current).toBe(true);
      expect(hook2.result.current).toBe(true);
      expect(hook3.result.current).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up subscription when unmounted', () => {
      const mockOff = (global as any).logseq.off;
      const { unmount } = renderHook(() => useAppVisible());

      unmount();

      expect(mockOff).toHaveBeenCalled();
    });

    it('should remove handler from handlers array on unmount', () => {
      const { unmount } = renderHook(() => useAppVisible());

      const handlerCountBefore = visibilityHandlers.length;

      unmount();

      expect(visibilityHandlers.length).toBeLessThan(handlerCountBefore);
    });
  });

  describe('Event handling', () => {
    it('should handle multiple rapid visibility changes', () => {
      const { result } = renderHook(() => useAppVisible());

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: false });
          handler({ visible: true });
          handler({ visible: false });
          handler({ visible: true });
        });
      });

      // Should end with last state
      expect(result.current).toBe(true);
    });

    it('should handle visibility toggles correctly', () => {
      const { result } = renderHook(() => useAppVisible());

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: true });
        });
      });
      expect(result.current).toBe(true);

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: false });
        });
      });
      expect(result.current).toBe(false);

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: true });
        });
      });
      expect(result.current).toBe(true);
    });
  });

  describe('useSyncExternalStore integration', () => {
    it('should use external store pattern', () => {
      const { result } = renderHook(() => useAppVisible());

      // Should return a stable value from external store
      expect(result.current).toBeDefined();
    });

    it('should re-render on external store changes', () => {
      const { result } = renderHook(() => useAppVisible());

      const initialRenderCount = result.current;

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: !initialRenderCount });
        });
      });

      // Value should have changed
      expect(result.current).not.toBe(initialRenderCount);
    });
  });

  describe('Subscription lifecycle', () => {
    it('should subscribe only once per hook instance', () => {
      const mockOn = (global as any).logseq.on;
      const callsBefore = mockOn.mock.calls.length;

      renderHook(() => useAppVisible());

      expect(mockOn.mock.calls.length).toBe(callsBefore + 1);
    });

    it('should maintain subscription while mounted', () => {
      const mockOn = (global as any).logseq.on;
      const { rerender } = renderHook(() => useAppVisible());

      const subscriptionCount = mockOn.mock.calls.length;

      rerender();

      // Should not create new subscriptions on rerender
      expect(mockOn.mock.calls.length).toBe(subscriptionCount);
    });
  });

  describe('State consistency', () => {
    it('should maintain consistent state across rerenders', () => {
      const { result, rerender } = renderHook(() => useAppVisible());

      const valueBeforeRerender = result.current;

      rerender();

      expect(result.current).toBe(valueBeforeRerender);
    });

    it('should immediately reflect visibility changes', () => {
      const { result } = renderHook(() => useAppVisible());

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: false });
        });
      });

      expect(result.current).toBe(false);

      act(() => {
        visibilityHandlers.forEach(handler => {
          handler({ visible: true });
        });
      });

      expect(result.current).toBe(true);
    });
  });
});
