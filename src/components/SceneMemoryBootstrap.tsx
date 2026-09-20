import { useEffect } from "react";
import { startSceneStateSerializer, stopSceneStateSerializer } from "../workers/SceneStateSerializer";

export function SceneMemoryBootstrap() {
  useEffect(() => {
    startSceneStateSerializer();
    return () => stopSceneStateSerializer();
  }, []);

  return null;
}
