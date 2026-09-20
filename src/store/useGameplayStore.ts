import { create } from "zustand";
import { gameplayEventBus } from "../gameplay/GameplayEventBus";

export interface GameplayPlayerState {
  id: string;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  abilities: string[];
  inventory: Record<string, number>;
}

interface GameplayState {
  players: Record<string, GameplayPlayerState>;
  activeDialogue: { npcId: string; treeId: string } | null;
  activeWaves: Array<{ id: string; enemyType: string; count: number; spawnPoint: string }>;
  questSteps: Record<string, string[]>;
  ensurePlayer: (playerId: string) => void;
  modifyAttribute: (playerId: string, attribute: "health" | "stamina" | "mana", delta: number) => void;
  grantAbility: (playerId: string, ability: string) => void;
  addItem: (playerId: string, itemId: string, quantity: number) => void;
  triggerDialogue: (npcId: string, treeId: string) => void;
  completeQuestStep: (playerId: string, questId: string, stepId: string) => void;
  spawnWave: (enemyType: string, count: number, spawnPoint: string) => string;
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? `wave-${Math.random().toString(36).slice(2, 12)}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useGameplayStore = create<GameplayState>((set, get) => ({
  players: {},
  activeDialogue: null,
  activeWaves: [],
  questSteps: {},

  ensurePlayer: (playerId) =>
    set((state) => {
      if (state.players[playerId]) return state;
      return {
        players: {
          ...state.players,
          [playerId]: {
            id: playerId,
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            mana: 100,
            maxMana: 100,
            abilities: [],
            inventory: {},
          },
        },
      };
    }),

  modifyAttribute: (playerId, attribute, delta) => {
    get().ensurePlayer(playerId);
    const player = get().players[playerId];
    if (!player) return;

    const max = attribute === "health" ? player.maxHealth : attribute === "stamina" ? player.maxStamina : player.maxMana;
    const next = clamp(player[attribute] + delta, 0, max);

    set((state) => ({
      players: {
        ...state.players,
        [playerId]: { ...state.players[playerId]!, [attribute]: next },
      },
    }));

    if (attribute === "health") {
      gameplayEventBus.emit("onPlayerHealthChange", {
        playerId,
        health: next,
        maxHealth: player.maxHealth,
        delta,
      });
    }
  },

  grantAbility: (playerId, ability) => {
    get().ensurePlayer(playerId);
    const current = get().players[playerId]?.abilities ?? [];
    if (current.includes(ability)) return;

    set((state) => ({
      players: {
        ...state.players,
        [playerId]: { ...state.players[playerId]!, abilities: [...current, ability] },
      },
    }));

    gameplayEventBus.emit("onAbilityGranted", { entityId: playerId, ability });
  },

  addItem: (playerId, itemId, quantity) => {
    get().ensurePlayer(playerId);
    const safeQuantity = Math.max(1, Math.floor(quantity));
    const player = get().players[playerId];
    if (!player) return;

    set((state) => ({
      players: {
        ...state.players,
        [playerId]: {
          ...player,
          inventory: {
            ...player.inventory,
            [itemId]: (player.inventory[itemId] ?? 0) + safeQuantity,
          },
        },
      },
    }));

    gameplayEventBus.emit("onItemPickedUp", { playerId, itemId, quantity: safeQuantity });
  },

  triggerDialogue: (npcId, treeId) => {
    set({ activeDialogue: { npcId, treeId } });
    gameplayEventBus.emit("onDialogueTriggered", { npcId, treeId });
  },

  completeQuestStep: (playerId, questId, stepId) => {
    const key = `${playerId}:${questId}`;
    const existing = get().questSteps[key] ?? [];
    if (existing.includes(stepId)) return;

    set((state) => ({
      questSteps: { ...state.questSteps, [key]: [...existing, stepId] },
    }));

    gameplayEventBus.emit("onQuestStepComplete", { playerId, questId, stepId });
  },

  spawnWave: (enemyType, count, spawnPoint) => {
    const wave = {
      id: uid(),
      enemyType,
      count: Math.max(1, Math.floor(count)),
      spawnPoint,
    };
    set((state) => ({ activeWaves: [...state.activeWaves, wave].slice(-32) }));
    gameplayEventBus.emit("onWaveSpawned", {
      enemyType: wave.enemyType,
      count: wave.count,
      spawnPoint: wave.spawnPoint,
    });
    return wave.id;
  },
}));
