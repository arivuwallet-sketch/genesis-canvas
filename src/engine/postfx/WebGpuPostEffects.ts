import type { Vector2 } from "three";

export interface PostEffectSettings {
  taaFeedback: number;
  ssgiRadius: number;
  ssgiIntensity: number;
  volumetricDensity: number;
  volumetricScattering: number;
  exposure: number;
  autoExposureSpeed: number;
}

export const DEFAULT_POST_EFFECTS: PostEffectSettings = {
  taaFeedback: 0.92,
  ssgiRadius: 1.5,
  ssgiIntensity: 1.0,
  volumetricDensity: 0.015,
  volumetricScattering: 0.7,
  exposure: 1.0,
  autoExposureSpeed: 1.5,
};

export interface ExposureSample {
  averageLuminance: number;
  targetExposure: number;
}

export function adaptExposure(
  sample: ExposureSample,
  currentExposure: number,
  dt: number,
  speed: number,
): number {
  const alpha = 1 - Math.exp(-Math.max(0, speed) * Math.max(0, dt));
  return currentExposure + (sample.targetExposure - currentExposure) * alpha;
}

/**
 * WebGPU/TSL post-FX contract.
 *
 * These WGSL kernels are intentionally kept as pure kernels so a future
 * render-graph can bind them to MRT depth/normal/history textures without
 * coupling them to a specific postprocessing package.
 */
export const SSGI_WGSL = /* wgsl */ `
@group(0) @binding(0) var colorTex : texture_2d<f32>;
@group(0) @binding(1) var depthTex : texture_depth_2d;
@group(0) @binding(2) var normalTex : texture_2d<f32>;
@group(0) @binding(3) var samp : sampler;

fn edgeStop(centerDepth : f32, sampleDepth : f32) -> f32 {
  return 1.0 - smoothstep(0.0, 0.04, abs(centerDepth - sampleDepth));
}

@fragment
fn main(@builtin(position) pixel : vec4<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(colorTex, 0));
  let uv = pixel.xy / dims;
  let base = textureSample(colorTex, samp, uv);
  let depth = textureSampleLevel(depthTex, samp, uv, 0.0);
  let normal = textureSample(colorTex, samp, uv);

  // Four-tap screen-space indirect estimate. A production pass should replace
  // this with a cosine-weighted hemisphere sample pattern and temporal reuse.
  let offsets = array<vec2<f32>, 4>(
    vec2<f32>( 0.004, 0.0),
    vec2<f32>(-0.004, 0.0),
    vec2<f32>(0.0,  0.004),
    vec2<f32>(0.0, -0.004)
  );

  var indirect = vec3<f32>(0.0);
  for (var i = 0u; i < 4u; i++) {
    let sampleUv = clamp(uv + offsets[i], vec2<f32>(0.0), vec2<f32>(1.0));
    let sampleColor = textureSample(colorTex, samp, sampleUv).rgb;
    let sampleDepth = textureSampleLevel(depthTex, samp, sampleUv, 0.0);
    let weight = edgeStop(depth, sampleDepth);
    indirect += sampleColor * weight;
  }

  indirect *= 0.25;
  return vec4<f32>(base.rgb + indirect * 0.15 + normal.rgb * 0.0, base.a);
}
`;

export const VOLUMETRIC_SHAFTS_WGSL = /* wgsl */ `
@group(0) @binding(0) var colorTex : texture_2d<f32>;
@group(0) @binding(1) var depthTex : texture_depth_2d;
@group(0) @binding(2) var samp : sampler;

struct Params {
  lightUv : vec2<f32>,
  density : f32,
  scattering : f32,
};

@group(0) @binding(3) var<uniform> params : Params;

@fragment
fn main(@builtin(position) pixel : vec4<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(colorTex, 0));
  let uv = pixel.xy / dims;
  let base = textureSample(colorTex, samp, uv);

  var rayUv = uv;
  var illumination = 0.0;
  for (var i = 0u; i < 12u; i++) {
    rayUv = mix(rayUv, params.lightUv, 0.07);
    let depth = textureSampleLevel(depthTex, samp, rayUv, 0.0);
    illumination += (1.0 - depth) * 0.0833333;
  }

  let shaft = illumination * params.density * params.scattering;
  return vec4<f32>(base.rgb + vec3<f32>(shaft), base.a);
}
`;

export const TAA_WGSL = /* wgsl */ `
@group(0) @binding(0) var currentTex : texture_2d<f32>;
@group(0) @binding(1) var historyTex : texture_2d<f32>;
@group(0) @binding(2) var samp : sampler;

struct Params {
  feedback : f32,
  jitter : vec2<f32>,
};

@group(0) @binding(3) var<uniform> params : Params;

@fragment
fn main(@builtin(position) pixel : vec4<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(currentTex, 0));
  let uv = pixel.xy / dims;
  let current = textureSample(currentTex, samp, uv);
  let history = textureSample(historyTex, samp, clamp(uv + params.jitter / dims, vec2<f32>(0.0), vec2<f32>(1.0)));

  let velocityWeight = 1.0 - abs(params.jitter.x) - abs(params.jitter.y);
  let feedback = clamp(params.feedback * velocityWeight, 0.0, 0.98);
  return mix(current, history, feedback);
}
`;

export const EXPOSURE_WGSL = /* wgsl */ `
struct Params {
  exposure : f32,
};

@group(0) @binding(0) var<uniform> params : Params;

@fragment
fn main() -> @location(0) vec4<f32> {
  return vec4<f32>(params.exposure, params.exposure, params.exposure, 1.0);
}
`;

export function haltonJitter(frame: number): Vector2 {
  const halton = (index: number, base: number) => {
    let result = 0;
    let fraction = 1 / base;
    let value = index;
    while (value > 0) {
      result += (value % base) * fraction;
      value = Math.floor(value / base);
      fraction /= base;
    }
    return result;
  };

  return {
    x: halton(frame + 1, 2) - 0.5,
    y: halton(frame + 1, 3) - 0.5,
  } as Vector2;
}
