import { Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useVfxStore, type ParticleEmitter, type ParticlePreset } from "../store/useVfxStore";

type Preset = {
  count: number;
  lifespan: number;
  gravity: number;
  spread: number;
  speed: number;
  size: number;
  color: string;
  fade: boolean;
};

const PRESETS: Record<ParticlePreset, Preset> = {
  explosion: { count: 140, lifespan: 1.15, gravity: -2.8, spread: 1, speed: 9, size: 0.09, color: "#ff9f43", fade: true },
  smoke: { count: 90, lifespan: 2.8, gravity: 0.45, spread: 0.7, speed: 2.2, size: 0.22, color: "#8c928e", fade: true },
  magic_sparkle: { count: 90, lifespan: 1.9, gravity: 0.7, spread: 1.25, speed: 3.5, size: 0.065, color: "#b6f36a", fade: true },
  weather_rain: { count: 700, lifespan: 3.5, gravity: -17, spread: 7, speed: 9, size: 0.035, color: "#86c7ff", fade: false },
};

interface ParticleSeed {
  offset: [number, number, number];
  velocity: [number, number, number];
  delay: number;
  phase: number;
}

const seeded = (value: number) => {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function makeSeeds(emitterId: string, preset: Preset): ParticleSeed[] {
  let hash = 0;
  for (let i = 0; i < emitterId.length; i++) hash = (hash * 31 + emitterId.charCodeAt(i)) | 0;

  return Array.from({ length: preset.count }, (_, i) => {
    const a = seeded(hash + i * 1.17);
    const b = seeded(hash + i * 2.31 + 4);
    const c = seeded(hash + i * 3.73 + 9);
    const angle = a * Math.PI * 2;
    const radius = Math.pow(b, 0.55) * preset.spread;
    const speed = preset.speed * (0.55 + seeded(hash + i * 4.11) * 0.8);

    return {
      offset: [Math.cos(angle) * radius, (c - 0.25) * preset.spread, Math.sin(angle) * radius],
      velocity: [Math.cos(angle) * speed, (seeded(hash + i * 5.07) - 0.2) * speed, Math.sin(angle) * speed],
      delay: seeded(hash + i * 6.13) * preset.lifespan * 0.35,
      phase: seeded(hash + i * 7.19) * Math.PI * 2,
    };
  });
}

function ParticleEmitterView({ emitter }: { emitter: ParticleEmitter }) {
  const preset = PRESETS[emitter.type];
  const refs = useRef<Array<THREE.Object3D | null>>([]);
  const seeds = useMemo(() => makeSeeds(emitter.id, preset), [emitter.id, preset]);

  useFrame((state) => {
    const elapsed = (performance.now() - emitter.createdAt) / 1000;
    for (let i = 0; i < seeds.length; i++) {
      const object = refs.current[i];
      if (!object) continue;
      const particle = seeds[i]!;
      const age = elapsed - particle.delay;

      if (age < 0 || age >= preset.lifespan) {
        object.visible = false;
        continue;
      }

      object.visible = true;
      const t = age / preset.lifespan;
      const drift = Math.sin(state.clock.elapsedTime * 2 + particle.phase) * 0.08;
      const gravityOffset = 0.5 * preset.gravity * age * age;
      object.position.set(
        emitter.position[0] + particle.offset[0] + particle.velocity[0] * age,
        emitter.position[1] + particle.offset[1] + particle.velocity[1] * age + gravityOffset,
        emitter.position[2] + particle.offset[2] + particle.velocity[2] * age + drift,
      );
      const pulse = 1 + Math.sin(particle.phase + age * 9) * 0.18;
      const fade = preset.fade ? 1 - t : 1;
      object.scale.setScalar(preset.size * pulse * Math.max(0.05, fade));
    }
  });

  return (
    <Instances limit={preset.count} range={preset.count} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={preset.color} transparent opacity={preset.fade ? 0.72 : 0.58} depthWrite={false} />
      {seeds.map((_, index) => (
        <Instance
          key={index}
          ref={(object) => {
            refs.current[index] = object;
          }}
          position={emitter.position}
        />
      ))}
    </Instances>
  );
}

export function ParticleManager() {
  const emitters = useVfxStore((state) => state.emitters);
  const removeEmitter = useVfxStore((state) => state.removeEmitter);

  useEffect(() => {
    if (emitters.length === 0) return;
    const timers = emitters.map((emitter) => {
      const remaining = Math.max(0, PRESETS[emitter.type].lifespan * 1000 + 80 - (performance.now() - emitter.createdAt));
      return window.setTimeout(() => removeEmitter(emitter.id), remaining);
    });
    return () => timers.forEach(window.clearTimeout);
  }, [emitters, removeEmitter]);

  return (
    <group name="ParticleManager">
      {emitters.map((emitter) => (
        <ParticleEmitterView key={emitter.id} emitter={emitter} />
      ))}
    </group>
  );
}

export { PRESETS as PARTICLE_PRESETS };
