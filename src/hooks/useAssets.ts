import { useCallback } from 'react';
import { saveAs } from 'file-saver';
import { Asset } from '../types';

export const useAssets = () => {
  const downloadAsset = useCallback(async (asset: Asset) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `file://${asset.fullPath}`, true);
      xhr.responseType = 'blob';

      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 0) {
          const blob = xhr.response;
          saveAs(blob, asset.fileName);
          logseq.UI.showMsg(`Downloaded ${asset.fileName}`, 'success');
        }
      };

      xhr.onerror = async function () {
        await navigator.clipboard.writeText(asset.fullPath);
        logseq.UI.showMsg(`Could not download. Path copied: ${asset.fullPath}`, 'info');
      };

      xhr.send();
    } catch (error) {
      await navigator.clipboard.writeText(asset.fullPath);
      logseq.UI.showMsg(`Path copied: ${asset.fullPath}`, 'info');
    }
  }, []);

  const copyAssetPath = useCallback(async (asset: Asset) => {
    try {
      const ext = asset.fileName.split('.').pop()?.toLowerCase();
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');

      if (isImage) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `file://${asset.fullPath}`, true);
        xhr.responseType = 'blob';

        xhr.onload = async function () {
          if (xhr.status === 200 || xhr.status === 0) {
            try {
              const blob = xhr.response as Blob;
              const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
              const typedBlob = new Blob([blob], { type: mimeType });

              const clipboardItem = new ClipboardItem({ [mimeType]: typedBlob });
              await navigator.clipboard.write([clipboardItem]);
              logseq.UI.showMsg(`Image copied to clipboard!`, 'success');
            } catch {
              try {
                await navigator.clipboard.writeText(asset.fullPath);
                logseq.UI.showMsg(`Path copied: ${asset.fileName}`, 'info');
              } catch {
                // Silently fail if clipboard is unavailable
              }
            }
          }
        };

        xhr.onerror = async function () {
          try {
            await navigator.clipboard.writeText(asset.fullPath);
            logseq.UI.showMsg(`Path copied: ${asset.fullPath}`, 'info');
          } catch {
            // Silently fail if clipboard is unavailable
          }
        };

        xhr.send();
      } else {
        try {
          await navigator.clipboard.writeText(asset.fullPath);
          logseq.UI.showMsg(`Path copied: ${asset.fileName}`, 'success');
        } catch {
          // Silently fail if clipboard is unavailable
        }
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(asset.fullPath);
        logseq.UI.showMsg(`Path copied: ${asset.fullPath}`, 'info');
      } catch {
        // Silently fail if clipboard is unavailable
      }
    }
  }, []);

  return { downloadAsset, copyAssetPath };
};
