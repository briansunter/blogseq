import { vi } from 'vitest';

export const LSPlugin = vi.fn();

export interface BlockEntity {
  uuid: string;
  content: string;
  children?: BlockEntity[];
  properties?: Record<string, unknown>;
}

export const logseq = global.logseq;