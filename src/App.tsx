import React, { useRef, useState, useEffect, useCallback } from "react";
import { useAppVisible } from "./utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider, useToast } from "./components/Toast";
import { ExportHeader } from "./components/ExportHeader";
import { SettingsBar } from "./components/SettingsBar";
import { PreviewControls } from "./components/PreviewControls";
import { PreviewContent } from "./components/PreviewContent";
import { ExportSettings, PreviewMode } from "./types";
import { getExportSettings, updateExportSetting } from "./settings";
import { useExport } from "./hooks/useExport";
import { useAssets } from "./hooks/useAssets";
// import { useBatchExport } from "./hooks/useBatchExport"; // Available for future UI

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useAppVisible();
  const { showSuccess, showError, showWarning } = useToast();
  const [currentPageName, setCurrentPageName] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("rendered");
  const [settings, setSettings] = useState<ExportSettings>(getExportSettings());

  const {
    isExporting,
    preview,
    assets,
    graphPath,
    handleExport,
    quickExport,
    downloadMarkdown,
    copyToClipboard,
    downloadAsZip
  } = useExport(settings);

  const { downloadAsset, copyAssetPath } = useAssets();
  // Batch export hook available for future UI implementation
  // const { isBatchExporting, batchProgress, batchTotal, exportPagesToZip } = useBatchExport();

  const loadCurrentPage = useCallback(async () => {
    try {
      const page = await logseq.Editor.getCurrentPage();
      if (page && typeof page === 'object' && 'name' in page) {
        const pageName = (page as { name: string }).name;
        setCurrentPageName(typeof pageName === 'string' ? pageName : "");
      } else {
        setCurrentPageName("");
        setShowPreview(false);
      }
    } catch (error) {
      console.error("Failed to get current page:", error);
      setCurrentPageName("");
      setShowPreview(false);
    }
  }, []);
  
  const handleExportWithUI = useCallback(async () => {
    const result = await handleExport();
    if (result.success) {
      setShowPreview(true);
      showSuccess("Export successful!");
    } else if (result.error === "NO_ACTIVE_PAGE") {
      showWarning("Please open a page first before exporting");
      setTimeout(() => window.logseq.hideMainUI(), 2000);
    } else {
      showError(result.error || "Export failed. Check console for details.");
    }
  }, [handleExport, showSuccess, showWarning, showError]);

  const handleSettingChange = useCallback((key: keyof ExportSettings) => {
    const newValue = !settings[key];
    updateExportSetting(key, newValue);
    setSettings(prev => ({ ...prev, [key]: newValue }));
  }, [settings]);

  const handleAssetPathChange = useCallback((value: string) => {
    updateExportSetting('assetPath', value);
    setSettings(prev => ({ ...prev, assetPath: value }));
  }, []);

  const handleClose = useCallback(() => window.logseq.hideMainUI(), []);

  // Event handlers
  useEffect(() => {
    const handleSettingsChanged = () => setSettings(getExportSettings());
    // @ts-ignore
    logseq.on('settings:changed', handleSettingsChanged);
    return () => {
      // @ts-ignore
      logseq.off('settings:changed', handleSettingsChanged);
    };
  }, []);

  useEffect(() => {
    const handleExportEvent = () => quickExport();
    window.addEventListener("logseq-export-page", handleExportEvent);
    return () => window.removeEventListener("logseq-export-page", handleExportEvent);
  }, [quickExport]);

  useEffect(() => {
    if (!visible) return;
    
    loadCurrentPage();
    const timer = setTimeout(async () => {
      const page = await logseq.Editor.getCurrentPage();
      if (page) await handleExportWithUI();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [visible, loadCurrentPage, handleExportWithUI]);

  if (!visible) return null;

  return (
    <main
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        if (!innerRef.current?.contains(e.target as Node)) {
          handleClose();
        }
      }}
    >
      <div 
        ref={innerRef} 
        className="bg-gray-900 border border-gray-800/40 rounded-md shadow-2xl w-[98vw] h-[98vh] flex flex-col overflow-hidden"
      >
        {/* macOS Traffic Light Spacer */}
        <div className="h-8 bg-gray-900/90"></div>
        
        <ExportHeader
          currentPageName={currentPageName}
          isExporting={isExporting}
          onQuickExport={quickExport}
          onClose={handleClose}
        />

        <SettingsBar
          settings={settings}
          onSettingChange={handleSettingChange}
          onAssetPathChange={handleAssetPathChange}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showPreview && preview ? (
            <>
              <PreviewControls
                assetCount={assets.length}
                assets={assets}
                graphPath={graphPath}
                isExporting={isExporting}
                previewMode={previewMode}
                onRefresh={handleExportWithUI}
                onPreviewModeChange={setPreviewMode}
                onCopyToClipboard={copyToClipboard}
                onDownload={downloadMarkdown}
                onDownloadAsZip={downloadAsZip}
                onDownloadAsset={downloadAsset}
                onCopyAssetPath={copyAssetPath}
              />

              {/* Preview Content */}
              <div className="flex-1 overflow-auto bg-gray-950/50">
                <PreviewContent
                  preview={preview}
                  previewMode={previewMode}
                  graphPath={graphPath}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              {isExporting ? "Loading preview..." : "No page content to preview"}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;