import { useEffect } from "react";
import { useColyseusClient } from "./useColyseusClient";
import { useEditorStore } from "../store/useEditorStore";
import { useGameConfigStore } from "../store/useGameConfigStore";

/**
 * Bridges the modular multiplayer client into the existing HUD store.
 * The client remains the single transport; this hook only mirrors coarse
 * status/player counts into Zustand and never handles per-frame transforms.
 */
export function useNetworkSync() {
  const client = useColyseusClient();
  const setNetwork = useEditorStore((s) => s.setNetwork);
  const multiplayerMode = useGameConfigStore((s) => s.multiplayerMode);

  useEffect(() => {
    if (multiplayerMode !== "online" && multiplayerMode !== "online-coop" && client.roomId) {
      client.leaveRoom();
      return;
    }

    setNetwork({
      status:
        client.status === "connected" || client.status === "simulated"
          ? client.status
          : client.status === "connecting"
            ? "connecting"
            : "offline",
      peers: Math.max(0, client.players.length - 1),
    });
  }, [client.status, client.players.length, client.roomId, client.leaveRoom, multiplayerMode, setNetwork]);

  return client.players;
}
