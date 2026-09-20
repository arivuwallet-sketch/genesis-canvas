export const GAMEPLAY_COMMANDS = [
  "GrantAbility",
  "TriggerDialogue",
  "SpawnWave",
  "ModifyAttribute",
] as const;

export type GameplayCommandName = (typeof GAMEPLAY_COMMANDS)[number];

export interface GrantAbilityCommand {
  command: "GrantAbility";
  payload: { entity_id: string; ability: string };
}

export interface TriggerDialogueCommand {
  command: "TriggerDialogue";
  payload: { npc_id: string; tree_id: string };
}

export interface SpawnWaveCommand {
  command: "SpawnWave";
  payload: { enemy_type: string; count: number; spawn_point: string };
}

export interface ModifyAttributeCommand {
  command: "ModifyAttribute";
  payload: {
    target: string;
    attribute: "health" | "stamina" | "mana";
    delta: number;
  };
}

export type UnifiedGameplayCommand =
  | GrantAbilityCommand
  | TriggerDialogueCommand
  | SpawnWaveCommand
  | ModifyAttributeCommand;

const commandSet = new Set<string>(GAMEPLAY_COMMANDS);

export function validateGameplayCommand(value: unknown): UnifiedGameplayCommand {
  if (!value || typeof value !== "object") throw new Error("Gameplay command must be an object.");
  const item = value as Record<string, unknown>;
  const command = item.command;
  const payload = item.payload;

  if (typeof command !== "string" || !commandSet.has(command)) {
    throw new Error("Unsupported gameplay command.");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Gameplay command payload is required.");
  }

  const p = payload as Record<string, unknown>;

  if (command === "GrantAbility") {
    if (typeof p.entity_id !== "string" || typeof p.ability !== "string") {
      throw new Error("GrantAbility requires entity_id and ability.");
    }
    return { command, payload: { entity_id: p.entity_id, ability: p.ability } };
  }

  if (command === "TriggerDialogue") {
    if (typeof p.npc_id !== "string" || typeof p.tree_id !== "string") {
      throw new Error("TriggerDialogue requires npc_id and tree_id.");
    }
    return { command, payload: { npc_id: p.npc_id, tree_id: p.tree_id } };
  }

  if (command === "SpawnWave") {
    if (
      typeof p.enemy_type !== "string" ||
      typeof p.spawn_point !== "string" ||
      typeof p.count !== "number" ||
      !Number.isFinite(p.count)
    ) {
      throw new Error("SpawnWave requires enemy_type, count and spawn_point.");
    }
    return {
      command,
      payload: {
        enemy_type: p.enemy_type,
        count: Math.min(1000, Math.max(1, Math.floor(p.count))),
        spawn_point: p.spawn_point,
      },
    };
  }

  if (
    typeof p.target !== "string" ||
    (p.attribute !== "health" && p.attribute !== "stamina" && p.attribute !== "mana") ||
    typeof p.delta !== "number" ||
    !Number.isFinite(p.delta)
  ) {
    throw new Error("ModifyAttribute requires target, attribute and finite delta.");
  }

  return {
    command,
    payload: {
      target: p.target,
      attribute: p.attribute,
      delta: Math.min(10000, Math.max(-10000, p.delta)),
    },
  };
}

export function parseGameplayCommandBatch(input: unknown): UnifiedGameplayCommand[] {
  const values = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as Record<string, unknown>).commands)
      ? (input as Record<string, unknown>).commands
      : [input];

  if (values.length > 64) throw new Error("Gameplay batch exceeds 64 commands.");
  return values.map(validateGameplayCommand);
}

export const UNIFIED_GAMEPLAY_COMMAND_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    commands: {
      type: "array",
      maxItems: 64,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          command: {
            type: "string",
            enum: [...GAMEPLAY_COMMANDS],
          },
          payload: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["command", "payload"],
      },
    },
  },
  required: ["commands"],
} as const;
