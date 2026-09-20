import { create } from "zustand";

export interface AudioSource {
  id: string;
  name: string;
  url: string;
  position: [number, number, number];
  volume: number;
  loop: boolean;
  refDistance: number;
  maxDistance: number;
  autoplay: boolean;
}

export interface AudioZone {
  id: string;
  name: string;
  min: [number, number, number];
  max: [number, number, number];
  lowPassFrequency: number;
  reverbSeconds: number;
  reverbDecay: number;
}

interface AudioState {
  sources: AudioSource[];
  zones: AudioZone[];
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  addSource: (source: Omit<AudioSource, "id">) => string;
  removeSource: (id: string) => void;
  addZone: (zone: Omit<AudioZone, "id">) => string;
  removeZone: (id: string) => void;
  reset: () => void;
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 14);

export const DEFAULT_AUDIO_ZONES: AudioZone[] = [
  {
    id: "zone-indoor-default",
    name: "Indoor Reverb",
    min: [-4, -1, -4],
    max: [4, 8, 4],
    lowPassFrequency: 1100,
    reverbSeconds: 1.8,
    reverbDecay: 2.6,
  },
];

export const useAudioStore = create<AudioState>((set) => ({
  sources: [],
  zones: DEFAULT_AUDIO_ZONES,
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
  addSource: (source) => {
    const id = uid();
    set((state) => ({ sources: [...state.sources, { ...source, id }] }));
    return id;
  },
  removeSource: (id) => set((state) => ({ sources: state.sources.filter((source) => source.id !== id) })),
  addZone: (zone) => {
    const id = uid();
    set((state) => ({ zones: [...state.zones, { ...zone, id }] }));
    return id;
  },
  removeZone: (id) => set((state) => ({ zones: state.zones.filter((zone) => zone.id !== id) })),
  reset: () => set({ sources: [], zones: DEFAULT_AUDIO_ZONES, enabled: true }),
}));
