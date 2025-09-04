import { useState, useCallback } from "react";
import { exporter } from "../markdownExporter";
import { Asset, ExportSettings } from "../types";

export const useExport = (settings: ExportSettings) => {
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [graphPath, setGraphPath] = useState("");

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const markdown = await exporter.exportCurrentPage(settings);
      setPreview(markdown);
      
      const referencedAssets = exporter.getReferencedAssets();
      const path = exporter.getGraphPath();
      
      const assetsList: Asset[] = Array.from(referencedAssets.entries()).map(([uuid, info]) => ({
        fileName: `${uuid}.${info.type}`,
        fullPath: `${path}/assets/${uuid}.${info.type}`,
        title: info.title || `${uuid}.${info.type}`
      }));
      
      setAssets(assetsList);
      setGraphPath(path);
      return { success: true, markdown };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    } finally {
      setIsExporting(false);
    }
  }, [settings]);

  const quickExport = useCallback(async () => {
    try {
      const markdown = await exporter.exportCurrentPage(settings);
      await exporter.downloadAsZip(markdown, undefined, settings.assetPath);
      logseq.UI.showMsg("Page exported as ZIP successfully!", "success");
      window.logseq.hideMainUI();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === "NO_ACTIVE_PAGE") {
        logseq.UI.showMsg("⚠️ Please open a page first before exporting", "warning");
      } else {
        logseq.UI.showMsg("Export failed. Check console for details.", "error");
      }
      window.logseq.hideMainUI();
    }
  }, [settings]);

  const downloadMarkdown = useCallback(async () => {
    if (preview) {
      await exporter.downloadMarkdown(preview);
      logseq.UI.showMsg("Markdown downloaded!", "success");
    }
  }, [preview]);

  const copyToClipboard = useCallback(async () => {
    if (preview) {
      await exporter.copyToClipboard(preview);
    }
  }, [preview]);

  const downloadAsZip = useCallback(async () => {
    if (preview) {
      await exporter.downloadAsZip(preview, undefined, settings.assetPath);
    }
  }, [preview, settings.assetPath]);

  return {
    isExporting,
    preview,
    assets,
    graphPath,
    handleExport,
    quickExport,
    downloadMarkdown,
    copyToClipboard,
    downloadAsZip
  };
};