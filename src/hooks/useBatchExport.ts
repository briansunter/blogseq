import { saveAs } from "file-saver";
import JSZip from "jszip";
import { useCallback, useState } from "react";
import { createExporter, normalizeAssetPath } from "../markdownExporter";
import { getExportSettings } from "../settings";

export interface BatchExportResult {
	pageName: string;
	success: boolean;
	markdown?: string;
	error?: string;
}

export const useBatchExport = () => {
	const [isBatchExporting, setBatchExporting] = useState(false);
	const [batchProgress, setBatchProgress] = useState(0);
	const [batchTotal, setBatchTotal] = useState(0);

	const exportPagesToZip = useCallback(async (pageNames: string[]) => {
		if (!pageNames.length) return null;

		setBatchExporting(true);
		setBatchTotal(pageNames.length);
		setBatchProgress(0);

		try {
			const zip = new JSZip();
			const results: BatchExportResult[] = [];
			const addedAssets = new Set<string>();
			const settings = { ...getExportSettings(), includePageName: true, includeProperties: false };
			const assetFolderName = normalizeAssetPath(settings.assetPath).slice(0, -1);

			for (let i = 0; i < pageNames.length; i++) {
				const pageName = pageNames[i];

				try {
					// Get page by name (accepts string or UUID)
					const page = await logseq.Editor.getPage(
						pageName as Parameters<typeof logseq.Editor.getPage>[0],
					);

					if (!page) {
						results.push({
							pageName,
							success: false,
							error: "Page not found",
						});
						setBatchProgress(i + 1);
						continue;
					}

					const exporter = createExporter();
					const markdown = await exporter.exportPage(pageName, settings);

					zip.file(`${pageName}.md`, markdown);

					if (exporter.getReferencedAssets().size > 0) {
						const assetsFolder = zip.folder(assetFolderName);
						for (const [uuid, assetInfo] of exporter.getReferencedAssets()) {
							if (addedAssets.has(uuid)) continue;

							try {
								const response = await fetch(`file://${assetInfo.originalPath}`);
								if (!response.ok) continue;

								assetsFolder?.file(`${uuid}.${assetInfo.type}`, await response.blob());
								addedAssets.add(uuid);
							} catch {
								// Continue batch export even if an individual asset fails
							}
						}
					}

					results.push({
						pageName,
						success: true,
						markdown,
					});
				} catch (error) {
					results.push({
						pageName,
						success: false,
						error: error instanceof Error ? error.message : String(error),
					});
				}

				setBatchProgress(i + 1);
			}

			const blob = await zip.generateAsync({ type: "blob" });
			const timestamp = new Date().toISOString().slice(0, 10);
			saveAs(blob, `logseq-export-${timestamp}.zip`);

			return results;
		} finally {
			setBatchExporting(false);
			setBatchProgress(0);
			setBatchTotal(0);
		}
	}, []);

	return {
		isBatchExporting,
		batchProgress,
		batchTotal,
		exportPagesToZip,
	};
};
