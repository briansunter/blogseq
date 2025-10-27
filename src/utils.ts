import { LSPluginUserEvents } from '@logseq/libs/dist/LSPlugin.user';
import { useSyncExternalStore } from 'react';

// Safe access to logseq.isMainUIVisible
const getInitialVisibility = (): boolean => {
  if (typeof logseq === 'undefined') return false;
  const visible = Object.prototype.hasOwnProperty.call(logseq, 'isMainUIVisible')
    ? (logseq as unknown as Record<string, unknown>).isMainUIVisible
    : false;
  return Boolean(visible);
};

let _visible = getInitialVisibility();

function subscribeLogseqEvent<T extends LSPluginUserEvents>(
  eventName: T,
  handler: (...args: unknown[]) => void
) {
  logseq.on(eventName, handler);
  return () => {
    logseq.off(eventName, handler);
  };
}

const subscribeToUIVisible = (onChange: () => void) =>
  subscribeLogseqEvent('ui:visible:changed', (...args: unknown[]) => {
    const event = args[0] as { visible: boolean };
    _visible = event.visible;
    onChange();
  });

export const useAppVisible = () => {
  return useSyncExternalStore(subscribeToUIVisible, () => _visible);
};
