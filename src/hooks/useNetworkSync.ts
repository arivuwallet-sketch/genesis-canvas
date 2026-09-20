import { useEffect } from "react";
import { useColyseusClient } from "./useColyseusClient";
import { useEditorStore } from "../store/useEditorStore";

/**
 * Bridges the modular multiplayer client into the existing HUD store.
 * The client remains the single transport; this hook only mirrors coarse
 * status/player counts into Zustand and never handles per-frame transforms.
 */
export function useNetworkSync() {
  const client = useColyseusClient();
  const setNetwork = useEditorStore((s) => s.setNetwork);

  useEffect(() => {
    setNetwork({
      status:
        client.status === "connected" || client.status === "simulated"
          ? client.status
          : client.status === "connecting"
            ? "connecting"
            : "offline",
      peers: Math.max(0, client.players.length - 1),
    });
  }, [client.status, client.players.length, setNetwork]);

  return client.players;
}
