import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import { useSyncExternalStore } from "react";

let _visible = logseq.isMainUIVisible;

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
  subscribeLogseqEvent("ui:visible:changed", (...args: unknown[]) => {
    const event = args[0] as { visible: boolean };
    _visible = event.visible;
    onChange();
  });

export const useAppVisible = () => {
  return useSyncExternalStore(subscribeToUIVisible, () => _visible);
};
