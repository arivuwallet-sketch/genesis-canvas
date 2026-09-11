import { create } from "zustand";

export type DisplayMode = "windowed" | "fullscreen";
export type QualityLevel = "low" | "medium" | "high" | "ultra";
export type AntiAliasing = "off" | "fxaa" | "smaa";
export type Upscaling = "native" | "quality" | "balanced" | "performance";

/** Render-scale multipliers used to fake a DLSS/FSR style upscaler via dpr. */
export const UPSCALE_FACTOR: Record<Upscaling, number> = {
  native: 1,
  quality: 0.85,
  balanced: 0.7,
  performance: 0.55,
};

export const SHADOW_MAP_SIZE: Record<QualityLevel, number> = {
  low: 512,
  medium: 1024,
  high: 2048,
  ultra: 4096,
};

export const ANISOTROPY_OPTIONS = [1, 2, 4, 8, 16] as const;

interface GraphicsState {
  /* display */
  resolution: number; // render scale factor 0.5 – 2
  displayMode: DisplayMode;
  upscaling: Upscaling;
  vSync: boolean;
  refreshRate: number;

  /* basic */
  fov: number; // 60 – 120
  drawDistance: number; // camera far plane

  /* textures & geometry */
  textureQuality: QualityLevel;
  modelQuality: QualityLevel; // LOD bias
  anisotropicFiltering: number;

  /* lighting */
  shadowQuality: QualityLevel;
  shadowsEnabled: boolean;
  rayTracing: boolean; // screen space reflections (approximated)
  volumetricFog: boolean;

  /* post */
  antiAliasing: AntiAliasing;
  ambientOcclusion: boolean;
  motionBlur: boolean;
  depthOfField: boolean;
  bloom: boolean;
  bloomIntensity: number;

  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  set: <K extends keyof GraphicsState>(key: K, value: GraphicsState[K]) => void;
  resetDefaults: () => void;
}

const DEFAULTS = {
  resolution: 1,
  displayMode: "windowed" as DisplayMode,
  upscaling: "native" as Upscaling,
  vSync: true,
  refreshRate: 60,

  fov: 75,
  drawDistance: 300,

  textureQuality: "high" as QualityLevel,
  modelQuality: "high" as QualityLevel,
  anisotropicFiltering: 4,

  shadowQuality: "high" as QualityLevel,
  shadowsEnabled: true,
  rayTracing: false,
  volumetricFog: true,

  antiAliasing: "smaa" as AntiAliasing,
  ambientOcclusion: true,
  motionBlur: false,
  depthOfField: false,
  bloom: true,
  bloomIntensity: 0.75,
};

export const useGraphicsStore = create<GraphicsState>((set) => ({
  ...DEFAULTS,
  menuOpen: false,
  setMenuOpen: (open) => set({ menuOpen: open }),
  set: (key, value) => set({ [key]: value } as Partial<GraphicsState>),
  resetDefaults: () => set({ ...DEFAULTS }),
}));
