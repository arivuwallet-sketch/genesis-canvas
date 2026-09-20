import type { WorldState, MetaProgressionState } from "./MacroTypes";

export type MacroLoopStatus = "Active" | "Won" | "Lost" | "Extracted";

export interface MacroGameRules {
  timeLimitMinutes: number;
  targetScore: number;
  extractionRequired: boolean;
  lossOnDeath: boolean;
  artifactRequired: boolean;
}

export interface MacroGameSnapshot {
  status: MacroLoopStatus;
  score: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  extracted: boolean;
  playerAlive: boolean;
  artifactSecured: boolean;
}

export const DEFAULT_MACRO_RULES: MacroGameRules = {
  timeLimitMinutes: 20,
  targetScore: 1000,
  extractionRequired: true,
  lossOnDeath: true,
  artifactRequired: true,
};

export function evaluateMacroGameRules(
  rules: MacroGameRules,
  state: {
    elapsedSeconds: number;
    score: number;
    playerAlive: boolean;
    extracted: boolean;
    artifactSecured: boolean;
  },
): MacroGameSnapshot {
  const remainingSeconds = Math.max(
    0,
    rules.timeLimitMinutes * 60 - state.elapsedSeconds,
  );

  const won =
    state.extracted &&
    (!rules.artifactRequired || state.artifactSecured) &&
    (!rules.extractionRequired || state.extracted) &&
    state.score >= rules.targetScore;

  const lost =
    (rules.lossOnDeath && !state.playerAlive) ||
    (!won && remainingSeconds <= 0);

  return {
    status: won ? "Won" : lost ? "Lost" : state.extracted ? "Extracted" : "Active",
    score: state.score,
    elapsedSeconds: state.elapsedSeconds,
    remainingSeconds,
    extracted: state.extracted,
    playerAlive: state.playerAlive,
    artifactSecured: state.artifactSecured,
  };
}

export function applyExtractionReward(
  meta: MetaProgressionState,
  reward: { currency: number; xp: number; loot: Record<string, number> },
): MetaProgressionState {
  return {
    ...meta,
    currency: meta.currency + Math.max(0, reward.currency),
    xp: meta.xp + Math.max(0, reward.xp),
    extractionStreak: meta.extractionStreak + 1,
    persistentInventory: Object.entries(reward.loot).reduce(
      (inventory, [itemId, quantity]) => ({
        ...inventory,
        [itemId]: (inventory[itemId] ?? 0) + Math.max(0, Math.floor(quantity)),
      }),
      { ...meta.persistentInventory },
    ),
  };
}

export function resetRunMeta(meta: MetaProgressionState): MetaProgressionState {
  return {
    ...meta,
    extractionStreak: meta.extractionStreak,
  };
}

export function applyWorldTimer(world: WorldState, elapsedSeconds: number): WorldState {
  return {
    ...world,
    timeRemainingSeconds: Math.max(
      0,
      world.timeLimitMinutes * 60 - Math.max(0, elapsedSeconds),
    ),
  };
}
