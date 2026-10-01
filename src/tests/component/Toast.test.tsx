import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastContext, ToastProvider, useToast } from "../../components/Toast";
import * as stories from "../../components/Toast.stories";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const renderStory = (story: { render?: unknown }) => {
	const Story = story.render as () => React.ReactElement;
	return render(<Story />);
};

describe("Toast story behavior", () => {
	it.each([
		[stories.Success, "Export completed successfully!", "Success Toast"],
		[stories.Error, "Failed to export page. Please try again.", "Error Toast"],
		[stories.Warning, "Please open a page first before exporting", "Warning Toast"],
		[stories.Info, "Copied to clipboard!", "Info Toast"],
		[stories.LongMessage, "This is a very long toast message", "Info Toast"],
	] as const)("automatically shows and dismisses the documented message ($1)", (story, message, button) => {
		renderStory(story);
		expect(screen.queryByText(message, { exact: false })).not.toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(screen.getByText(message, { exact: false })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "✕" }));
		expect(screen.queryByText(message, { exact: false })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: button }));
		expect(screen.getByText(message, { exact: false })).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(4000);
		});
		expect(screen.queryByText(message, { exact: false })).not.toBeInTheDocument();
	});

	it("shows sequential notifications without restarting an effect on every toast", () => {
		renderStory(stories.MultipleToasts);
		const messages = [
			"Starting export process...",
			"Page content processed",
			"Some assets not found",
			"Export failed due to network error",
		];
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(screen.getByText(messages[0])).toBeInTheDocument();
		for (const message of messages.slice(1)) {
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(screen.getByText(message)).toBeInTheDocument();
		}
	});

	it("dismisses only the selected notification when several arrive in the same millisecond", () => {
		renderStory(stories.Interactive);
		for (const label of ["Success", "Error", "Warning", "Info"]) {
			fireEvent.click(screen.getByRole("button", { name: `${label} Toast` }));
		}
		expect(screen.getAllByText("Click any button to test!")).toHaveLength(4);
		fireEvent.click(screen.getAllByRole("button", { name: "✕" })[0]);
		expect(screen.getAllByText("Click any button to test!")).toHaveLength(3);
	});

	it("supports persistent notifications and default info notifications", () => {
		function Controls() {
			const context = useContext(ToastContext)!;
			return (
				<>
					<button type="button" onClick={() => context.addToast("Persistent", "warning", 0)}>
						Persistent
					</button>
					<button type="button" onClick={() => context.addToast("Default")}>
						Default
					</button>
				</>
			);
		}
		render(
			<ToastProvider>
				<Controls />
			</ToastProvider>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Persistent" }));
		fireEvent.click(screen.getByRole("button", { name: "Default" }));
		act(() => {
			vi.advanceTimersByTime(4000);
		});
		expect(screen.getAllByText("Persistent")).toHaveLength(2);
		expect(screen.getAllByText("Default")).toHaveLength(1);
	});

	it("rejects use outside a provider", () => {
		function MissingProvider() {
			useToast();
			return null;
		}
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<MissingProvider />)).toThrow("useToast must be used within ToastProvider");
	});
});
