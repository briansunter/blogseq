import React from "react";
import { Asset, PreviewMode } from "../types";
import { AssetsDropdown } from "./AssetsDropdown";
import { CloudDownload, Copy, Download, Refresh, Spinner } from "./Icons";

type PreviewControlsProps = {
	assetCount: number;
	assets: Asset[];
	graphPath: string;
	isExporting: boolean;
	previewMode: PreviewMode;
	onRefresh: () => void;
	onPreviewModeChange: (mode: PreviewMode) => void;
	onCopyToClipboard: () => void;
	onDownload: () => void;
	onDownloadAsZip: () => void;
	onDownloadAsset: (asset: Asset) => void;
	onCopyAssetPath: (asset: Asset) => void;
};

export const PreviewControls = ({
	assetCount,
	assets,
	graphPath,
	isExporting,
	previewMode,
	onRefresh,
	onPreviewModeChange,
	onCopyToClipboard,
	onDownload,
	onDownloadAsZip,
	onDownloadAsset,
	onCopyAssetPath,
}: PreviewControlsProps) => {
	return (
		<div className="px-3 py-1.5 border-b border-gray-800/40 bg-gray-900/70 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
					Preview
				</span>
				{assetCount > 0 && (
					<AssetsDropdown
						assets={assets}
						graphPath={graphPath}
						onDownloadAsset={onDownloadAsset}
						onCopyAssetPath={onCopyAssetPath}
					/>
				)}
				<button
					onClick={onRefresh}
					disabled={isExporting}
					className="p-0.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded transition-all"
					title="Refresh preview"
				>
					{isExporting ? <Spinner className="w-3 h-3" /> : <Refresh className="w-3 h-3" />}
				</button>
				<div className="flex bg-gray-800/50 rounded p-0.5">
					<button
						type="button"
						onClick={() => onPreviewModeChange("rendered")}
						className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
							previewMode === "rendered"
								? "bg-blue-500 text-white"
								: "text-gray-400 hover:text-gray-300"
						}`}
					>
						Rendered
					</button>
					<button
						type="button"
						onClick={() => onPreviewModeChange("raw")}
						className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
							previewMode === "raw" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-300"
						}`}
					>
						Raw
					</button>
				</div>
			</div>
			<div className="flex gap-1.5">
				<button
					onClick={onCopyToClipboard}
					className="px-2 py-0.5 text-[10px] font-medium bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 rounded transition-all border border-gray-700/50"
				>
					<Copy className="w-3 h-3 inline mr-1" />
					Copy
				</button>
				<button
					onClick={onDownload}
					className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 rounded transition-all border border-blue-500/30"
				>
					<Download className="w-3 h-3 inline mr-1" />
					Download MD
				</button>
				{assetCount > 0 && (
					<button
						onClick={onDownloadAsZip}
						className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded transition-all border border-emerald-500/30"
					>
						<CloudDownload className="w-3 h-3 inline mr-1" />
						ZIP ({assetCount})
					</button>
				)}
			</div>
		</div>
	);
};
