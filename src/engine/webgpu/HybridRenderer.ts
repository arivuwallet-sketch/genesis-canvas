import * as THREE from "three";

export interface HybridRendererOptions extends THREE.WebGLRendererParameters {
  forceWebGL?: boolean;
}

export async function createHybridRenderer(
  canvas: HTMLCanvasElement,
  options: HybridRendererOptions = {},
): Promise<THREE.WebGLRenderer> {
  const preferWebGPU =
    options.forceWebGL !== true &&
    typeof navigator !== "undefined" &&
    "gpu" in navigator;

  if (preferWebGPU) {
    try {
      const module = (await import("three/webgpu")) as unknown as {
        WebGPURenderer: new (parameters?: unknown) => THREE.WebGLRenderer & {
          init: () => Promise<void>;
        };
      };

      const renderer = new module.WebGPURenderer({
        canvas,
        antialias: true,
        ...options,
      });

      await renderer.init();
      return renderer;
    } catch (error) {
      console.warn("[EngineCore] WebGPU initialization failed; using WebGL2.", error);
    }
  }

  return new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    ...options,
  });
}
