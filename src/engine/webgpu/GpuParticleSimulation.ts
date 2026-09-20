export interface ParticleSimulationOptions {
  count: number;
  maxCount?: number;
  gravity?: [number, number, number];
  damping?: number;
}

export interface ParticleSimulationFrame {
  positions: Float32Array;
  velocities: Float32Array;
}

export const PARTICLE_WGSL = /* wgsl */ `
struct Particle {
  position : vec4<f32>,
  velocity : vec4<f32>,
};

struct SimParams {
  dt : f32,
  damping : f32,
  gravity : vec3<f32>,
};

@group(0) @binding(0)
var<storage, read_write> particles : array<Particle>;

@group(0) @binding(1)
var<uniform> params : SimParams;

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let index = gid.x;
  if (index >= arrayLength(&particles)) {
    return;
  }

  var particle = particles[index];
  particle.velocity.xyz += params.gravity * params.dt;
  particle.velocity.xyz *= pow(params.damping, params.dt);
  particle.position.xyz += particle.velocity.xyz * params.dt;

  if (particle.position.y < 0.0) {
    particle.position.y = 0.0;
    particle.velocity.y *= -0.35;
  }

  particles[index] = particle;
}
`;

interface GpuBufferLike {
  destroy(): void;
}

interface GpuDeviceLike {
  createShaderModule(descriptor: { code: string }): unknown;
  createComputePipeline(descriptor: unknown): unknown;
  createBuffer(descriptor: { size: number; usage: number }): GpuBufferLike;
  createBindGroup(descriptor: unknown): unknown;
  queue: {
    writeBuffer(
      buffer: GpuBufferLike,
      bufferOffset: number,
      data: ArrayBuffer | ArrayBufferView,
    ): void;
    submit(commandBuffers: unknown[]): void;
  };
  createCommandEncoder(): {
    beginComputePass(): {
      setPipeline(pipeline: unknown): void;
      setBindGroup(index: number, bindGroup: unknown): void;
      dispatchWorkgroups(count: number): void;
      end(): void;
    };
    finish(): unknown;
  };
}

const GPU_BUFFER_STORAGE = 0x0080;
const GPU_BUFFER_UNIFORM = 0x0040;

export class GpuParticleSimulation {
  private readonly count: number;
  private readonly gravity: [number, number, number];
  private readonly damping: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private interleaved: Float32Array;
  private device: GpuDeviceLike | null = null;
  private particleBuffer: GpuBufferLike | null = null;
  private parameterBuffer: GpuBufferLike | null = null;
  private pipeline: unknown = null;
  private bindGroup: unknown = null;
  private gpuReady = false;

  constructor(options: ParticleSimulationOptions) {
    const maxCount = Math.max(1, Math.floor(options.maxCount ?? 500_000));
    this.count = Math.min(Math.max(1, Math.floor(options.count)), maxCount);
    this.gravity = options.gravity ?? [0, -9.81, 0];
    this.damping = Math.min(1, Math.max(0, options.damping ?? 0.995));
    this.positions = new Float32Array(this.count * 4);
    this.velocities = new Float32Array(this.count * 4);
    this.interleaved = new Float32Array(this.count * 8);

    for (let i = 0; i < this.count; i += 1) {
      this.positions[i * 4 + 1] = 1 + (i % 200) * 0.01;
      this.positions[i * 4 + 3] = 1;
      this.velocities[i * 4 + 3] = 1;
    }
    this.packInterleaved();
  }

  get particleCount() {
    return this.count;
  }

  async initializeWebGPU(device: GpuDeviceLike): Promise<boolean> {
    try {
      this.device = device;

      const shader = device.createShaderModule({ code: PARTICLE_WGSL });
      this.pipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: shader, entryPoint: "main" },
      });

      this.particleBuffer = device.createBuffer({
        size: this.interleaved.byteLength,
        usage: GPU_BUFFER_STORAGE | 0x0008,
      });

      this.parameterBuffer = device.createBuffer({
        size: 32,
        usage: GPU_BUFFER_UNIFORM | 0x0008,
      });

      this.bindGroup = device.createBindGroup({
        layout: (this.pipeline as { getBindGroupLayout: (index: number) => unknown })
          .getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.particleBuffer } },
          { binding: 1, resource: { buffer: this.parameterBuffer } },
        ],
      });

      device.queue.writeBuffer(this.particleBuffer, 0, this.interleaved);

      this.gpuReady = true;
      return true;
    } catch (error) {
      console.warn("[EngineCore] GPU particle pipeline unavailable.", error);
      this.gpuReady = false;
      return false;
    }
  }

  step(dt: number) {
    if (this.gpuReady && this.device && this.pipeline && this.bindGroup && this.parameterBuffer) {
      const parameters = new Float32Array([
        dt,
        this.damping,
        this.gravity[0],
        this.gravity[1],
        this.gravity[2],
        0,
        0,
        0,
      ]);

      this.device.queue.writeBuffer(this.parameterBuffer, 0, parameters);

      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.dispatchWorkgroups(Math.ceil(this.count / 128));
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      return;
    }

    this.stepCpu(dt);
  }

  readCpuFallback(): ParticleSimulationFrame {
    return {
      positions: this.positions,
      velocities: this.velocities,
    };
  }

  dispose() {
    this.particleBuffer?.destroy();
    this.parameterBuffer?.destroy();
    this.particleBuffer = null;
    this.parameterBuffer = null;
    this.device = null;
    this.pipeline = null;
    this.bindGroup = null;
    this.gpuReady = false;
  }

  private packInterleaved() {
    for (let i = 0; i < this.count; i += 1) {
      const source = i * 4;
      const target = i * 8;
      this.interleaved.set(this.positions.subarray(source, source + 4), target);
      this.interleaved.set(this.velocities.subarray(source, source + 4), target + 4);
    }
  }

  private stepCpu(dt: number) {
    const frameDamping = Math.pow(this.damping, dt);

    for (let i = 0; i < this.count; i += 1) {
      const offset = i * 4;
      this.velocities[offset] += this.gravity[0] * dt;
      this.velocities[offset + 1] += this.gravity[1] * dt;
      this.velocities[offset + 2] += this.gravity[2] * dt;

      this.velocities[offset] *= frameDamping;
      this.velocities[offset + 1] *= frameDamping;
      this.velocities[offset + 2] *= frameDamping;

      this.positions[offset] += this.velocities[offset] * dt;
      this.positions[offset + 1] += this.velocities[offset + 1] * dt;
      this.positions[offset + 2] += this.velocities[offset + 2] * dt;

      if (this.positions[offset + 1] < 0) {
        this.positions[offset + 1] = 0;
        this.velocities[offset + 1] *= -0.35;
      }
    }
  }
}
