import React from "react";
import { ExportSettings, SettingOption } from "../types";

type SettingsBarProps = {
  settings: ExportSettings;
  onSettingChange: (key: keyof ExportSettings) => void;
  onAssetPathChange: (value: string) => void;
};

const SETTING_OPTIONS: SettingOption[] = [
  { key: 'includePageName', label: 'Page Header' },
  { key: 'flattenNested', label: 'Flatten' },
  { key: 'preserveBlockRefs', label: 'References' },
  { key: 'includeProperties', label: 'Frontmatter' },
  { key: 'debug', label: 'Debug' },
];

export const SettingsBar = ({
  settings,
  onSettingChange,
  onAssetPathChange,
}: SettingsBarProps) => {
  return (
    <div className="px-3 py-1.5 border-b border-gray-800/40 bg-gray-900/80 flex items-center gap-3">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Export Config</span>
      <div className="flex items-center gap-2 flex-1">
        {SETTING_OPTIONS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={settings[key] as boolean}
              onChange={() => onSettingChange(key)}
              className="w-3 h-3 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-[11px] text-gray-400 group-hover:text-gray-300 select-none">{label}</span>
          </label>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[11px] text-gray-400">Asset Path:</span>
          <input
            type="text"
            value={settings.assetPath}
            onChange={(e) => onAssetPathChange(e.target.value)}
            className="w-28 px-1.5 py-0.5 text-[11px] bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none focus:border-blue-500"
            placeholder="assets/"
          />
        </div>
      </div>
    </div>
  );
};