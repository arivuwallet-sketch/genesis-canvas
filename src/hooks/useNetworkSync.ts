import { useEffect, useState } from "react";
import {
  connect,
  disconnect,
  getPing,
  getRemotePlayers,
  getStatus,
  subscribeRoster,
  type NetworkStatus,
} from "../network/socketClient";
import { useEditorStore } from "../store/useEditorStore";

/**
 * All socket lifecycle + listeners live here. Mounted exactly once, outside
 * the Canvas, so network chatter never re-renders the 3D scene.
 */
export function useNetworkSync() {
  const setNetwork = useEditorStore((s) => s.setNetwork);
  const [roster, setRoster] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const syncRoster = () => {
      if (cancelled) return;
      setRoster([...getRemotePlayers().keys()]);
    };

    const onStatus = (status: NetworkStatus) => {
      if (!cancelled) setNetwork({ status });
    };

    void connect(onStatus);
    const unsub = subscribeRoster(syncRoster);
    syncRoster();

    // Cheap 1 Hz poll for HUD numbers — avoids state churn at packet rate.
    const timer = setInterval(() => {
      if (cancelled) return;
      setNetwork({
        status: getStatus(),
        ping: getPing(),
        peers: getRemotePlayers().size,
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      unsub();
      disconnect();
    };
  }, [setNetwork]);

  return roster;
}
