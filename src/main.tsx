import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { logseq as PL } from "../package.json";
import { settingsSchema } from "./settings";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const pluginId = PL.id;

function main() {
	console.info(`#${pluginId}: MAIN`);

	// Register settings schema
	logseq.useSettingsSchema(settingsSchema);

	const root = ReactDOM.createRoot(document.getElementById("app")!);

	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);

	function createModel() {
		return {
			show() {
				logseq.showMainUI();
			},
			async exportPage() {
				// Trigger export from App component
				window.dispatchEvent(new CustomEvent("logseq-export-page"));
			},
		};
	}

	logseq.provideModel(createModel());
	logseq.setMainUIInlineStyle({
		zIndex: 11,
	});

	const openIconName = "blogseq-export-open";
	const exportIconName = "blogseq-export-action";

	logseq.provideStyle(css`
    .${openIconName}, .${exportIconName} {
      font-size: 20px;
      margin-top: 4px;
      margin-left: 8px;
      margin-right: 8px;
    }

    .${openIconName}:hover, .${exportIconName}:hover {
      opacity: 0.9;
    }

    .${openIconName} svg,
    .${exportIconName} svg {
      width: 20px;
      height: 20px;
      display: block;
    }
  `);

	// Main UI button
	logseq.App.registerUIItem("toolbar", {
		key: openIconName,
		template: `
    <a data-on-click="show" title="BlogSeq Export">
        <div class="${openIconName}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5v6.75a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V9.75a1.5 1.5 0 0 1 1.5-1.5H12"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 3.75h-5.25M21 3.75v5.25M21 3.75L10.5 14.25"/>
          </svg>
        </div>
    </a>    
`,
	});

	// Quick export button
	logseq.App.registerUIItem("toolbar", {
		key: exportIconName,
		template: `
    <a data-on-click="exportPage" title="Quick Export Current Page">
        <div class="${exportIconName}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 10.5L12 15l4.5-4.5"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15V3"/>
          </svg>
        </div>
    </a>    
`,
	});

	// Register slash command for export
	logseq.Editor.registerSlashCommand("Export page to markdown", async () => {
		const { exporter } = await import("./markdownExporter");
		const { getExportSettings } = await import("./settings");
		try {
			const settings = getExportSettings();
			const markdown = await exporter.exportCurrentPage(settings);
			await exporter.downloadAsZip(markdown, undefined, settings.assetPath);
			logseq.UI.showMsg("Page exported as ZIP successfully!", "success");
		} catch (error) {
			console.error("Export failed:", error);
			logseq.UI.showMsg("Export failed. Check console for details.", "error");
		}
	});

	// Register page menu item
	logseq.App.registerPageMenuItem("Export to Markdown", async () => {
		const { exporter } = await import("./markdownExporter");
		const { getExportSettings } = await import("./settings");
		try {
			const settings = getExportSettings();
			const markdown = await exporter.exportCurrentPage(settings);
			await exporter.downloadAsZip(markdown, undefined, settings.assetPath);
			logseq.UI.showMsg("Page exported as ZIP successfully!", "success");
		} catch (error) {
			console.error("Export failed:", error);
			logseq.UI.showMsg("Export failed. Check console for details.", "error");
		}
	});
}

logseq.ready(main).catch(console.error);
