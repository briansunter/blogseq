import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsBar } from '../../components/SettingsBar';
import { renderWithProviders } from '../component-utils';
import type { ExportSettings } from '../../types';

/**
 * SettingsBar component test suite
 * Tests settings toggles, asset path input, and configuration changes
 */

describe('SettingsBar', () => {
  const defaultSettings: ExportSettings = {
    includePageName: false,
    flattenNested: true,
    preserveBlockRefs: true,
    includeProperties: true,
    assetPath: '/assets',
    debug: false,
  };

  const defaultProps = {
    settings: defaultSettings,
    onSettingChange: vi.fn(),
    onAssetPathChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render settings bar', () => {
      renderWithProviders(<SettingsBar {...defaultProps} />);
      expect(screen.getByText('Export Config')).toBeInTheDocument();
    });

    it('should render all setting checkboxes', () => {
      renderWithProviders(<SettingsBar {...defaultProps} />);
      expect(screen.getByLabelText('Page Header')).toBeInTheDocument();
      expect(screen.getByLabelText('Flatten')).toBeInTheDocument();
      expect(screen.getByLabelText('References')).toBeInTheDocument();
      expect(screen.getByLabelText('Frontmatter')).toBeInTheDocument();
      expect(screen.getByLabelText('Debug')).toBeInTheDocument();
    });

    it('should render asset path input', () => {
      renderWithProviders(<SettingsBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('assets/') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('/assets');
    });
  });

  describe('Checkbox Toggles', () => {
    it('should toggle includePageName setting', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const checkbox = screen.getByLabelText('Page Header') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      await user.click(checkbox);
      expect(defaultProps.onSettingChange).toHaveBeenCalledWith(
        'includePageName'
      );
    });

    it('should toggle flattenNested setting', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const checkbox = screen.getByLabelText('Flatten') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      await user.click(checkbox);
      expect(defaultProps.onSettingChange).toHaveBeenCalledWith(
        'flattenNested'
      );
    });

    it('should toggle preserveBlockRefs setting', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const checkbox = screen.getByLabelText(
        'References'
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      await user.click(checkbox);
      expect(defaultProps.onSettingChange).toHaveBeenCalledWith(
        'preserveBlockRefs'
      );
    });

    it('should toggle includeProperties setting', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const checkbox = screen.getByLabelText(
        'Frontmatter'
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      await user.click(checkbox);
      expect(defaultProps.onSettingChange).toHaveBeenCalledWith(
        'includeProperties'
      );
    });

    it('should toggle debug setting', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const checkbox = screen.getByLabelText('Debug') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      await user.click(checkbox);
      expect(defaultProps.onSettingChange).toHaveBeenCalledWith('debug');
    });

    it('should reflect checked state from settings', () => {
      const settings = {
        ...defaultSettings,
        includePageName: true,
        debug: true,
      };

      renderWithProviders(
        <SettingsBar {...defaultProps} settings={settings} />
      );

      const pageHeaderCheckbox = screen.getByLabelText(
        'Page Header'
      ) as HTMLInputElement;
      const debugCheckbox = screen.getByLabelText('Debug') as HTMLInputElement;

      expect(pageHeaderCheckbox.checked).toBe(true);
      expect(debugCheckbox.checked).toBe(true);
    });
  });

  describe('Asset Path Input', () => {
    it('should display current asset path', () => {
      renderWithProviders(
        <SettingsBar
          {...defaultProps}
          settings={{ ...defaultSettings, assetPath: '/custom/path' }}
        />
      );

      const input = screen.getByPlaceholderText('assets/') as HTMLInputElement;
      expect(input.value).toBe('/custom/path');
    });

    it('should call onAssetPathChange on input change', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('assets/') as HTMLInputElement;
      await user.clear(input);
      await user.type(input, '/new/path');

      expect(defaultProps.onAssetPathChange).toHaveBeenCalledWith('/new/path');
    });

    it('should handle empty asset path', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('assets/') as HTMLInputElement;
      await user.clear(input);

      expect(defaultProps.onAssetPathChange).toHaveBeenCalledWith('');
    });

    it('should handle special characters in asset path', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('assets/') as HTMLInputElement;
      await user.clear(input);
      await user.type(input, '/path/with-special_chars/123');

      expect(defaultProps.onAssetPathChange).toHaveBeenCalledWith(
        '/path/with-special_chars/123'
      );
    });

    it('should handle very long asset paths', async () => {
      const user = userEvent.setup();
      const longPath = '/'.repeat(50) + 'path';

      renderWithProviders(<SettingsBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('assets/') as HTMLInputElement;
      await user.clear(input);
      await user.type(input, longPath);

      expect(defaultProps.onAssetPathChange).toHaveBeenCalledWith(longPath);
    });
  });

  describe('Styling', () => {
    it('should have proper label styling', () => {
      renderWithProviders(<SettingsBar {...defaultProps} />);
      const labels = screen.getAllByText(/Header|Flatten|References|Frontmatter|Debug/);
      labels.forEach((label) => {
        expect(label).toHaveClass('text-gray-400');
      });
    });

    it('should have proper input styling', () => {
      renderWithProviders(<SettingsBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('assets/');
      expect(input).toHaveClass('bg-gray-800');
      expect(input).toHaveClass('border-gray-700');
    });

    it('should show focus state on input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('assets/');
      await user.click(input);

      expect(input).toHaveFocus();
    });
  });

  describe('State Transitions', () => {
    it('should handle setting changes', () => {
      const { rerender } = renderWithProviders(
        <SettingsBar {...defaultProps} />
      );

      const newSettings = {
        ...defaultSettings,
        includePageName: true,
      };

      rerender(
        <SettingsBar
          settings={newSettings}
          onSettingChange={defaultProps.onSettingChange}
          onAssetPathChange={defaultProps.onAssetPathChange}
        />
      );

      const checkbox = screen.getByLabelText(
        'Page Header'
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should handle asset path changes', () => {
      const { rerender } = renderWithProviders(
        <SettingsBar {...defaultProps} />
      );

      const newSettings = {
        ...defaultSettings,
        assetPath: '/new/path',
      };

      rerender(
        <SettingsBar
          settings={newSettings}
          onSettingChange={defaultProps.onSettingChange}
          onAssetPathChange={defaultProps.onAssetPathChange}
        />
      );

      const input = screen.getByPlaceholderText('assets/') as HTMLInputElement;
      expect(input.value).toBe('/new/path');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible checkbox labels', () => {
      renderWithProviders(<SettingsBar {...defaultProps} />);

      expect(screen.getByLabelText('Page Header')).toBeInTheDocument();
      expect(screen.getByLabelText('Flatten')).toBeInTheDocument();
      expect(screen.getByLabelText('References')).toBeInTheDocument();
      expect(screen.getByLabelText('Frontmatter')).toBeInTheDocument();
      expect(screen.getByLabelText('Debug')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const checkbox = screen.getByLabelText('Page Header');
      checkbox.focus();

      expect(checkbox).toHaveFocus();
    });

    it('should have proper text contrast', () => {
      renderWithProviders(<SettingsBar {...defaultProps} />);
      const configLabel = screen.getByText('Export Config');
      expect(configLabel).toHaveClass('text-gray-500');
    });
  });

  describe('Multiple Settings Changes', () => {
    it('should handle toggling multiple settings', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      await user.click(screen.getByLabelText('Page Header'));
      await user.click(screen.getByLabelText('Flatten'));
      await user.click(screen.getByLabelText('Debug'));

      expect(defaultProps.onSettingChange).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid checkbox toggles', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SettingsBar {...defaultProps} />);

      const checkbox = screen.getByLabelText('Page Header');

      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      expect(defaultProps.onSettingChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all settings enabled', () => {
      const allEnabled = {
        ...defaultSettings,
        includePageName: true,
        flattenNested: true,
        preserveBlockRefs: true,
        includeProperties: true,
        debug: true,
      };

      renderWithProviders(
        <SettingsBar {...defaultProps} settings={allEnabled} />
      );

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      checkboxes.forEach((checkbox) => {
        expect(checkbox.checked).toBe(true);
      });
    });

    it('should handle all settings disabled', () => {
      const allDisabled = {
        ...defaultSettings,
        includePageName: false,
        flattenNested: false,
        preserveBlockRefs: false,
        includeProperties: false,
        debug: false,
      };

      renderWithProviders(
        <SettingsBar {...defaultProps} settings={allDisabled} />
      );

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      checkboxes.forEach((checkbox) => {
        expect(checkbox.checked).toBe(false);
      });
    });
  });
});
