import { create } from "zustand";
import type { GameplayArchetype } from "../gameplay/GameplayActorTypes";

interface GameplayControlState {
  activeActorId: string | null;
  activeArchetype: GameplayArchetype | null;
  setActiveActor: (id: string, archetype: GameplayArchetype) => void;
  clearActiveActor: (id?: string) => void;
}

export const useGameplayControlStore = create<GameplayControlState>((set) => ({
  activeActorId: null,
  activeArchetype: null,

  setActiveActor: (id, archetype) =>
    set({
      activeActorId: id,
      activeArchetype: archetype,
    }),

  clearActiveActor: (id) =>
    set((state) =>
      id === undefined || state.activeActorId === id
        ? { activeActorId: null, activeArchetype: null }
        : state,
    ),
}));
