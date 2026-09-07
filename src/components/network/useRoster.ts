import { useSyncExternalStore } from "react";
import { getRemotePlayers, subscribeRoster } from "../../network/socketClient";

let cache: string[] = [];

function getSnapshot(): string[] {
  const ids = [...getRemotePlayers().keys()];
  if (ids.length !== cache.length || ids.some((id, i) => cache[i] !== id)) {
    cache = ids;
  }
  return cache;
}

/**
 * Join/leave roster only — never per-frame transforms, so the canvas
 * re-renders only when a peer actually connects or disconnects.
 */
export function useNetworkRoster(): string[] {
  return useSyncExternalStore(
    (cb) => subscribeRoster(cb),
    getSnapshot,
    () => cache,
  );
}
