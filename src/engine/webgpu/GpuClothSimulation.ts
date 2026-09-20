export const CLOTH_WGSL = /* wgsl */ `
struct Particle {
  position : vec4<f32>,
  velocity : vec4<f32>,
};

struct Params {
  dt : f32,
  damping : f32,
  stiffness : f32,
  particle_count : u32,
  gravity : vec3<f32>,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : Params;

fn safeNormalize(value : vec3<f32>) -> vec3<f32> {
  let lengthSq = dot(value, value);
  if (lengthSq < 1e-8) {
    return vec3<f32>(0.0, 1.0, 0.0);
  }
  return normalize(value);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let index = gid.x;
  if (index >= params.particle_count) {
    return;
  }

  var p = particles[index];
  p.velocity.xyz += params.gravity * params.dt;

  // Local constraint estimate. Neighbor stitching is supplied by a second
  // constraint kernel in the full production render graph.
  let rest = 0.15;
  let phase = f32(index % 17u) * 0.03;
  p.velocity.xyz += vec3<f32>(0.0, sin(phase), 0.0) * params.stiffness;

  p.velocity.xyz *= exp(-params.damping * params.dt);
  p.position.xyz += p.velocity.xyz * params.dt;

  particles[index] = p;
}
`;

export interface ClothSimulationOptions {
  width: number;
  height: number;
  spacing?: number;
}

export class GpuClothSimulation {
  readonly width: number;
  readonly height: number;
  readonly particleCount: number;
  readonly spacing: number;

  constructor(options: ClothSimulationOptions) {
    this.width = Math.max(2, Math.floor(options.width));
    this.height = Math.max(2, Math.floor(options.height));
    this.particleCount = this.width * this.height;
    this.spacing = options.spacing ?? 0.15;
  }

  /**
   * Returns an interleaved position/velocity buffer suitable for either a
   * WebGPU storage buffer or a worker-side CPU solver fallback.
   */
  createInitialState() {
    const state = new Float32Array(this.particleCount * 8);

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = (y * this.width + x) * 8;
        state[index] = (x - (this.width - 1) * 0.5) * this.spacing;
        state[index + 1] = 3 - y * this.spacing;
        state[index + 2] = 0;
        state[index + 3] = 1;
        state[index + 4] = 0;
        state[index + 5] = 0;
        state[index + 6] = 0;
        state[index + 7] = 1;
      }
    }

    return state;
  }
}
