import { useEcsStore, type EcsBoidFlightLogicComponent, type EcsEntityRecord } from "../store/useEcsStore";
import type { PhysicsProps, SpawnedObject } from "../store/useEditorStore";

export interface EcsSpawnSpec {
  id?: string;
  name: string;
  category?: EcsEntityRecord["category"];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  boundsSize?: [number, number, number];
  physics: PhysicsProps;
  boid?: Partial<EcsBoidFlightLogicComponent>;
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? `ecs-${Math.random().toString(36).slice(2, 14)}`;
const isBoidName = (name: string) => /bird|boid|eagle|crow|flying|flock/.test(name.toLowerCase());

export function spawnEcsBatch(specs: EcsSpawnSpec[]): string[] {
  const entities: EcsEntityRecord[] = specs.map((spec) => {
    const id = spec.id ?? uid();
    const boidEnabled = spec.boid?.enabled ?? isBoidName(spec.name);
    return {
      id,
      name: spec.name,
      category: spec.category ?? "prop",
      transform: { position: spec.position, rotation: spec.rotation, scale: spec.scale },
      bounds: { size: spec.boundsSize ?? [Math.max(0.05, Math.abs(spec.scale[0]) * 2), Math.max(0.05, Math.abs(spec.scale[1]) * 2), Math.max(0.05, Math.abs(spec.scale[2]) * 2)] },
      physics: { bodyType: spec.physics.type, massKg: spec.physics.mass, friction: spec.physics.friction, restitution: spec.physics.restitution, gravityScale: spec.physics.gravityScale },
      ...(boidEnabled ? {
        boidFlightLogic: {
          enabled: true,
          maxSpeed: spec.boid?.maxSpeed ?? 8,
          turnRate: spec.boid?.turnRate ?? 2.5,
          separation: spec.boid?.separation ?? 1.5,
          alignment: spec.boid?.alignment ?? 0.7,
          cohesion: spec.boid?.cohesion ?? 0.55,
        },
      } : {}),
    };
  });
  useEcsStore.getState().upsertEntities(entities);
  return entities.map((entity) => entity.id);
}

export function updateEcsEntity(id: string, patch: Partial<Pick<EcsEntityRecord, "name" | "category" | "transform" | "bounds" | "physics" | "boidFlightLogic">>): boolean {
  const entity = useEcsStore.getState().entities.find((item) => item.id === id);
  if (!entity) return false;
  useEcsStore.getState().upsertEntity({
    ...entity,
    ...patch,
    id,
    transform: { ...entity.transform, ...(patch.transform ?? {}) },
    bounds: { ...entity.bounds, ...(patch.bounds ?? {}) },
    physics: { ...entity.physics, ...(patch.physics ?? {}) },
  });
  return true;
}

export function removeEcsEntity(id: string) { useEcsStore.getState().removeEntity(id); }
export function clearEcs() { useEcsStore.getState().clear(); }

export function ecsEntityFromRenderObject(object: SpawnedObject): EcsEntityRecord {
  const boid = isBoidName(object.name);
  return {
    id: object.id, name: object.name, category: "prop",
    transform: { position: object.position, rotation: object.rotation, scale: object.scale },
    bounds: { size: [Math.max(0.05, Math.abs(object.scale[0]) * 2), Math.max(0.05, Math.abs(object.scale[1]) * 2), Math.max(0.05, Math.abs(object.scale[2]) * 2)] },
    physics: { bodyType: object.physics.type, massKg: object.physics.mass, friction: object.physics.friction, restitution: object.physics.restitution, gravityScale: object.physics.gravityScale },
    ...(boid ? { boidFlightLogic: { enabled: true, maxSpeed: 8, turnRate: 2.5, separation: 1.5, alignment: 0.7, cohesion: 0.55 } } : {}),
  };
}