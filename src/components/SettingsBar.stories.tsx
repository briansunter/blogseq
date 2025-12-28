import type { Meta, StoryObj } from "@storybook/react";
import { ExportSettings } from "../types";
import { SettingsBar } from "./SettingsBar";

/**
 * The SettingsBar component allows users to configure export options
 * such as including page headers, flattening nested blocks, preserving references,
 * and setting the asset path.
 */
const meta = {
	title: "Components/SettingsBar",
	component: SettingsBar,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		settings: {
			control: "object",
			description: "Current export settings configuration",
		},
	},
	args: {
		onSettingChange: (key: keyof ExportSettings) => console.log("Setting changed:", key),
		onAssetPathChange: (value: string) => console.log("Asset path changed:", value),
	},
} satisfies Meta<typeof SettingsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSettings: ExportSettings = {
	includePageName: false,
	flattenNested: true,
	preserveBlockRefs: true,
	includeProperties: true,
	assetPath: "assets/",
	debug: false,
};

/**
 * Default settings configuration - most common use case
 */
export const Default: Story = {
	args: {
		settings: defaultSettings,
	},
};

/**
 * All options enabled
 */
export const AllEnabled: Story = {
	args: {
		settings: {
			includePageName: true,
			flattenNested: true,
			preserveBlockRefs: true,
			includeProperties: true,
			assetPath: "assets/",
			debug: true,
		},
	},
};

/**
 * All options disabled
 */
export const AllDisabled: Story = {
	args: {
		settings: {
			includePageName: false,
			flattenNested: false,
			preserveBlockRefs: false,
			includeProperties: false,
			assetPath: "assets/",
			debug: false,
		},
	},
};

/**
 * Debug mode enabled - useful for troubleshooting exports
 */
export const DebugMode: Story = {
	args: {
		settings: {
			...defaultSettings,
			debug: true,
		},
	},
};

/**
 * Custom asset path - relative path
 */
export const CustomAssetPath: Story = {
	args: {
		settings: {
			...defaultSettings,
			assetPath: "../images/",
		},
	},
};

/**
 * Absolute asset path
 */
export const AbsoluteAssetPath: Story = {
	args: {
		settings: {
			...defaultSettings,
			assetPath: "/static/blog-assets/",
		},
	},
};

/**
 * Minimal export - only essential content
 */
export const MinimalExport: Story = {
	args: {
		settings: {
			includePageName: false,
			flattenNested: true,
			preserveBlockRefs: false,
			includeProperties: false,
			assetPath: "",
			debug: false,
		},
	},
};

/**
 * Maximum fidelity export - preserves all Logseq features
 */
export const MaximumFidelity: Story = {
	args: {
		settings: {
			includePageName: true,
			flattenNested: false,
			preserveBlockRefs: true,
			includeProperties: true,
			assetPath: "assets/",
			debug: false,
		},
	},
};
