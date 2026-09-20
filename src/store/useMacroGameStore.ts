import { create } from "zustand";
import { gameplayEventBus } from "../gameplay/GameplayEventBus";
import {
  AIDirectorEngine,
  DEFAULT_DIRECTOR_CONFIG,
  chooseSpawnIntent,
} from "../highlevel/AIDirector";
import { generateDynamicQuest } from "../highlevel/QuestOrchestrator";
import type {
  DialogueTree,
  DirectorSnapshot,
  MetaProgressionState,
  PlayerStressTelemetry,
  QuestGraph,
  SpawnIntent,
  WorldState,
} from "../highlevel/MacroTypes";

interface MacroGameState {
  world: WorldState;
  telemetry: PlayerStressTelemetry;
  director: DirectorSnapshot;
  quests: QuestGraph[];
  completedQuestObjectives: string[];
  dialogueTrees: Record<string, DialogueTree>;
  macroGoals: Array<{ id: string; actor: string; description: string; priority: number }>;
  meta: MetaProgressionState;
  lastSpawnIntent: SpawnIntent | null;
  directorRunning: boolean;
  updateTelemetry: (patch: Partial<PlayerStressTelemetry>) => void;
  tickDirector: (deltaSeconds: number) => SpawnIntent | null;
  setWorldState: (patch: Partial<WorldState>) => void;
  generateQuest: (seed?: number) => QuestGraph;
  completeQuestObjective: (objectiveId: string) => void;
  setDialogueTree: (tree: DialogueTree) => void;
  setMeta: (patch: Partial<MetaProgressionState>) => void;
  grantMetaLoot: (items: Record<string, number>, currency: number, xp: number) => void;
}

const createDirector = () => new AIDirectorEngine(DEFAULT_DIRECTOR_CONFIG);

let director = createDirector();

const defaultTelemetry: PlayerStressTelemetry = {
  health: 100,
  maxHealth: 100,
  ammo: 100,
  maxAmmo: 100,
  recentDamage: 0,
  damageWindowSeconds: 10,
  timeSinceCombatSeconds: 30,
  enemiesNearby: 0,
};

export const useMacroGameStore = create<MacroGameState>((set, get) => ({
  world: {
    factionControl: "neutral",
    timeLimitMinutes: 20,
    timeRemainingSeconds: 1200,
    currentLocation: "start_zone",
    alertLevel: 0.2,
    worldFlags: {},
  },
  telemetry: defaultTelemetry,
  director: {
    stressScore: 0,
    phase: "BuildUp",
    phaseProgress: 0,
    intensity: 0,
    actionCooldownSeconds: 0,
  },
  quests: [],
  completedQuestObjectives: [],
  dialogueTrees: {},
  macroGoals: [],
  meta: {
    xp: 0,
    currency: 0,
    unlockedTech: [],
    extractionStreak: 0,
    persistentInventory: {},
    permanentModifiers: {},
  },
  lastSpawnIntent: null,
  directorRunning: false,

  updateTelemetry: (patch) =>
    set((state) => ({ telemetry: { ...state.telemetry, ...patch } })),

  tickDirector: (deltaSeconds) => {
    const snapshot = director.update(deltaSeconds, get().telemetry);
    const intent = chooseSpawnIntent(snapshot);
    set({ director: snapshot, lastSpawnIntent: intent, directorRunning: true });

    if (intent) {
      gameplayEventBus.emit("onGameplayCommand", {
        command: intent.kind,
        payload: intent,
      });
    }

    return intent;
  },

  setWorldState: (patch) =>
    set((state) => ({
      world: {
        ...state.world,
        ...patch,
        timeRemainingSeconds:
          patch.timeRemainingSeconds ?? state.world.timeRemainingSeconds,
      },
    })),

  generateQuest: (seed = Math.floor(Date.now() / 1000)) => {
    const quest = generateDynamicQuest(get().world, seed);
    set((state) => ({ quests: [...state.quests, quest].slice(-32) }));
    return quest;
  },

  completeQuestObjective: (objectiveId) =>
    set((state) => ({
      completedQuestObjectives: state.completedQuestObjectives.includes(objectiveId)
        ? state.completedQuestObjectives
        : [...state.completedQuestObjectives, objectiveId],
    })),

  setDialogueTree: (tree) =>
    set((state) => ({
      dialogueTrees: { ...state.dialogueTrees, [tree.treeId]: tree },
    })),

  setMeta: (patch) =>
    set((state) => ({ meta: { ...state.meta, ...patch } })),

  grantMetaLoot: (items, currency, xp) =>
    set((state) => ({
      meta: {
        ...state.meta,
        xp: state.meta.xp + Math.max(0, xp),
        currency: state.meta.currency + Math.max(0, currency),
        persistentInventory: Object.entries(items).reduce(
          (acc, [id, amount]) => ({
            ...acc,
            [id]: (acc[id] ?? 0) + Math.max(0, Math.floor(amount)),
          }),
          { ...state.meta.persistentInventory },
        ),
      },
    })),
}));
