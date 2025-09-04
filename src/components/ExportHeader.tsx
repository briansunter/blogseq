import React from "react";
import { CloudDownload, Spinner, Close } from "./Icons";

type ExportHeaderProps = {
  currentPageName: string;
  isExporting: boolean;
  onQuickExport: () => void;
  onClose: () => void;
};

export const ExportHeader = ({
  currentPageName,
  isExporting,
  onQuickExport,
  onClose,
}: ExportHeaderProps) => {
  return (
    <div className="px-3 py-1.5 border-b border-gray-800/40 bg-gray-900/90 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium text-gray-200">
          BlogSeq
          <span className="ml-1 text-[10px] text-gray-500">Markdown Exporter</span>
        </h1>
        <span className={`text-xs ${currentPageName ? 'text-gray-400' : 'text-yellow-500'}`}>
          {currentPageName ? (
            <>Exporting <span className="text-blue-400">{currentPageName}</span></>
          ) : (
            "⚠️ No active page - please open a page first"
          )}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onQuickExport}
          disabled={isExporting || !currentPageName}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          <span className="flex items-center">
            {isExporting ? (
              <><Spinner className="w-3 h-3 mr-1" />Exporting...</>
            ) : (
              <><CloudDownload className="w-3 h-3 mr-1" />Export</>
            )}
          </span>
        </button>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 p-1 hover:bg-gray-800/50 rounded transition-colors"
        >
          <Close className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};