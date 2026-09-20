import { create } from "zustand";

export type ParticlePreset = "explosion" | "smoke" | "magic_sparkle" | "weather_rain";
export type DecalType = "bullet_hole" | "blast_mark";

export interface ParticleEmitter {
  id: string;
  type: ParticlePreset;
  position: [number, number, number];
  createdAt: number;
}

export interface Decal {
  id: string;
  type: DecalType;
  targetId: string | null;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  createdAt: number;
}

interface VfxState {
  emitters: ParticleEmitter[];
  decals: Decal[];
  spawnVfx: (type: ParticlePreset, position: [number, number, number]) => string;
  removeEmitter: (id: string) => void;
  addDecal: (decal: Omit<Decal, "id" | "createdAt">) => string;
  removeDecal: (id: string) => void;
  clearVfx: () => void;
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 14);

export const useVfxStore = create<VfxState>((set) => ({
  emitters: [],
  decals: [],
  spawnVfx: (type, position) => {
    const id = uid();
    set((state) => ({
      emitters: [...state.emitters, { id, type, position, createdAt: performance.now() }],
    }));
    return id;
  },
  removeEmitter: (id) => set((state) => ({ emitters: state.emitters.filter((item) => item.id !== id) })),
  addDecal: (decal) => {
    const id = uid();
    set((state) => ({
      decals: [...state.decals, { ...decal, id, createdAt: Date.now() }].slice(-256),
    }));
    return id;
  },
  removeDecal: (id) => set((state) => ({ decals: state.decals.filter((item) => item.id !== id) })),
  clearVfx: () => set({ emitters: [], decals: [] }),
}));
