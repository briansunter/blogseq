import type { Mock } from 'vitest';
import type { BlockEntity, PageEntity, PageIdentity, BlockIdentity, AppGraphInfo, UIMsgOptions } from '@logseq/libs/dist/LSPlugin';

declare global {
  const logseq: {
    Editor: {
      getCurrentPage: Mock<[], Promise<BlockEntity | PageEntity | null>>;
      getPage: Mock<[uuid: string | number | PageIdentity, opts?: Partial<{ includeChildren: boolean }>], Promise<PageEntity | null>>;
      getBlock: Mock<[uuid: string | number | BlockIdentity, opts?: Partial<{ includeChildren: boolean }>], Promise<BlockEntity | null>>;
      getPageBlocksTree: Mock<[pageUuid: PageIdentity], Promise<BlockEntity[]>>;
    };
    App: {
      getCurrentGraph: Mock<[], Promise<AppGraphInfo | null>>;
    };
    DB: {
      datascriptQuery: Mock<[query: string, ...inputs: unknown[]], Promise<unknown>>;
    };
    UI: {
      showMsg: Mock<[content: string, status?: string, opts?: Partial<UIMsgOptions>], Promise<string>>;
    };
  };
  const fetch: Mock;
}

export {};