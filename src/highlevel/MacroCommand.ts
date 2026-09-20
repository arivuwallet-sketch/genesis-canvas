import type { MacroGameRules } from "./MacroGameLoop";

export interface GameLoopConfig {
  genre: string;
  pacing: string;
  winCondition: string;
  directorRules: string[];
}

export type MacroCommand =
  | {
      command: "GenerateGameLoop";
      payload: {
        genre: string;
        pacing: string;
        win_condition: string;
        director_rules: string[];
      };
    }
  | {
      command: "SetWorldState";
      payload: {
        faction_control: string;
        time_limit_mins: number;
        current_location?: string;
        alert_level?: number;
      };
    };

export function validateMacroCommand(value: unknown): MacroCommand {
  if (!value || typeof value !== "object") throw new Error("Macro command must be an object.");

  const item = value as Record<string, unknown>;
  const command = item.command;
  const payload = item.payload;

  if (command !== "GenerateGameLoop" && command !== "SetWorldState") {
    throw new Error("Unsupported macro command.");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Macro command payload is required.");
  }

  const p = payload as Record<string, unknown>;

  if (command === "GenerateGameLoop") {
    if (
      typeof p.genre !== "string" ||
      typeof p.pacing !== "string" ||
      typeof p.win_condition !== "string" ||
      !Array.isArray(p.director_rules) ||
      p.director_rules.some((rule) => typeof rule !== "string")
    ) {
      throw new Error(
        "GenerateGameLoop requires genre, pacing, win_condition and director_rules.",
      );
    }

    return {
      command,
      payload: {
        genre: p.genre.slice(0, 64),
        pacing: p.pacing.slice(0, 64),
        win_condition: p.win_condition.slice(0, 128),
        director_rules: p.director_rules.slice(0, 16).map((rule) => rule.slice(0, 64)),
      },
    };
  }

  if (
    typeof p.faction_control !== "string" ||
    typeof p.time_limit_mins !== "number" ||
    !Number.isFinite(p.time_limit_mins)
  ) {
    throw new Error("SetWorldState requires faction_control and finite time_limit_mins.");
  }

  return {
    command,
    payload: {
      faction_control: p.faction_control.slice(0, 64),
      time_limit_mins: Math.min(180, Math.max(1, p.time_limit_mins)),
      ...(typeof p.current_location === "string"
        ? { current_location: p.current_location.slice(0, 80) }
        : {}),
      ...(typeof p.alert_level === "number" && Number.isFinite(p.alert_level)
        ? { alert_level: Math.min(1, Math.max(0, p.alert_level)) }
        : {}),
    },
  };
}

export function rulesForGeneratedLoop(config: {
  genre: string;
  pacing: string;
  winCondition: string;
}): MacroGameRules {
  const genre = config.genre.toLowerCase();
  const win = config.winCondition.toLowerCase();

  return {
    timeLimitMinutes: genre.includes("extraction") ? 20 : 30,
    targetScore: genre.includes("shooter") ? 1000 : 500,
    extractionRequired: genre.includes("extraction") || win.includes("extract"),
    lossOnDeath: true,
    artifactRequired: win.includes("artifact"),
  };
}
