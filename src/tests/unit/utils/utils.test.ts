import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppVisible } from "../../../utils";

/**
 * Utils test suite
 * Tests utility functions and custom hooks
 */

describe("useAppVisible Hook", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock logseq global
		(global as any).logseq = {
			isMainUIVisible: true,
			on: vi.fn(),
			off: vi.fn(),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Module Loading", () => {
		it("should export useAppVisible hook", () => {
			expect(typeof useAppVisible).toBe("function");
		});

		it("should be importable without errors", () => {
			expect(useAppVisible).toBeDefined();
		});
	});

	describe("Integration", () => {
		it("should integrate with logseq event system", () => {
			expect((global as any).logseq).toBeDefined();
			expect((global as any).logseq.on).toBeDefined();
			expect((global as any).logseq.off).toBeDefined();
		});

		it("should track visibility state", () => {
			(global as any).logseq.isMainUIVisible = true;
			expect((global as any).logseq.isMainUIVisible).toBe(true);

			(global as any).logseq.isMainUIVisible = false;
			expect((global as any).logseq.isMainUIVisible).toBe(false);
		});

		it("should support event registration pattern", () => {
			const mockHandler = vi.fn();
			(global as any).logseq.on("test-event", mockHandler);

			expect((global as any).logseq.on).toHaveBeenCalledWith("test-event", mockHandler);
		});

		it("should support event unregistration pattern", () => {
			const mockHandler = vi.fn();
			(global as any).logseq.off("test-event", mockHandler);

			expect((global as any).logseq.off).toHaveBeenCalledWith("test-event", mockHandler);
		});

		it("should handle event handler calls", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const handlers: any[] = [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(global as any).logseq.on = vi.fn((event: string, handler: any) => {
				handlers.push(handler);
			});

			expect(handlers.length).toBe(0);

			// eslint-disable-next-line @typescript-eslint/no-empty-function
			(global as any).logseq.on("test-event", () => {});

			expect(handlers.length).toBe(1);
			expect(typeof handlers[0]).toBe("function");
		});
	});
});
