export type DirectorPhase = "BuildUp" | "PeakAction" | "Relief";

export interface PlayerStressTelemetry {
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  recentDamage: number;
  damageWindowSeconds: number;
  timeSinceCombatSeconds: number;
  enemiesNearby: number;
}

export interface DirectorConfig {
  healthWeight: number;
  ammoWeight: number;
  damageWeight: number;
  recencyWeight: number;
  enemyPressureWeight: number;
  maxStress: number;
  criticalStress: number;
  hordeThreshold: number;
  reliefThreshold: number;
  cycleSeconds: number;
  minPhaseSeconds: number;
}

export interface DirectorSnapshot {
  stressScore: number;
  phase: DirectorPhase;
  phaseProgress: number;
  intensity: number;
  actionCooldownSeconds: number;
}

export type SpawnIntent =
  | {
      kind: "SpawnHorde";
      spawnPool: string;
      budget: number;
      reason: "LowStress" | "RisingTension";
    }
  | {
      kind: "SpawnSafeRoom";
      spawnPool: string;
      budget: number;
      reason: "CriticalStress";
    }
  | {
      kind: "SpawnSupplies";
      spawnPool: string;
      budget: number;
      reason: "CriticalStress" | "Relief";
    };

export interface WorldState {
  factionControl: string;
  timeLimitMinutes: number;
  timeRemainingSeconds: number;
  currentLocation: string;
  alertLevel: number;
  worldFlags: Record<string, boolean>;
}

export type QuestObjectiveType = "Fetch" | "Escort" | "Assassinate" | "Defend";

export interface QuestObjective {
  id: string;
  type: QuestObjectiveType;
  title: string;
  targetTag: string;
  locationTag: string;
  optional: boolean;
  prerequisites: string[];
  reward: number;
}

export interface QuestGraph {
  questId: string;
  title: string;
  objectives: QuestObjective[];
  rootObjectiveId: string;
  metadata: {
    generatedFromLocation: string;
    faction: string;
    difficulty: number;
  };
}

export interface MacroGoal {
  id: string;
  actor: string;
  description: string;
  desiredState: Record<string, unknown>;
  priority: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  condition?: { key: string; value: string };
}

export interface DialogueTree {
  treeId: string;
  npcId: string;
  contextTags: string[];
  eventsReferenced: string[];
  lines: DialogueLine[];
}

export interface MetaProgressionState {
  xp: number;
  currency: number;
  unlockedTech: string[];
  extractionStreak: number;
  persistentInventory: Record<string, number>;
  permanentModifiers: Record<string, number>;
}

export interface MacroSaveEnvelope {
  version: 1;
  savedAt: string;
  playerId: string;
  world: WorldState;
  director: DirectorSnapshot;
  quests: QuestGraph[];
  completedQuestObjectives: string[];
  meta: MetaProgressionState;
  gameplayState: unknown;
}
