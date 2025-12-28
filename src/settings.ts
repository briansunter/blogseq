import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";
import { ExportSettings } from "./types";

export const settingsSchema: SettingSchemaDesc[] = [
	{
		key: "includePageName",
		type: "boolean",
		default: false,
		title: "Include Page Name",
		description: "Add the page name as an H1 header at the top of the exported markdown",
	},
	{
		key: "flattenNested",
		type: "boolean",
		default: true,
		title: "Flatten Nested Blocks",
		description: "Flatten nested blocks into paragraphs instead of maintaining indentation",
	},
	{
		key: "preserveBlockRefs",
		type: "boolean",
		default: true,
		title: "Preserve Block References",
		description: "Resolve ((uuid)) block references in the exported content",
	},
	{
		key: "includeProperties",
		type: "boolean",
		default: true,
		title: "Include Properties as Frontmatter",
		description: "Export page properties as YAML frontmatter at the beginning of the markdown file",
	},
	{
		key: "assetPath",
		type: "string",
		default: "assets/",
		title: "Asset Path",
		description: "Relative path to use for asset references in the exported markdown",
	},
	{
		key: "debug",
		type: "boolean",
		default: false,
		title: "Debug Mode",
		description:
			"Enable debug logging to see detailed asset resolution information in the browser console",
	},
];

export function getExportSettings(): ExportSettings {
	const settings = (logseq.settings || {}) as Record<string, unknown>;
	return {
		includePageName:
			settings["includePageName"] !== undefined ? Boolean(settings["includePageName"]) : false,
		flattenNested:
			settings["flattenNested"] !== undefined ? Boolean(settings["flattenNested"]) : true,
		preserveBlockRefs:
			settings["preserveBlockRefs"] !== undefined ? Boolean(settings["preserveBlockRefs"]) : true,
		includeProperties:
			settings["includeProperties"] !== undefined ? Boolean(settings["includeProperties"]) : true,
		assetPath: typeof settings["assetPath"] === "string" ? settings["assetPath"] : "assets/",
		debug: settings["debug"] !== undefined ? Boolean(settings["debug"]) : false,
	};
}

export function updateExportSetting(key: keyof ExportSettings, value: unknown): void {
	logseq.updateSettings({ [key]: value });
}
