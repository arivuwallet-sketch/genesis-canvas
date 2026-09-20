import { useEffect } from "react";
import {
  startSceneStateSerializer,
  stopSceneStateSerializer,
} from "../workers/SceneStateSerializer";
import { UniversalStateSync } from "../engine/universal/UniversalStateSync";

export function SceneMemoryBootstrap() {
  useEffect(() => {
    startSceneStateSerializer();

    const url = import.meta.env.VITE_UNIVERSAL_WS_URL;
    const sync = url ? new UniversalStateSync(url) : null;
    sync?.start();

    return () => {
      sync?.stop();
      stopSceneStateSerializer();
    };
  }, []);

  return null;
}
