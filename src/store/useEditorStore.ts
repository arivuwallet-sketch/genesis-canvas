import { create } from "zustand";

export type CameraMode = "first" | "third";
export type GraphicsQuality = "low" | "medium" | "ultra";

export type PrimitiveGeometry =
  | "box"
  | "sphere"
  | "cylinder"
  | "cone"
  | "torus"
  | "capsule";

export interface NetworkState {
  status: "offline" | "connecting" | "connected" | "simulated";
  ping: number;
  peers: number;
}

export interface PhysicsProps {
  type: "dynamic" | "fixed";
  mass: number;
  restitution: number;
  friction: number;
  gravityScale: number;
}

export interface SpawnedObject {
  id: string;
  name: string;
  /** "model" renders a GLTF, "primitive" renders a drei/three primitive. */
  kind: "model" | "primitive";
  modelUrl: string | null;
  geometry: PrimitiveGeometry;
  color: string;
  metalness: number;
  roughness: number;
  emissive: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  physics: PhysicsProps;
}

export interface LogEntry {
  id: string;
  text: string;
  kind: "user" | "system" | "ai" | "error";
}

interface EditorState {
  /* chat */
  chatInput: string;
  setChatInput: (value: string) => void;
  lastPrompt: string | null;
  log: LogEntry[];
  pushLog: (text: string, kind: LogEntry["kind"]) => void;

  /* ai streaming */
  aiThinking: boolean;
  setAiThinking: (v: boolean) => void;
  streamText: string;
  setStreamText: (text: string) => void;
  appendStreamText: (chunk: string) => void;

  /* world */
  spawnedObjects: SpawnedObject[];
  spawnObject: (obj: Partial<SpawnedObject>) => string;
  updateObject: (id: string, patch: Partial<SpawnedObject>) => boolean;
  removeObject: (id: string) => void;
  clearObjects: () => void;

  /* player + camera */
  cameraMode: CameraMode;
  toggleCameraMode: () => void;
  playerEnabled: boolean;
  setPlayerEnabled: (v: boolean) => void;

  /* loading */
  loadingProgress: number;
  isLoading: boolean;
  setLoading: (progress: number, active: boolean) => void;

  /* graphics */
  graphicsQuality: GraphicsQuality;
  setGraphicsQuality: (q: GraphicsQuality) => void;

  /* network */
  network: NetworkState;
  setNetwork: (patch: Partial<NetworkState>) => void;

  /* perf */
  showPerf: boolean;
  togglePerf: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_PHYSICS: PhysicsProps = {
  type: "dynamic",
  mass: 1,
  restitution: 0.2,
  friction: 1,
  gravityScale: 1,
};

export function createSpawnedObject(patch: Partial<SpawnedObject>): SpawnedObject {
  return {
    id: uid(),
    name: patch.name ?? "Entity",
    kind: patch.kind ?? (patch.modelUrl ? "model" : "primitive"),
    modelUrl: patch.modelUrl ?? null,
    geometry: patch.geometry ?? "box",
    color: patch.color ?? "#b6f36a",
    metalness: patch.metalness ?? 0.4,
    roughness: patch.roughness ?? 0.4,
    emissive: patch.emissive ?? 0,
    position: patch.position ?? [0, 5, 0],
    rotation: patch.rotation ?? [0, 0, 0],
    scale: patch.scale ?? [1, 1, 1],
    physics: { ...DEFAULT_PHYSICS, ...(patch.physics ?? {}) },
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  chatInput: "",
  setChatInput: (value) => set({ chatInput: value }),
  lastPrompt: null,
  log: [],
  pushLog: (text, kind) =>
    set((s) => ({ log: [...s.log, { id: uid(), text, kind }].slice(-40) })),

  aiThinking: false,
  setAiThinking: (v) => set({ aiThinking: v }),
  streamText: "",
  setStreamText: (text) => set({ streamText: text }),
  appendStreamText: (chunk) => set((s) => ({ streamText: s.streamText + chunk })),

  spawnedObjects: [],
  spawnObject: (patch) => {
    const object = createSpawnedObject(patch);
    set((s) => ({ spawnedObjects: [...s.spawnedObjects, object] }));
    return object.id;
  },
  updateObject: (id, patch) => {
    const exists = get().spawnedObjects.some((o) => o.id === id);
    if (!exists) return false;
    set((s) => ({
      spawnedObjects: s.spawnedObjects.map((o) =>
        o.id === id
          ? { ...o, ...patch, id: o.id, physics: { ...o.physics, ...(patch.physics ?? {}) } }
          : o,
      ),
    }));
    return true;
  },
  removeObject: (id) =>
    set((s) => ({ spawnedObjects: s.spawnedObjects.filter((o) => o.id !== id) })),
  clearObjects: () => set({ spawnedObjects: [] }),

  cameraMode: "third",
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === "third" ? "first" : "third" })),
  playerEnabled: false,
  setPlayerEnabled: (v) => set({ playerEnabled: v }),

  loadingProgress: 0,
  isLoading: false,
  setLoading: (progress, active) => set({ loadingProgress: progress, isLoading: active }),

  graphicsQuality: "medium",
  setGraphicsQuality: (q) => set({ graphicsQuality: q }),

  network: { status: "offline", ping: 0, peers: 0 },
  setNetwork: (patch) => set((s) => ({ network: { ...s.network, ...patch } })),

  showPerf: false,
  togglePerf: () => set((s) => ({ showPerf: !s.showPerf })),
}));
