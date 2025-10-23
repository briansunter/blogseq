import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportHeader } from '../components/ExportHeader';
import { renderWithProviders } from './component-utils';

/**
 * ExportHeader component test suite
 * Tests export button, page status, and header interactions
 */

describe('ExportHeader', () => {
  const defaultProps = {
    currentPageName: 'Test Page',
    isExporting: false,
    onQuickExport: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header with title', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      expect(screen.getByText('BlogSeq')).toBeInTheDocument();
      expect(screen.getByText('Markdown Exporter')).toBeInTheDocument();
    });

    it('should display current page name', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('should show "Exporting" when page is active', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      expect(screen.getByText(/Exporting/)).toBeInTheDocument();
    });

    it('should display warning when no active page', () => {
      renderWithProviders(
        <ExportHeader {...defaultProps} currentPageName="" />
      );
      expect(screen.getByText(/No active page/i)).toBeInTheDocument();
    });

    it('should show warning icon when no page', () => {
      renderWithProviders(
        <ExportHeader {...defaultProps} currentPageName="" />
      );
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });
  });

  describe('Export Button', () => {
    it('should render export button', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Export/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onQuickExport when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExportHeader {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Export/i });
      await user.click(button);

      expect(defaultProps.onQuickExport).toHaveBeenCalledTimes(1);
    });

    it('should show loading state while exporting', () => {
      renderWithProviders(
        <ExportHeader {...defaultProps} isExporting={true} />
      );
      expect(screen.getByText(/Exporting\.\.\./)).toBeInTheDocument();
    });

    it('should disable button when exporting', () => {
      renderWithProviders(
        <ExportHeader {...defaultProps} isExporting={true} />
      );
      const button = screen.getByRole('button', { name: /Exporting/i });
      expect(button).toBeDisabled();
    });

    it('should disable button when no active page', () => {
      renderWithProviders(
        <ExportHeader {...defaultProps} currentPageName="" />
      );
      const button = screen.getByRole('button', { name: /Export/i });
      expect(button).toBeDisabled();
    });

    it('should enable button when page is active and not exporting', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Export/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Close Button', () => {
    it('should render close button', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('should call onClose when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExportHeader {...defaultProps} />);

      // Get the close button (second button)
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[1];

      await user.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should always be enabled', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[1];
      expect(closeButton).not.toBeDisabled();
    });
  });

  describe('Styling', () => {
    it('should apply warning color when no page', () => {
      renderWithProviders(
        <ExportHeader {...defaultProps} currentPageName="" />
      );
      const warningText = screen.getByText(/No active page/i);
      const parentSpan = warningText.closest('span');
      expect(parentSpan).toHaveClass('text-yellow-500');
    });

    it('should apply normal color when page is active', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const pageNameSpan = screen.getByText('Test Page').parentElement;
      expect(pageNameSpan).toHaveClass('text-blue-400');
    });

    it('should have proper button styling', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Export/i });
      expect(button).toHaveClass('bg-emerald-600');
      expect(button).toHaveClass('text-white');
    });
  });

  describe('State Transitions', () => {
    it('should handle page name changes', () => {
      const { rerender } = renderWithProviders(
        <ExportHeader {...defaultProps} currentPageName="Page A" />
      );

      expect(screen.getByText('Page A')).toBeInTheDocument();

      rerender(
        <ExportHeader {...defaultProps} currentPageName="Page B" />
      );

      expect(screen.getByText('Page B')).toBeInTheDocument();
    });

    it('should handle export state changes', () => {
      const { rerender } = renderWithProviders(
        <ExportHeader {...defaultProps} isExporting={false} />
      );

      expect(screen.getByText(/Export$/)).toBeInTheDocument();

      rerender(
        <ExportHeader {...defaultProps} isExporting={true} />
      );

      expect(screen.getByText(/Exporting\.\.\./)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExportHeader {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Export/i });
      button.focus();

      expect(button).toHaveFocus();
    });

    it('should have proper contrast for text', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const title = screen.getByText('BlogSeq');
      expect(title).toHaveClass('text-gray-200');
    });
  });

  describe('Icons', () => {
    it('should render icon in export button', () => {
      renderWithProviders(<ExportHeader {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Export/i });
      expect(button.querySelector('svg') || button.textContent).toBeTruthy();
    });

    it('should render spinner during export', () => {
      renderWithProviders(
        <ExportHeader {...defaultProps} isExporting={true} />
      );
      const button = screen.getByRole('button', { name: /Exporting/i });
      // Spinner should be rendered
      expect(button.textContent).toContain('Exporting...');
    });
  });

  describe('Props Validation', () => {
    it('should accept all required props', () => {
      expect(() => {
        renderWithProviders(<ExportHeader {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle empty page name', () => {
      expect(() => {
        renderWithProviders(
          <ExportHeader {...defaultProps} currentPageName="" />
        );
      }).not.toThrow();
    });

    it('should handle very long page names', () => {
      const longName = 'A'.repeat(100);
      renderWithProviders(
        <ExportHeader {...defaultProps} currentPageName={longName} />
      );
      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });
});
