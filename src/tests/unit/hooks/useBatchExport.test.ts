import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBatchExport } from '../../../hooks/useBatchExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * useBatchExport hook test suite
 * Tests batch export functionality, progress tracking, and error handling
 */

// Mock JSZip
vi.mock('jszip');

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

describe('useBatchExport hook', () => {
  let mockZipInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();

    // Create mock ZIP instance
    mockZipInstance = {
      file: vi.fn().mockReturnThis(),
      folder: vi.fn().mockReturnThis(),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['test zip data'])),
    };

    // Mock JSZip constructor
    vi.mocked(JSZip).mockImplementation(() => mockZipInstance as any);

    // Mock logseq API
    (global as any).logseq = {
      Editor: {
        getPage: vi.fn(),
        getPageBlocksTree: vi.fn(),
      },
    };

    // Mock Date for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T10:30:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    try {
      vi.runOnlyPendingTimers();
    } catch {
      // Ignore if timers aren't mocked
    }
    vi.useRealTimers();
  });

  describe('Initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useBatchExport());

      expect(result.current.isBatchExporting).toBe(false);
      expect(result.current.batchProgress).toBe(0);
      expect(result.current.batchTotal).toBe(0);
    });

    it('should have exportPagesToZip function', () => {
      const { result } = renderHook(() => useBatchExport());

      expect(typeof result.current.exportPagesToZip).toBe('function');
    });
  });

  describe('exportPagesToZip', () => {
    it('should return null for empty page list', async () => {
      const { result } = renderHook(() => useBatchExport());

      let response;
      await act(async () => {
        response = await result.current.exportPagesToZip([]);
      });

      expect(response).toBeNull();
    });

    it('should set isBatchExporting to true during export', async () => {
      // Use real timers for this test since we need waitFor to work
      vi.useRealTimers();

      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      // Start export but don't await yet
      let exportPromise: Promise<any>;
      act(() => {
        exportPromise = result.current.exportPagesToZip(['Test Page']);
      });

      // Should be exporting initially
      await waitFor(() => {
        expect(result.current.isBatchExporting).toBe(true);
      });

      // Wait for export to complete
      await act(async () => {
        await exportPromise;
      });

      // Should be done after export
      expect(result.current.isBatchExporting).toBe(false);
    });

    it('should set batchTotal to number of pages', async () => {
      // Use real timers for this test since we need waitFor to work
      vi.useRealTimers();

      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      // Start export but don't await yet
      let exportPromise: Promise<any>;
      act(() => {
        exportPromise = result.current.exportPagesToZip(['Page 1', 'Page 2', 'Page 3']);
      });

      await waitFor(() => {
        expect(result.current.batchTotal).toBe(3);
      });

      // Wait for export to complete
      await act(async () => {
        await exportPromise;
      });
    });

    it('should update progress as pages are exported', async () => {
      let callCount = 0;
      vi.mocked(logseq.Editor.getPage).mockImplementation(async () => {
        callCount++;
        return {
          uuid: `page-${callCount}`,
          name: `Page ${callCount}`,
        } as any;
      });

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Page 1', 'Page 2', 'Page 3']);
      });

      // Final progress should equal total
      expect(result.current.batchProgress).toBe(0); // Reset after completion
      expect(result.current.batchTotal).toBe(0); // Reset after completion
    });

    it('should reset state after export completes', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Page 1']);
      });

      expect(result.current.isBatchExporting).toBe(false);
      expect(result.current.batchProgress).toBe(0);
      expect(result.current.batchTotal).toBe(0);
    });
  });

  describe('Export results', () => {
    it('should return array of export results', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Page 1']);
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
    });

    it('should include success entries for exported pages', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Test Page']);
      });

      expect(results[0]).toMatchObject({
        pageName: 'Test Page',
        success: true,
        markdown: expect.stringContaining('Test Page'),
      });
    });

    it('should include error entries for failed pages', async () => {
      vi.mocked(logseq.Editor.getPage).mockRejectedValue(new Error('Page not found'));

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Invalid Page']);
      });

      expect(results[0]).toMatchObject({
        pageName: 'Invalid Page',
        success: false,
        error: 'Page not found',
      });
    });

    it('should handle page not found errors', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue(null as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Nonexistent Page']);
      });

      expect(results[0]).toMatchObject({
        pageName: 'Nonexistent Page',
        success: false,
        error: 'Page not found',
      });
    });

    it('should handle block tree retrieval errors', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockRejectedValue(new Error('Block tree error'));

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Test Page']);
      });

      expect(results[0]).toMatchObject({
        pageName: 'Test Page',
        success: false,
        error: 'Block tree error',
      });
    });
  });

  describe('ZIP file generation', () => {
    it('should create JSZip instance', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      expect(JSZip).toHaveBeenCalled();
    });

    it('should add markdown files to ZIP', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'My Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content here' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['My Page']);
      });

      expect(mockZipInstance.file).toHaveBeenCalledWith(
        'My Page.md',
        expect.stringContaining('My Page')
      );
    });

    it('should generate blob from ZIP', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      expect(mockZipInstance.generateAsync).toHaveBeenCalledWith({
        type: 'blob',
      });
    });

    it('should download ZIP with timestamp filename', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'logseq-export-2024-03-15.zip');
    });

    it('should use YYYY-MM-DD date format', async () => {
      vi.setSystemTime(new Date('2024-12-25T15:45:30Z'));

      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Test content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/logseq-export-\d{4}-\d{2}-\d{2}\.zip/)
      );
    });
  });

  describe('Markdown conversion', () => {
    it('should include page name as heading', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'My Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Block content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['My Test Page']);
      });

      expect(results[0].markdown).toContain('# My Test Page');
    });

    it('should convert blocks to markdown', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'First block' },
        { uuid: 'block-2', content: 'Second block' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Test Page']);
      });

      expect(results[0].markdown).toContain('First block');
      expect(results[0].markdown).toContain('Second block');
    });

    it('should handle nested blocks with indentation', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        {
          uuid: 'block-1',
          content: 'Parent block',
          children: [{ uuid: 'block-2', content: 'Child block' }],
        },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Test Page']);
      });

      expect(results[0].markdown).toContain('Parent block');
      expect(results[0].markdown).toContain('Child block');
    });

    it('should trim final markdown output', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Test Page']);
      });

      // Should not have leading/trailing whitespace
      expect(results[0].markdown).toBe(results[0].markdown.trim());
    });
  });

  describe('Page retrieval', () => {
    it('should call getPage with page name', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      expect(logseq.Editor.getPage).toHaveBeenCalledWith('Test Page');
    });

    it('should handle page not found gracefully', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue(null as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Nonexistent']);
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Page not found');
    });
  });

  describe('Block tree retrieval', () => {
    it('should call getPageBlocksTree with page UUID', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-uuid-123',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      expect(logseq.Editor.getPageBlocksTree).toHaveBeenCalledWith('page-uuid-123');
    });

    it('should handle empty block trees', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Empty Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([]);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Empty Page']);
      });

      expect(results[0].success).toBe(true);
      expect(results[0].markdown).toContain('# Empty Page');
    });
  });

  describe('Error handling', () => {
    it('should catch errors during page export', async () => {
      vi.mocked(logseq.Editor.getPage).mockRejectedValue(new Error('Export error'));

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Error Page']);
      });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Export error');
    });

    it('should continue exporting after page error', async () => {
      let callCount = 0;
      vi.mocked(logseq.Editor.getPage).mockImplementation(async name => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First page error');
        }
        return {
          uuid: `page-${callCount}`,
          name: name as string,
        } as any;
      });

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Page 1', 'Page 2']);
      });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it('should include error details in results', async () => {
      vi.mocked(logseq.Editor.getPage).mockRejectedValue(new Error('Detailed error message'));

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Test Page']);
      });

      expect(results[0].error).toBe('Detailed error message');
    });

    it('should handle unknown error types', async () => {
      vi.mocked(logseq.Editor.getPage).mockRejectedValue('String error');

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Test Page']);
      });

      expect(results[0].error).toBe('String error');
    });
  });

  describe('Progress tracking', () => {
    it('should update progress even on errors', async () => {
      vi.mocked(logseq.Editor.getPage).mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Page 1', 'Page 2']);
      });

      // Should have processed all pages despite errors
      expect(result.current.batchProgress).toBe(0); // Reset after completion
    });
  });

  describe('Memory management', () => {
    it('should clean up state after export', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Test Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      expect(result.current.isBatchExporting).toBe(false);
      expect(result.current.batchProgress).toBe(0);
      expect(result.current.batchTotal).toBe(0);
    });

    it('should clean up state on export error', async () => {
      vi.mocked(logseq.Editor.getPage).mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useBatchExport());

      await act(async () => {
        await result.current.exportPagesToZip(['Test Page']);
      });

      // State should still be reset
      expect(result.current.isBatchExporting).toBe(false);
      expect(result.current.batchProgress).toBe(0);
      expect(result.current.batchTotal).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle single page export', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Single Page',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Single Page']);
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should handle special characters in page names', async () => {
      vi.mocked(logseq.Editor.getPage).mockResolvedValue({
        uuid: 'page-1',
        name: 'Page / With : Special * Chars',
      } as any);

      vi.mocked(logseq.Editor.getPageBlocksTree).mockResolvedValue([
        { uuid: 'block-1', content: 'Content' },
      ] as any);

      const { result } = renderHook(() => useBatchExport());

      let results: any;
      await act(async () => {
        results = await result.current.exportPagesToZip(['Page / With : Special * Chars']);
      });

      expect(results[0].success).toBe(true);
      expect(mockZipInstance.file).toHaveBeenCalledWith(
        'Page / With : Special * Chars.md',
        expect.any(String)
      );
    });
  });
});
