import { create } from "zustand";
import { matchCatalog } from "../utils/assetManager";

export type CameraMode = "first" | "third";

export interface SpawnedObject {
  id: string;
  name: string;
  modelUrl: string | null;
  position: [number, number, number];
  scale: number;
}

export interface LogEntry {
  id: string;
  text: string;
  kind: "user" | "system";
}

interface EditorState {
  /* chat */
  chatInput: string;
  setChatInput: (value: string) => void;
  lastPrompt: string | null;
  log: LogEntry[];
  submitPrompt: () => void;

  /* world */
  spawnedObjects: SpawnedObject[];
  spawnObject: (obj: Omit<SpawnedObject, "id">) => void;
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

  /* perf */
  showPerf: boolean;
  togglePerf: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const randomSpot = (): [number, number, number] => [
  (Math.random() - 0.5) * 8,
  3,
  (Math.random() - 0.5) * 8,
];

export const useEditorStore = create<EditorState>((set, get) => ({
  chatInput: "",
  setChatInput: (value) => set({ chatInput: value }),
  lastPrompt: null,
  log: [],

  submitPrompt: () => {
    const value = get().chatInput.trim();
    if (!value) return;
    const entries: LogEntry[] = [{ id: uid(), text: value, kind: "user" }];

    const lower = value.toLowerCase();
    if (lower.startsWith("clear")) {
      get().clearObjects();
      entries.push({ id: uid(), text: "World cleared.", kind: "system" });
    } else if (lower.includes("spawn")) {
      const match = matchCatalog(lower);
      get().spawnObject({
        name: match?.name ?? "Unknown Entity",
        modelUrl: match?.modelUrl ?? null,
        position: randomSpot(),
        scale: match?.scale ?? 1,
      });
      entries.push({
        id: uid(),
        text: match
          ? `Spawned ${match.name} into the world.`
          : "No model matched — dropped a placeholder volume.",
        kind: "system",
      });
    } else {
      entries.push({
        id: uid(),
        text: 'Queued. Try "spawn robot" or "clear".',
        kind: "system",
      });
    }

    set((s) => ({
      lastPrompt: value,
      chatInput: "",
      log: [...s.log, ...entries].slice(-30),
    }));
  },

  spawnedObjects: [],
  spawnObject: (obj) =>
    set((s) => ({ spawnedObjects: [...s.spawnedObjects, { id: uid(), ...obj }] })),
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

  showPerf: false,
  togglePerf: () => set((s) => ({ showPerf: !s.showPerf })),
}));
