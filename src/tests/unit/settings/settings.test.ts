import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getExportSettings, updateExportSetting, settingsSchema } from '../../../settings';
import type { ExportSettings } from '../../../types';

/**
 * Settings test suite
 * Tests settings retrieval, updates, and schema
 */

describe('Export Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock logseq global
    (global as any).logseq = {
      settings: {},
      updateSettings: vi.fn(),
    };
  });

  describe('getExportSettings', () => {
    it('should return default settings when no settings stored', () => {
      (global as any).logseq.settings = {};

      const settings = getExportSettings();

      expect(settings.includePageName).toBe(false);
      expect(settings.flattenNested).toBe(true);
      expect(settings.preserveBlockRefs).toBe(true);
      expect(settings.includeProperties).toBe(true);
      expect(settings.assetPath).toBe('assets/');
      expect(settings.debug).toBe(false);
    });

    it('should retrieve boolean settings correctly', () => {
      (global as any).logseq.settings = {
        includePageName: true,
        flattenNested: false,
        preserveBlockRefs: true,
      };

      const settings = getExportSettings();

      expect(settings.includePageName).toBe(true);
      expect(settings.flattenNested).toBe(false);
      expect(settings.preserveBlockRefs).toBe(true);
    });

    it('should retrieve string settings correctly', () => {
      (global as any).logseq.settings = {
        assetPath: '/custom/assets',
      };

      const settings = getExportSettings();

      expect(settings.assetPath).toBe('/custom/assets');
    });

    it('should handle all boolean settings', () => {
      (global as any).logseq.settings = {
        includePageName: true,
        flattenNested: true,
        preserveBlockRefs: true,
        includeProperties: true,
        debug: true,
      };

      const settings = getExportSettings();

      expect(settings.includePageName).toBe(true);
      expect(settings.flattenNested).toBe(true);
      expect(settings.preserveBlockRefs).toBe(true);
      expect(settings.includeProperties).toBe(true);
      expect(settings.debug).toBe(true);
    });

    it('should coerce values to correct types', () => {
      (global as any).logseq.settings = {
        includePageName: 'true', // String instead of boolean
        flattenNested: 1, // Number instead of boolean
        assetPath: 123, // Number instead of string
      };

      const settings = getExportSettings();

      expect(typeof settings.includePageName).toBe('boolean');
      expect(typeof settings.flattenNested).toBe('boolean');
      expect(typeof settings.assetPath).toBe('string');
    });

    it('should use defaults for missing settings', () => {
      (global as any).logseq.settings = {
        includePageName: true,
        // Other settings missing
      };

      const settings = getExportSettings();

      expect(settings.includePageName).toBe(true);
      expect(settings.flattenNested).toBe(true); // Default
      expect(settings.preserveBlockRefs).toBe(true); // Default
      expect(settings.assetPath).toBe('assets/'); // Default
    });

    it('should return all required settings properties', () => {
      const settings = getExportSettings();

      expect(settings).toHaveProperty('includePageName');
      expect(settings).toHaveProperty('flattenNested');
      expect(settings).toHaveProperty('preserveBlockRefs');
      expect(settings).toHaveProperty('includeProperties');
      expect(settings).toHaveProperty('assetPath');
      expect(settings).toHaveProperty('debug');
    });

    it('should handle null settings gracefully', () => {
      (global as any).logseq.settings = null;

      const settings = getExportSettings();

      expect(settings.includePageName).toBe(false);
      expect(settings.assetPath).toBe('assets/');
    });

    it('should handle undefined settings gracefully', () => {
      (global as any).logseq.settings = undefined;

      const settings = getExportSettings();

      expect(settings.includePageName).toBe(false);
      expect(settings.assetPath).toBe('assets/');
    });
  });

  describe('updateExportSetting', () => {
    it('should update boolean setting', () => {
      updateExportSetting('includePageName', true);

      expect((global as any).logseq.updateSettings).toHaveBeenCalledWith({
        includePageName: true,
      });
    });

    it('should update string setting', () => {
      updateExportSetting('assetPath', '/new/path');

      expect((global as any).logseq.updateSettings).toHaveBeenCalledWith({
        assetPath: '/new/path',
      });
    });

    it('should update single setting at a time', () => {
      updateExportSetting('debug', true);
      updateExportSetting('flattenNested', false);

      expect((global as any).logseq.updateSettings).toHaveBeenCalledTimes(2);
    });

    it('should handle all setting keys', () => {
      const keys: (keyof ExportSettings)[] = [
        'includePageName',
        'flattenNested',
        'preserveBlockRefs',
        'includeProperties',
        'assetPath',
        'debug',
      ];

      keys.forEach(key => {
        vi.clearAllMocks();
        updateExportSetting(key, 'test');
        expect((global as any).logseq.updateSettings).toHaveBeenCalled();
      });
    });

    it('should preserve other settings on update', () => {
      (global as any).logseq.settings = {
        includePageName: true,
        flattenNested: false,
        assetPath: '/assets',
      };

      updateExportSetting('debug', true);

      expect((global as any).logseq.updateSettings).toHaveBeenCalledWith({
        debug: true,
      });
      // Other settings should remain unchanged in storage
    });
  });

  describe('Settings Schema', () => {
    it('should have schema for all settings', () => {
      const keys = settingsSchema.map(s => s.key);

      expect(keys).toContain('includePageName');
      expect(keys).toContain('flattenNested');
      expect(keys).toContain('preserveBlockRefs');
      expect(keys).toContain('includeProperties');
      expect(keys).toContain('assetPath');
      expect(keys).toContain('debug');
    });

    it('should have proper schema structure', () => {
      settingsSchema.forEach(setting => {
        expect(setting).toHaveProperty('key');
        expect(setting).toHaveProperty('type');
        expect(setting).toHaveProperty('default');
        expect(setting).toHaveProperty('title');
        expect(setting).toHaveProperty('description');
      });
    });

    it('should have correct types in schema', () => {
      const booleanSettings = settingsSchema.filter(
        s => s.key === 'includePageName' || s.key === 'debug'
      );
      booleanSettings.forEach(setting => {
        expect(setting.type).toBe('boolean');
      });

      const stringSettings = settingsSchema.filter(s => s.key === 'assetPath');
      stringSettings.forEach(setting => {
        expect(setting.type).toBe('string');
      });
    });

    it('should have correct defaults in schema', () => {
      const schema = {
        includePageName: settingsSchema.find(s => s.key === 'includePageName'),
        flattenNested: settingsSchema.find(s => s.key === 'flattenNested'),
        assetPath: settingsSchema.find(s => s.key === 'assetPath'),
      };

      expect(schema.includePageName?.default).toBe(false);
      expect(schema.flattenNested?.default).toBe(true);
      expect(schema.assetPath?.default).toBe('assets/');
    });

    it('should have descriptive titles and descriptions', () => {
      settingsSchema.forEach(setting => {
        expect(setting.title).toBeTruthy();
        expect(setting.title.length).toBeGreaterThan(0);
        expect(setting.description).toBeTruthy();
        expect(setting.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Type Safety', () => {
    it('should return settings with correct types', () => {
      const settings = getExportSettings();

      expect(typeof settings.includePageName).toBe('boolean');
      expect(typeof settings.flattenNested).toBe('boolean');
      expect(typeof settings.preserveBlockRefs).toBe('boolean');
      expect(typeof settings.includeProperties).toBe('boolean');
      expect(typeof settings.assetPath).toBe('string');
      expect(typeof settings.debug).toBe('boolean');
    });

    it('should handle type coercion correctly', () => {
      (global as any).logseq.settings = {
        includePageName: 1,
        assetPath: null,
      };

      const settings = getExportSettings();

      expect(typeof settings.includePageName).toBe('boolean');
      expect(settings.includePageName).toBe(true);
      expect(typeof settings.assetPath).toBe('string');
      expect(settings.assetPath).toBe('assets/');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string for assetPath', () => {
      (global as any).logseq.settings = {
        assetPath: '',
      };

      const settings = getExportSettings();

      expect(settings.assetPath).toBe('');
    });

    it('should handle very long asset path', () => {
      const longPath = '/'.repeat(100) + 'assets';
      (global as any).logseq.settings = {
        assetPath: longPath,
      };

      const settings = getExportSettings();

      expect(settings.assetPath).toBe(longPath);
    });

    it('should handle special characters in asset path', () => {
      (global as any).logseq.settings = {
        assetPath: '/path/with-special_chars/123',
      };

      const settings = getExportSettings();

      expect(settings.assetPath).toBe('/path/with-special_chars/123');
    });

    it('should handle settings with extra properties', () => {
      (global as any).logseq.settings = {
        includePageName: true,
        extraProperty: 'should be ignored',
        anotherExtra: 123,
      };

      const settings = getExportSettings();

      expect(settings.includePageName).toBe(true);
      expect(Object.keys(settings).length).toBeGreaterThan(0);
    });
  });

  describe('Settings Consistency', () => {
    it('should return consistent defaults', () => {
      (global as any).logseq.settings = {};

      const settings1 = getExportSettings();
      const settings2 = getExportSettings();

      expect(settings1).toEqual(settings2);
    });

    it('should round-trip settings correctly', () => {
      const original: ExportSettings = {
        includePageName: true,
        flattenNested: false,
        preserveBlockRefs: true,
        includeProperties: false,
        assetPath: '/custom/path',
        debug: true,
      };

      (global as any).logseq.settings = {
        includePageName: original.includePageName,
        flattenNested: original.flattenNested,
        preserveBlockRefs: original.preserveBlockRefs,
        includeProperties: original.includeProperties,
        assetPath: original.assetPath,
        debug: original.debug,
      };

      const retrieved = getExportSettings();

      expect(retrieved.includePageName).toBe(original.includePageName);
      expect(retrieved.flattenNested).toBe(original.flattenNested);
      expect(retrieved.preserveBlockRefs).toBe(original.preserveBlockRefs);
      expect(retrieved.assetPath).toBe(original.assetPath);
      expect(retrieved.debug).toBe(original.debug);
    });
  });
});
