import { useState, useCallback } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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

  const exportPagesToZip = useCallback(
    async (pageNames: string[]) => {
      if (!pageNames.length) return null;

      setBatchExporting(true);
      setBatchTotal(pageNames.length);
      setBatchProgress(0);

      try {
        const zip = new JSZip();
        const results: BatchExportResult[] = [];

        for (let i = 0; i < pageNames.length; i++) {
          const pageName = pageNames[i];

          try {
            // Get page by name
            const page = (await logseq.Editor.getPage(pageName)) as any;

            if (!page) {
              results.push({
                pageName,
                success: false,
                error: "Page not found",
              });
              setBatchProgress(i + 1);
              continue;
            }

            // Get page blocks
            const tree = await logseq.Editor.getPageBlocksTree(page.uuid);

            // Convert blocks to markdown (simplified version without MarkdownExporter)
            const markdown = convertBlocksToMarkdown(tree, pageName);

            zip.file(`${pageName}.md`, markdown);
            results.push({
              pageName,
              success: true,
              markdown,
            });
          } catch (error) {
            results.push({
              pageName,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
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
    },
    []
  );

  return {
    isBatchExporting,
    batchProgress,
    batchTotal,
    exportPagesToZip,
  };
};

// Simplified block to markdown conversion
function convertBlocksToMarkdown(blocks: any[], pageName: string): string {
  const lines: string[] = [`# ${pageName}`, ""];

  const processBlock = (block: any, depth = 1) => {
    if (!block.content) return;

    const indent = "  ".repeat(Math.max(0, depth - 1));
    const prefix = depth === 1 ? "- " : "  ".repeat(depth - 1) + "- ";

    lines.push(prefix + block.content);

    if (block.children && Array.isArray(block.children)) {
      block.children.forEach((child: any) => processBlock(child, depth + 1));
    }
  };

  blocks.forEach((block) => processBlock(block));

  return lines.join("\n").trim();
}
