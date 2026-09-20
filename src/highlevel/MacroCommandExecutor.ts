import { useMacroGameStore } from "../store/useMacroGameStore";
import { validateMacroCommand, type MacroCommand } from "./MacroCommand";

export interface MacroCommandResult {
  ok: boolean;
  message: string;
}

export function executeMacroCommand(input: unknown): MacroCommandResult {
  let command: MacroCommand;

  try {
    command = validateMacroCommand(input);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Invalid macro command.",
    };
  }

  const state = useMacroGameStore.getState();

  if (command.command === "GenerateGameLoop") {
    state.generateGameLoop({
      genre: command.payload.genre,
      pacing: command.payload.pacing,
      winCondition: command.payload.win_condition,
      directorRules: command.payload.director_rules,
    });

    return {
      ok: true,
      message:
        "Generated a " +
        command.payload.pacing +
        " " +
        command.payload.genre +
        " game loop with " +
        command.payload.director_rules.length +
        " director rules.",
    };
  }

  state.setWorldState({
    factionControl: command.payload.faction_control,
    timeLimitMinutes: command.payload.time_limit_mins,
    timeRemainingSeconds: command.payload.time_limit_mins * 60,
    ...(command.payload.current_location
      ? { currentLocation: command.payload.current_location }
      : {}),
    ...(command.payload.alert_level === undefined
      ? {}
      : { alertLevel: command.payload.alert_level }),
  });

  return {
    ok: true,
    message:
      "World state updated: " +
      command.payload.faction_control +
      " control, " +
      command.payload.time_limit_mins +
      " minute limit.",
  };
}

export const MACRO_COMMANDS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    commands: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          command: {
            type: "string",
            enum: ["GenerateGameLoop", "SetWorldState"],
          },
          payload: { type: "object" },
        },
        required: ["command", "payload"],
      },
    },
  },
  required: ["commands"],
} as const;
