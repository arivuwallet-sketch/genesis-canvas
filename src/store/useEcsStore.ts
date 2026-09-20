import { create } from "zustand";
import type { PhysicsProps, SpawnedObject } from "./useEditorStore";

export interface EcsTransformComponent {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface EcsBoundsComponent { size: [number, number, number] }

export interface EcsPhysicsComponent {
  bodyType: PhysicsProps["type"];
  massKg: number;
  friction: number;
  restitution: number;
  gravityScale: number;
}

export interface EcsBoidFlightLogicComponent {
  enabled: boolean;
  maxSpeed: number;
  turnRate: number;
  separation: number;
  alignment: number;
  cohesion: number;
}

export interface EcsEntityRecord {
  id: string;
  name: string;
  category: "character" | "vehicle" | "environment" | "prop" | "system";
  transform: EcsTransformComponent;
  bounds: EcsBoundsComponent;
  physics: EcsPhysicsComponent;
  boidFlightLogic?: EcsBoidFlightLogicComponent;
}

interface EcsState {
  entities: EcsEntityRecord[];
  upsertEntity: (entity: EcsEntityRecord) => void;
  upsertEntities: (entities: EcsEntityRecord[]) => void;
  removeEntity: (id: string) => void;
  removeEntities: (ids: string[]) => void;
  clear: () => void;
  replaceFromSpawnedObjects: (objects: SpawnedObject[]) => void;
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `ecs-${Math.random().toString(36).slice(2, 14)}`;

const inferCategory = (object: SpawnedObject): EcsEntityRecord["category"] => {
  const value = object.name.toLowerCase();
  if (/car|truck|van|taxi|suv|vehicle/.test(value)) return "vehicle";
  if (/tree|bush|grass|rock|palm|pine|nature|plant/.test(value)) return "environment";
  if (/character|npc|robot|person|human/.test(value)) return "character";
  return "prop";
};

const inferBoid = (object: SpawnedObject): EcsBoidFlightLogicComponent | undefined => {
  const value = object.name.toLowerCase();
  if (!/bird|boid|eagle|crow|flying|flock/.test(value)) return undefined;
  return { enabled: true, maxSpeed: 8, turnRate: 2.5, separation: 1.5, alignment: 0.7, cohesion: 0.55 };
};

export const spawnedObjectToEcs = (object: SpawnedObject): EcsEntityRecord => ({
  id: object.id || uid(),
  name: object.name,
  category: inferCategory(object),
  transform: { position: object.position, rotation: object.rotation, scale: object.scale },
  bounds: {
    size: [
      Math.max(0.05, Math.abs(object.scale[0]) * 2),
      Math.max(0.05, Math.abs(object.scale[1]) * 2),
      Math.max(0.05, Math.abs(object.scale[2]) * 2),
    ],
  },
  physics: {
    bodyType: object.physics.type,
    massKg: object.physics.mass,
    friction: object.physics.friction,
    restitution: object.physics.restitution,
    gravityScale: object.physics.gravityScale,
  },
  ...(inferBoid(object) ? { boidFlightLogic: inferBoid(object) } : {}),
});

export const useEcsStore = create<EcsState>((set) => ({
  entities: [],
  upsertEntity: (entity) => set((state) => {
    const index = state.entities.findIndex((item) => item.id === entity.id);
    if (index < 0) return { entities: [...state.entities, entity] };
    const next = state.entities.slice();
    next[index] = entity;
    return { entities: next };
  }),
  upsertEntities: (entities) => set((state) => {
    if (entities.length === 0) return state;
    const byId = new Map(state.entities.map((entity) => [entity.id, entity]));
    for (const entity of entities) byId.set(entity.id, entity);
    return { entities: [...byId.values()] };
  }),
  removeEntity: (id) => set((state) => ({ entities: state.entities.filter((entity) => entity.id !== id) })),
  removeEntities: (ids) => {
    const removed = new Set(ids);
    set((state) => ({ entities: state.entities.filter((entity) => !removed.has(entity.id)) }));
  },
  clear: () => set({ entities: [] }),
  replaceFromSpawnedObjects: (objects) => set({ entities: objects.map(spawnedObjectToEcs) }),
}));