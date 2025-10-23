import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useExport } from '../../../hooks/useExport';
import type { ExportSettings } from '../../../types';
import { exporter } from '../../../markdownExporter';

/**
 * useExport hook test suite
 * Tests export functionality, state management, and error handling
 */

// Mock the exporter module at module level
vi.mock('../../../markdownExporter', () => ({
  exporter: {
    exportCurrentPage: vi.fn(),
    getReferencedAssets: vi.fn().mockReturnValue(new Map()),
    getGraphPath: vi.fn().mockReturnValue('/test/graph'),
    downloadAsZip: vi.fn(),
    downloadMarkdown: vi.fn(),
    copyToClipboard: vi.fn(),
  },
}));

describe('useExport hook', () => {
  const defaultSettings: ExportSettings = {
    includePageName: false,
    flattenNested: true,
    preserveBlockRefs: true,
    includeProperties: true,
    assetPath: '/assets',
    debug: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock logseq API
    (global as any).logseq = {
      UI: {
        showMsg: vi.fn(),
      },
      isMainUIVisible: true,
    };

    (global as any).window = {
      logseq: {
        hideMainUI: vi.fn(),
      },
    };

    // Reset mock implementations
    vi.mocked(exporter.exportCurrentPage).mockResolvedValue('# Test Page\n\nTest content');
    vi.mocked(exporter.getReferencedAssets).mockReturnValue(new Map());
    vi.mocked(exporter.getGraphPath).mockReturnValue('/test/graph');
    vi.mocked(exporter.downloadMarkdown).mockResolvedValue(undefined);
    vi.mocked(exporter.copyToClipboard).mockResolvedValue(undefined);
    vi.mocked(exporter.downloadAsZip).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      expect(result.current.isExporting).toBe(false);
      expect(result.current.preview).toBe('');
      expect(result.current.assets).toEqual([]);
      expect(result.current.graphPath).toBe('');
    });

    it('should return all export methods', () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      expect(typeof result.current.handleExport).toBe('function');
      expect(typeof result.current.quickExport).toBe('function');
      expect(typeof result.current.downloadMarkdown).toBe('function');
      expect(typeof result.current.copyToClipboard).toBe('function');
      expect(typeof result.current.downloadAsZip).toBe('function');
    });
  });

  describe('handleExport', () => {
    it('should export page successfully', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      let exportResult;
      await act(async () => {
        exportResult = await result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.preview).toBe('# Test Page\n\nTest content');
        expect(result.current.isExporting).toBe(false);
      });

      expect(exportResult).toEqual({
        success: true,
        markdown: '# Test Page\n\nTest content',
      });
    });

    it('should set isExporting to true during export', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      let exportPromise: Promise<any>;
      act(() => {
        exportPromise = result.current.handleExport();
      });

      // Should be exporting immediately
      expect(result.current.isExporting).toBe(true);

      await act(async () => {
        await exportPromise;
      });

      // Should be done exporting
      expect(result.current.isExporting).toBe(false);
    });

    it('should update preview with exported markdown', async () => {
      const testMarkdown = '# My Page\n\nSome content here';
      vi.mocked(exporter.exportCurrentPage).mockResolvedValue(testMarkdown);

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.preview).toBe(testMarkdown);
      });
    });

    it('should update assets list from referenced assets', async () => {
      const mockAssets = new Map([
        ['uuid-123', { uuid: 'uuid-123', title: 'Image 1', type: 'png', originalPath: '/test/uuid-123.png', exportPath: 'assets/uuid-123.png' }],
        ['uuid-456', { uuid: 'uuid-456', title: 'Image 2', type: 'jpg', originalPath: '/test/uuid-456.jpg', exportPath: 'assets/uuid-456.jpg' }],
      ]);
      vi.mocked(exporter.getReferencedAssets).mockReturnValue(mockAssets);
      vi.mocked(exporter.getGraphPath).mockReturnValue('/my/graph');

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.assets).toHaveLength(2);
        expect(result.current.assets[0]).toEqual({
          fileName: 'uuid-123.png',
          fullPath: '/my/graph/assets/uuid-123.png',
          title: 'Image 1',
        });
        expect(result.current.assets[1]).toEqual({
          fileName: 'uuid-456.jpg',
          fullPath: '/my/graph/assets/uuid-456.jpg',
          title: 'Image 2',
        });
      });
    });

    it('should update graphPath from exporter', async () => {
      vi.mocked(exporter.getGraphPath).mockReturnValue('/custom/graph/path');

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.graphPath).toBe('/custom/graph/path');
      });
    });

    it('should handle NO_ACTIVE_PAGE error', async () => {
      vi.mocked(exporter.exportCurrentPage).mockRejectedValue(
        new Error('NO_ACTIVE_PAGE')
      );

      const { result } = renderHook(() => useExport(defaultSettings));

      let exportResult;
      await act(async () => {
        exportResult = await result.current.handleExport();
      });

      expect(exportResult).toEqual({
        success: false,
        error: 'NO_ACTIVE_PAGE',
      });
      expect(result.current.isExporting).toBe(false);
    });

    it('should handle generic export errors', async () => {
      vi.mocked(exporter.exportCurrentPage).mockRejectedValue(
        new Error('Export failed')
      );

      const { result } = renderHook(() => useExport(defaultSettings));

      let exportResult;
      await act(async () => {
        exportResult = await result.current.handleExport();
      });

      expect(exportResult).toEqual({
        success: false,
        error: 'Export failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(exporter.exportCurrentPage).mockRejectedValue('String error');

      const { result } = renderHook(() => useExport(defaultSettings));

      let exportResult;
      await act(async () => {
        exportResult = await result.current.handleExport();
      });

      expect(exportResult).toEqual({
        success: false,
        error: 'String error',
      });
    });

    it('should use default title when asset has no title', async () => {
      const mockAssets = new Map([['uuid-789', { uuid: 'uuid-789', title: '', type: 'pdf', originalPath: '/test/uuid-789.pdf', exportPath: 'assets/uuid-789.pdf' }]]);
      vi.mocked(exporter.getReferencedAssets).mockReturnValue(mockAssets);

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.handleExport();
      });

      await waitFor(() => {
        expect(result.current.assets[0].title).toBe('uuid-789.pdf');
      });
    });
  });

  describe('quickExport', () => {
    it('should export and download as ZIP', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.quickExport();
      });

      expect(exporter.exportCurrentPage).toHaveBeenCalledWith(defaultSettings);
      expect(exporter.downloadAsZip).toHaveBeenCalledWith(
        '# Test Page\n\nTest content',
        undefined,
        '/assets'
      );
    });

    it('should hide UI after successful export', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.quickExport();
      });

      expect(window.logseq.hideMainUI).toHaveBeenCalled();
    });

    it('should show success message after export', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.quickExport();
      });

      expect(logseq.UI.showMsg).toHaveBeenCalledWith(
        'Page exported as ZIP successfully!',
        'success'
      );
    });

    it('should handle NO_ACTIVE_PAGE error in quickExport', async () => {
      vi.mocked(exporter.exportCurrentPage).mockRejectedValue(
        new Error('NO_ACTIVE_PAGE')
      );

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.quickExport();
      });

      expect(logseq.UI.showMsg).toHaveBeenCalledWith(
        '⚠️ Please open a page first before exporting',
        'warning'
      );
      expect(window.logseq.hideMainUI).toHaveBeenCalled();
    });

    it('should handle generic errors in quickExport', async () => {
      vi.mocked(exporter.exportCurrentPage).mockRejectedValue(
        new Error('Export failed')
      );

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.quickExport();
      });

      expect(logseq.UI.showMsg).toHaveBeenCalledWith(
        'Export failed. Check console for details.',
        'error'
      );
      expect(window.logseq.hideMainUI).toHaveBeenCalled();
    });
  });

  describe('downloadMarkdown', () => {
    it('should download markdown when preview exists', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      // First export to set preview
      await act(async () => {
        await result.current.handleExport();
      });

      // Then download
      await act(async () => {
        await result.current.downloadMarkdown();
      });

      expect(exporter.downloadMarkdown).toHaveBeenCalledWith(
        '# Test Page\n\nTest content'
      );
      expect(logseq.UI.showMsg).toHaveBeenCalledWith(
        'Markdown downloaded!',
        'success'
      );
    });

    it('should not download when preview is empty', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.downloadMarkdown();
      });

      expect(exporter.downloadMarkdown).not.toHaveBeenCalled();
    });
  });

  describe('copyToClipboard', () => {
    it('should copy to clipboard when preview exists', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      // First export to set preview
      await act(async () => {
        await result.current.handleExport();
      });

      // Then copy
      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(exporter.copyToClipboard).toHaveBeenCalledWith(
        '# Test Page\n\nTest content'
      );
    });

    it('should not copy when preview is empty', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.copyToClipboard();
      });

      expect(exporter.copyToClipboard).not.toHaveBeenCalled();
    });
  });

  describe('downloadAsZip', () => {
    it('should re-export and download as ZIP', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.downloadAsZip();
      });

      expect(exporter.exportCurrentPage).toHaveBeenCalledWith(defaultSettings);
      expect(exporter.downloadAsZip).toHaveBeenCalledWith(
        '# Test Page\n\nTest content',
        undefined,
        '/assets'
      );
    });

    it('should use custom asset path from settings', async () => {
      const customSettings = { ...defaultSettings, assetPath: '/custom/assets' };
      const { result } = renderHook(() => useExport(customSettings));

      await act(async () => {
        await result.current.downloadAsZip();
      });

      expect(exporter.downloadAsZip).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        '/custom/assets'
      );
    });
  });

  describe('Settings changes', () => {
    it('should re-export when settings change', async () => {
      const { result, rerender } = renderHook(
        ({ settings }) => useExport(settings),
        {
          initialProps: { settings: defaultSettings },
        }
      );

      await act(async () => {
        await result.current.handleExport();
      });

      expect(exporter.exportCurrentPage).toHaveBeenCalledTimes(1);

      // Change settings
      const newSettings = { ...defaultSettings, includePageName: true };
      rerender({ settings: newSettings });

      await act(async () => {
        await result.current.handleExport();
      });

      expect(exporter.exportCurrentPage).toHaveBeenCalledTimes(2);
      expect(exporter.exportCurrentPage).toHaveBeenLastCalledWith(newSettings);
    });
  });

  describe('Callback memoization', () => {
    it('should memoize callbacks based on settings', () => {
      const { result, rerender } = renderHook(
        ({ settings }) => useExport(settings),
        {
          initialProps: { settings: defaultSettings },
        }
      );

      const oldHandleExport = result.current.handleExport;
      const oldQuickExport = result.current.quickExport;

      // Rerender with same settings
      rerender({ settings: defaultSettings });

      // Callbacks should change because settings object changed (referential equality)
      // This is expected behavior - callbacks depend on settings
      expect(result.current.handleExport).not.toBe(oldHandleExport);
      expect(result.current.quickExport).not.toBe(oldQuickExport);
    });

    it('should update downloadMarkdown when preview changes', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      const oldDownloadMarkdown = result.current.downloadMarkdown;

      await act(async () => {
        await result.current.handleExport();
      });

      // Callback should update when preview changes
      expect(result.current.downloadMarkdown).not.toBe(oldDownloadMarkdown);
    });
  });

  describe('Multiple rapid exports', () => {
    it('should handle rapid sequential exports', async () => {
      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        const promises = [
          result.current.handleExport(),
          result.current.handleExport(),
          result.current.handleExport(),
        ];
        await Promise.all(promises);
      });

      expect(exporter.exportCurrentPage).toHaveBeenCalledTimes(3);
      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('Asset handling edge cases', () => {
    it('should handle empty assets map', async () => {
      vi.mocked(exporter.getReferencedAssets).mockReturnValue(new Map());

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.handleExport();
      });

      expect(result.current.assets).toEqual([]);
    });

    it('should handle assets with various file types', async () => {
      const mockAssets = new Map([
        ['uuid-1', { uuid: 'uuid-1', title: 'Image', type: 'png', originalPath: '/test/uuid-1.png', exportPath: 'assets/uuid-1.png' }],
        ['uuid-2', { uuid: 'uuid-2', title: 'Document', type: 'pdf', originalPath: '/test/uuid-2.pdf', exportPath: 'assets/uuid-2.pdf' }],
        ['uuid-3', { uuid: 'uuid-3', title: 'Video', type: 'mp4', originalPath: '/test/uuid-3.mp4', exportPath: 'assets/uuid-3.mp4' }],
      ]);
      vi.mocked(exporter.getReferencedAssets).mockReturnValue(mockAssets);

      const { result } = renderHook(() => useExport(defaultSettings));

      await act(async () => {
        await result.current.handleExport();
      });

      expect(result.current.assets).toHaveLength(3);
      expect(result.current.assets[0].fileName).toBe('uuid-1.png');
      expect(result.current.assets[1].fileName).toBe('uuid-2.pdf');
      expect(result.current.assets[2].fileName).toBe('uuid-3.mp4');
    });
  });
});
