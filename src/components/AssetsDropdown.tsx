import React, { useState, useRef, useEffect } from "react";
import { Asset } from "../types";
import { Copy, ExternalLink } from "./Icons";

type AssetsDropdownProps = {
  assets: Asset[];
  graphPath: string;
  onDownloadAsset: (asset: Asset) => void;
  onCopyAssetPath?: (asset: Asset) => void;
}

export const AssetsDropdown = ({
  assets,
  onDownloadAsset,
  onCopyAssetPath,
}: AssetsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const handleDragStart = async (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.effectAllowed = "copy";
    
    // Set multiple data types for better compatibility
    e.dataTransfer.setData("text/plain", asset.fullPath);
    e.dataTransfer.setData("text/uri-list", `file://${asset.fullPath}`);
    
    // For images, try to set the drag image
    const ext = asset.fileName.split('.').pop()?.toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
    
    if (isImage) {
      // Create a visible drag image
      const img = new Image();
      img.src = `file://${asset.fullPath}`;
      
      // Set custom drag image
      if (e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(img, 0, 0);
      }
      
      // Also set the download URL for better OS integration
      try {
        e.dataTransfer.setData("DownloadURL", `image/${ext}:${asset.fileName}:file://${asset.fullPath}`);
      } catch (err) {
        // Some browsers don't support DownloadURL
      }
    }
    
    // Add visual feedback
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    (e.currentTarget as HTMLElement).style.opacity = "1";
  };

  const getAssetPreview = (asset: Asset) => {
    const ext = asset.fileName.split('.').pop()?.toLowerCase();
    const imageSrc = `file://${asset.fullPath}`;
    
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return (
        <img 
          src={imageSrc} 
          alt={asset.fileName}
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable="false"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    
    // File type icon for non-images
    const fileTypeIcons: Record<string, string> = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      zip: '🗜️',
      mp4: '🎬',
      mp3: '🎵',
      default: '📎'
    };
    
    const icon = fileTypeIcons[ext || ''] || fileTypeIcons.default;
    
    return (
      <div className="w-full h-full flex items-center justify-center text-2xl">
        {icon}
      </div>
    );
  };

  if (assets.length === 0) return null;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded cursor-pointer hover:bg-blue-500/30 transition-colors">
        {assets.length} asset{assets.length > 1 ? 's' : ''}
      </span>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 w-64 max-h-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-2 py-1.5 bg-gray-900/50 border-b border-gray-700">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Referenced Assets
            </span>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {assets.map((asset, index) => (
              <div
                key={index}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, asset)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700/50 cursor-move border-b border-gray-700/30 last:border-0 group transition-opacity"
              >
                {/* Preview */}
                <div className="w-10 h-10 bg-gray-900/50 rounded border border-gray-600 overflow-hidden flex-shrink-0">
                  {getAssetPreview(asset)}
                </div>
                
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-gray-300 truncate" title={asset.title || asset.fileName}>
                    {asset.title || asset.fileName}
                  </div>
                  <div className="text-[9px] text-gray-500">
                    {asset.fileName.split('.').pop()?.toUpperCase()} • {asset.fileName.substring(0, 8)}...
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {/* Copy path button */}
                  <button
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCopyAssetPath) {
                        onCopyAssetPath(asset);
                      } else {
                        // Fallback: copy path to clipboard
                        navigator.clipboard.writeText(asset.fullPath);
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-600/50 rounded"
                    title="Copy image/path to clipboard"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  
                  {/* Open/Download button */}
                  <button
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadAsset(asset);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-600/50 rounded"
                    title="Download file"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="px-2 py-1.5 bg-gray-900/30 border-t border-gray-700">
            <span className="text-[9px] text-gray-500">
              Drag row to move file • <Copy className="w-2.5 h-2.5 inline" /> Copy image • <ExternalLink className="w-2.5 h-2.5 inline" /> Download
            </span>
          </div>
        </div>
      )}
    </div>
  );
};