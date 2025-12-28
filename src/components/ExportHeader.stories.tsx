import type { Meta, StoryObj } from "@storybook/react";
import { ExportHeader } from "./ExportHeader";

/**
 * The ExportHeader component displays the application title, current page name,
 * and export controls. It's shown at the top of the BlogSeq export UI.
 */
const meta = {
	title: "Components/ExportHeader",
	component: ExportHeader,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		currentPageName: {
			control: "text",
			description: "Name of the page being exported",
		},
		isExporting: {
			control: "boolean",
			description: "Whether export is in progress",
		},
	},
	args: {
		onQuickExport: () => console.log("Quick export clicked"),
		onClose: () => console.log("Close clicked"),
	},
} satisfies Meta<typeof ExportHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state with a page loaded and ready to export
 */
export const Default: Story = {
	args: {
		currentPageName: "My First Blog Post",
		isExporting: false,
	},
};

/**
 * Export in progress - button shows spinner and is disabled
 */
export const Exporting: Story = {
	args: {
		currentPageName: "My First Blog Post",
		isExporting: true,
	},
};

/**
 * No active page - shows warning message and export button is disabled
 */
export const NoActivePage: Story = {
	args: {
		currentPageName: "",
		isExporting: false,
	},
};

/**
 * Long page name - tests text overflow handling
 */
export const LongPageName: Story = {
	args: {
		currentPageName:
			"This is a very long page name that might overflow the container if not properly handled with CSS truncation",
		isExporting: false,
	},
};

/**
 * Page with special characters
 */
export const SpecialCharactersInName: Story = {
	args: {
		currentPageName: "🚀 2024/01/15 - Blog Post #42 [Draft]",
		isExporting: false,
	},
};

/**
 * Export in progress with no page (edge case)
 */
export const ExportingWithoutPage: Story = {
	args: {
		currentPageName: "",
		isExporting: true,
	},
};
