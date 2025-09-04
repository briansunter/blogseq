// Core types
export type PreviewMode = "raw" | "rendered";

export type Asset = {
  fileName: string;
  fullPath: string;
  title?: string;
};

export type ExportSettings = {
  includeProperties: boolean;
  preserveBlockRefs: boolean;
  flattenNested: boolean;
  includePageName: boolean;
  assetPath: string;
  debug: boolean;
};

export type SettingOption = {
  key: keyof ExportSettings;
  label: string;
};