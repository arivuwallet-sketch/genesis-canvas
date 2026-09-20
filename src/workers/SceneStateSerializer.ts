import { useEcsStore, type EcsEntityRecord } from "../store/useEcsStore";
import { useSceneStore } from "../store/useSceneStore";

export interface SceneStateDelta {
  v: 1;
  t: number;
  added: CompactEntity[];
  updated: CompactEntity[];
  removed: string[];
}

export interface SceneStateSnapshot {
  v: 1;
  t: number;
  delta: SceneStateDelta;
  entity_count: number;
}

type CompactEntity = [
  string, string, number, number, number, number, number, number,
  number, number, number, string, number, number, number, number
];

const round = (value: number) => Math.round(value * 100) / 100;

const compactEntity = (entity: EcsEntityRecord): CompactEntity => [
  entity.id, entity.category,
  round(entity.transform.position[0]), round(entity.transform.position[1]), round(entity.transform.position[2]),
  round(entity.transform.scale[0]), round(entity.transform.scale[1]), round(entity.transform.scale[2]),
  round(entity.bounds.size[0]), round(entity.bounds.size[1]), round(entity.bounds.size[2]),
  entity.physics.bodyType, round(entity.physics.massKg), round(entity.physics.friction),
  round(entity.physics.restitution), round(entity.physics.gravityScale),
];

const sceneFallbackEntities = (): EcsEntityRecord[] => {
  const scene = useSceneStore.getState();
  const meshEntities = scene.nodes
    .filter((node) => node.visible && node.type === "mesh")
    .map((node) => ({

    id: node.id, name: node.name, category: "prop" as const,
    transform: { position: node.position, rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] },
    bounds: { size: [2, 2, 2] as [number, number, number] },
    physics: { bodyType: "fixed", massKg: 0, friction: 1, restitution: 0, gravityScale: 0 },
  }));

  const networkEntities = scene.networkEntities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    category: entity.type === "player" ? "character" as const : entity.type === "boss" || entity.type === "npc" ? "character" as const : "prop" as const,
    transform: {
      position: entity.position,
      rotation: [0, entity.rotationY, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
    },
    bounds: { size: [2, 2, 2] as [number, number, number] },
    physics: {
      bodyType: "dynamic" as const,
      massKg: 1,
      friction: 1,
      restitution: 0.2,
      gravityScale: 1,
    },
  }));

  const byId = new Map<string, EcsEntityRecord>();
  for (const entity of [...meshEntities, ...networkEntities]) byId.set(entity.id, entity);
  return [...byId.values()];
};

export class SceneStateSerializer {
  private timer: ReturnType<typeof setInterval> | null = null;
  private previous = new Map<string, string>();
  private latest: SceneStateSnapshot = { v: 1, t: 0, delta: { v: 1, t: 0, added: [], updated: [], removed: [] }, entity_count: 0 };
  private started = false;

  start() {
    if (this.started) return;
    this.started = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
  }

  getLatest() {
    if (!this.started) this.start();
    return this.latest;
  }

  getLatestDenseJson() {
    return JSON.stringify(this.getLatest());
  }

  getCurrentDenseJson() {
    if (!this.started) this.start();
    const entities = [...this.previous.values()].map((encoded) => JSON.parse(encoded) as CompactEntity);
    return JSON.stringify({
      v: 1,
      t: this.latest.t,
      entity_count: entities.length,
      entities,
    });
  }

  private tick() {
    const ecs = useEcsStore.getState().entities;
    const fallback = sceneFallbackEntities();
    const byId = new Map<string, EcsEntityRecord>();
    for (const entity of [...fallback, ...ecs]) byId.set(entity.id, entity);
    const entities = [...byId.values()];
    const current = new Map<string, string>();
    const added: CompactEntity[] = [];
    const updated: CompactEntity[] = [];

    for (const entity of entities) {
      const compact = compactEntity(entity);
      const encoded = JSON.stringify(compact);
      current.set(entity.id, encoded);
      if (!this.previous.has(entity.id)) added.push(compact);
      else if (this.previous.get(entity.id) !== encoded) updated.push(compact);
    }

    const removed: string[] = [];
    for (const id of this.previous.keys()) if (!current.has(id)) removed.push(id);

    const now = Date.now();
    this.latest = { v: 1, t: now, delta: { v: 1, t: now, added, updated, removed }, entity_count: current.size };
    this.previous = current;
  }
}

export const sceneStateSerializer = new SceneStateSerializer();
export const startSceneStateSerializer = () => sceneStateSerializer.start();
export const stopSceneStateSerializer = () => sceneStateSerializer.stop();
export const getLatestSceneState = () => sceneStateSerializer.getLatest();
export const getLatestSceneStateJson = () => sceneStateSerializer.getCurrentDenseJson();
export const getLatestSceneStateDeltaJson = () => sceneStateSerializer.getLatestDenseJson();