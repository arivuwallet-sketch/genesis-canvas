export const UNREAL_COMMANDS = [
  "SpawnActor",
  "DestroyActor",
  "TransformActor",
  "SetTimeOfDay",
  "ApplyMaterial",
] as const;

export type UnrealCommandName = (typeof UNREAL_COMMANDS)[number];

export type UnrealCommandParameters = {
  location: [number, number, number] | null;
  rotation: [number, number, number] | null;
  scale: [number, number, number] | null;
  color: string | null;
  material: string | null;
  value: number;
  time_of_day: number;
};

export interface UnrealCommand {
  command: UnrealCommandName;
  asset_path: string | null;
  target_id: string | null;
  parameters: UnrealCommandParameters;
}

export interface UnrealCommandBatch {
  commands: UnrealCommand[];
}

const commandSet = new Set<string>(UNREAL_COMMANDS);

const isVec3 = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((entry) => typeof entry === "number" && Number.isFinite(entry));

export const UNREAL_COMMAND_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    commands: {
      type: "array",
      minItems: 0,
      maxItems: 32,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          command: { type: "string", enum: [...UNREAL_COMMANDS] },
          asset_path: { type: ["string", "null"] },
          target_id: { type: ["string", "null"] },
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              location: {
                type: ["array", "null"],
                items: { type: "number" },
                minItems: 3,
                maxItems: 3,
              },
              rotation: {
                type: ["array", "null"],
                items: { type: "number" },
                minItems: 3,
                maxItems: 3,
              },
              scale: {
                type: ["array", "null"],
                items: { type: "number" },
                minItems: 3,
                maxItems: 3,
              },
              color: { type: ["string", "null"] },
              material: { type: ["string", "null"] },
              value: { type: "number" },
              time_of_day: { type: "number" },
            },
            required: [
              "location",
              "rotation",
              "scale",
              "color",
              "material",
              "value",
              "time_of_day",
            ],
          },
        },
        required: ["command", "asset_path", "target_id", "parameters"],
      },
    },
  },
  required: ["commands"],
} as const;

export const UNREAL_LLM_SYSTEM_PROMPT = [
  "You are the Unreal Engine 5 runtime command planner for an AI-powered AAA game builder.",
  "Translate natural-language requests into a strict JSON command batch. Return only JSON.",
  "Never return markdown, prose, comments, C++, Blueprint code, or an explanation.",
  "Allowed commands:",
  "SpawnActor: instantiate an Unreal Actor class from asset_path.",
  "DestroyActor: destroy a previously spawned actor by target_id.",
  "TransformActor: modify location, rotation, or scale of a target actor.",
  "SetTimeOfDay: set a 0-24 hour world time value; the UE receiver maps this onto the configured sun.",
  "ApplyMaterial: apply a material asset_path and/or a hex color to a target actor's first mesh component.",
  "asset_path must be an Unreal reference path supplied by the user/application. Prefer Blueprint class references such as Blueprint'/Game/Vehicles/BP_SportsCar.BP_SportsCar'.",
  "Do not invent runtime target IDs. target_id is required only for commands that operate on an existing actor.",
  "For SpawnActor, target_id may be null and the receiver will assign a runtime ID.",
  "Use FVector-style arrays [X,Y,Z] for location and scale.",
  "Use FRotator-style arrays [Pitch,Yaw,Roll] in degrees for rotation.",
  "Use null for unused fields; value and time_of_day must always be numeric, use 0 when irrelevant.",
  "Keep command batches to 32 or fewer commands.",
  "Preserve command order when a later command depends on an actor spawned earlier in the same request.",
].join("\n");

export function buildUnrealLlmUserPrompt(prompt: string): string {
  return [
    "Convert this game-builder request into a single strict Unreal Engine command batch.",
    "Only use the actions and fields permitted by the system contract.",
    "",
    "USER REQUEST:",
    prompt.trim().slice(0, 8000),
  ].join("\n");
}

export function parseUnrealCommandBatch(value: unknown): UnrealCommandBatch {
  if (!value || typeof value !== "object") {
    throw new Error("UE5 LLM response must be a JSON object.");
  }

  const raw = value as { commands?: unknown };
  if (!Array.isArray(raw.commands)) {
    throw new Error("UE5 LLM response must contain a commands array.");
  }

  if (raw.commands.length > 32) {
    throw new Error("UE5 LLM returned more than 32 commands.");
  }

  const commands = raw.commands.map((entry, index): UnrealCommand => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`UE5 command ${index + 1} is invalid.`);
    }

    const rawCommand = entry as Record<string, unknown>;
    const command = rawCommand.command;
    const assetPath = rawCommand.asset_path;
    const targetId = rawCommand.target_id;
    const rawParameters = rawCommand.parameters;

    if (typeof command !== "string" || !commandSet.has(command)) {
      throw new Error(`UE5 command ${index + 1} has an unsupported command.`);
    }

    if (assetPath !== null && typeof assetPath !== "string") {
      throw new Error(`UE5 command ${index + 1} has an invalid asset_path.`);
    }

    if (targetId !== null && typeof targetId !== "string") {
      throw new Error(`UE5 command ${index + 1} has an invalid target_id.`);
    }

    if (!rawParameters || typeof rawParameters !== "object") {
      throw new Error(`UE5 command ${index + 1} is missing parameters.`);
    }

    const parameters = rawParameters as Record<string, unknown>;
    const location = parameters.location ?? null;
    const rotation = parameters.rotation ?? null;
    const scale = parameters.scale ?? null;
    const color = parameters.color ?? null;
    const material = parameters.material ?? null;
    const value = parameters.value ?? 0;
    const timeOfDay = parameters.time_of_day ?? 0;

    if (location !== null && !isVec3(location)) {
      throw new Error(`UE5 command ${index + 1} has an invalid location.`);
    }

    if (rotation !== null && !isVec3(rotation)) {
      throw new Error(`UE5 command ${index + 1} has an invalid rotation.`);
    }

    if (scale !== null && !isVec3(scale)) {
      throw new Error(`UE5 command ${index + 1} has an invalid scale.`);
    }

    if (color !== null && typeof color !== "string") {
      throw new Error(`UE5 command ${index + 1} has an invalid color.`);
    }

    if (material !== null && typeof material !== "string") {
      throw new Error(`UE5 command ${index + 1} has an invalid material.`);
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`UE5 command ${index + 1} has an invalid value.`);
    }

    if (typeof timeOfDay !== "number" || !Number.isFinite(timeOfDay) || timeOfDay < 0 || timeOfDay > 24) {
      throw new Error(`UE5 command ${index + 1} has an invalid time_of_day.`);
    }

    if (command === "SpawnActor" && (!assetPath || !assetPath.trim())) {
      throw new Error(`UE5 command ${index + 1} SpawnActor requires asset_path.`);
    }

    if (
      (command === "DestroyActor" ||
        command === "TransformActor" ||
        command === "ApplyMaterial") &&
      (!targetId || !targetId.trim())
    ) {
      throw new Error(`UE5 command ${index + 1} ${command} requires target_id.`);
    }

    return {
      command: command as UnrealCommandName,
      asset_path: assetPath as string | null,
      target_id: targetId as string | null,
      parameters: {
        location: location as [number, number, number] | null,
        rotation: rotation as [number, number, number] | null,
        scale: scale as [number, number, number] | null,
        color: color as string | null,
        material: material as string | null,
        value,
        time_of_day: timeOfDay,
      },
    };
  });

  return { commands };
}
