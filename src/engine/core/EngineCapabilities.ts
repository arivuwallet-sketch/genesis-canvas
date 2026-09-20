export type RenderBackend = "webgpu" | "webgl2";
export type SimulationBackend = "gpu-compute" | "cpu-worker";
export type SpatialIndexBackend = "worker-bvh" | "main-thread";

export interface EngineCapabilities {
  renderBackend: RenderBackend;
  simulationBackend: SimulationBackend;
  spatialIndexBackend: SpatialIndexBackend;
  supportsWebGPU: boolean;
  supportsOffscreenCanvas: boolean;
  supportsSharedArrayBuffer: boolean;
  maxRecommendedParticles: number;
  maxRecommendedInstances: number;
}

const supportsSharedArrayBuffer =
  typeof SharedArrayBuffer !== "undefined" &&
  typeof crossOriginIsolated !== "undefined" &&
  crossOriginIsolated;

export function detectEngineCapabilities(): EngineCapabilities {
  const supportsWebGPU =
    typeof navigator !== "undefined" &&
    "gpu" in navigator;

  const supportsOffscreenCanvas =
    typeof OffscreenCanvas !== "undefined";

  return {
    renderBackend: supportsWebGPU ? "webgpu" : "webgl2",
    simulationBackend: supportsWebGPU ? "gpu-compute" : "cpu-worker",
    spatialIndexBackend: supportsOffscreenCanvas ? "worker-bvh" : "main-thread",
    supportsWebGPU,
    supportsOffscreenCanvas,
    supportsSharedArrayBuffer,
    maxRecommendedParticles: supportsWebGPU ? 250_000 : 50_000,
    maxRecommendedInstances: supportsWebGPU ? 250_000 : 100_000,
  };
}
