export const UNITY_COMMAND_ACTIONS = [
  "instantiate",
  "destroy",
  "transform",
  "change_weather",
  "apply_material",
] as const;

export type UnityCommandAction = (typeof UNITY_COMMAND_ACTIONS)[number];

export interface UnityCommandParameters {
  position: [number, number, number] | null;
  rotation: [number, number, number] | null;
  scale: [number, number, number] | null;
  color: string | null;
  weather: "clear" | "rain" | "storm" | "snow" | "fog" | null;
  material: string | null;
  enabled: boolean | null;
  intensity: number | null;
}

export interface UnityCommand {
  action: UnityCommandAction;
  target_id: string | null;
  prefab_name: string | null;
  parameters: UnityCommandParameters;
}

export interface UnityCommandBatch {
  commands: UnityCommand[];
}

export const UNITY_COMMAND_JSON_SCHEMA = {
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
          action: {
            type: "string",
            enum: [...UNITY_COMMAND_ACTIONS],
          },
          target_id: { type: ["string", "null"] },
          prefab_name: { type: ["string", "null"] },
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              position: {
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
              weather: {
                type: ["string", "null"],
                enum: ["clear", "rain", "storm", "snow", "fog", null],
              },
              material: { type: ["string", "null"] },
              enabled: { type: "boolean" },
              intensity: { type: "number" },
            },
            required: [
              "position",
              "rotation",
              "scale",
              "color",
              "weather",
              "material",
              "enabled",
              "intensity",
            ],
          },
        },
        required: ["action", "target_id", "prefab_name", "parameters"],
      },
    },
  },
  required: ["commands"],
} as const;

export const UNITY_LLM_SYSTEM_PROMPT = [
  "You are the command-planning middleware for an AI-powered game builder.",
  "Translate the user's natural-language request into executable Unity runtime commands.",
  "Return only one JSON object matching the supplied schema. Never return markdown, prose, comments, or code.",
  "Use one command per concrete runtime change and preserve the order needed for safe execution.",
  "Actions:",
  "instantiate = create a prefab from Unity Resources.",
  "destroy = remove an existing runtime object by target_id.",
  "transform = change an existing object's position, rotation, or scale.",
  "change_weather = change the runtime weather/sky state.",
  "apply_material = change an object's color/material properties.",
  "For instantiate, prefer prefab_name and use parameters.position/rotation/scale.",
  "For transform, require target_id when the user refers to an existing object.",
  "Use null for fields that are not needed.",
  "Do not invent target IDs. When an object does not have a known target_id, omit it and use a prefab_name for instantiation.",
  "Keep positions grounded and sensible for a typical Unity scene unless the user explicitly requests otherwise.",
  "Never create more than 32 commands.",
].join("\n");

const commandActions = new Set<string>(UNITY_COMMAND_ACTIONS);
const weatherStates = new Set(["clear", "rain", "storm", "snow", "fog"]);

const isVec3 = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((entry) => typeof entry === "number" && Number.isFinite(entry));

export function parseUnityCommandBatch(value: unknown): UnityCommandBatch {
  if (!value || typeof value !== "object") {
    throw new Error("LLM response must be a JSON object.");
  }

  const raw = value as { commands?: unknown };
  if (!Array.isArray(raw.commands)) {
    throw new Error("LLM response must contain a commands array.");
  }

  if (raw.commands.length > 32) {
    throw new Error("LLM returned more than 32 commands.");
  }

  const commands = raw.commands.map((rawCommand, index) => {
    if (!rawCommand || typeof rawCommand !== "object") {
      throw new Error(`Command ${index + 1} is invalid.`);
    }

    const command = rawCommand as Record<string, unknown>;
    const action = command.action;
    const targetId = command.target_id;
    const prefabName = command.prefab_name;
    const parameters = command.parameters;

    if (typeof action !== "string" || !commandActions.has(action)) {
      throw new Error(`Command ${index + 1} has an unsupported action.`);
    }

    if (targetId !== null && typeof targetId !== "string") {
      throw new Error(`Command ${index + 1} has an invalid target_id.`);
    }

    if (prefabName !== null && typeof prefabName !== "string") {
      throw new Error(`Command ${index + 1} has an invalid prefab_name.`);
    }

    if (!parameters || typeof parameters !== "object") {
      throw new Error(`Command ${index + 1} is missing parameters.`);
    }

    const rawParameters = parameters as Record<string, unknown>;
    const position = rawParameters.position ?? null;
    const rotation = rawParameters.rotation ?? null;
    const scale = rawParameters.scale ?? null;
    const color = rawParameters.color ?? null;
    const weather = rawParameters.weather ?? null;
    const material = rawParameters.material ?? null;
    const enabled = rawParameters.enabled ?? false;
    const intensity = rawParameters.intensity ?? 0;

    if (position !== null && !isVec3(position)) {
      throw new Error(`Command ${index + 1} has an invalid position.`);
    }

    if (rotation !== null && !isVec3(rotation)) {
      throw new Error(`Command ${index + 1} has an invalid rotation.`);
    }

    if (scale !== null && !isVec3(scale)) {
      throw new Error(`Command ${index + 1} has an invalid scale.`);
    }

    if (color !== null && typeof color !== "string") {
      throw new Error(`Command ${index + 1} has an invalid color.`);
    }

    if (weather !== null && (typeof weather !== "string" || !weatherStates.has(weather))) {
      throw new Error(`Command ${index + 1} has an invalid weather state.`);
    }

    if (material !== null && typeof material !== "string") {
      throw new Error(`Command ${index + 1} has an invalid material.`);
    }

    if (typeof enabled !== "boolean") {
      throw new Error(`Command ${index + 1} has an invalid enabled flag.`);
    }

    if (typeof intensity !== "number" || !Number.isFinite(intensity)) {
      throw new Error(`Command ${index + 1} has an invalid intensity.`);
    }

    return {
      action: action as UnityCommandAction,
      target_id: targetId as string | null,
      prefab_name: prefabName as string | null,
      parameters: {
        position: position as [number, number, number] | null,
        rotation: rotation as [number, number, number] | null,
        scale: scale as [number, number, number] | null,
        color: color as string | null,
        weather: weather as UnityCommandParameters["weather"],
        material: material as string | null,
        enabled: enabled as boolean,
        intensity: intensity as number,
      },
    };
  });

  return { commands };
}


export function buildUnityLlmUserPrompt(userPrompt: string): string {
  return [
    "Translate the following natural-language game-builder request into a single strict JSON command batch.",
    "Use only the allowed actions and fields from the system contract.",
    "Do not add explanations or markdown.",
    "",
    "USER REQUEST:",
    userPrompt.trim().slice(0, 8000),
  ].join("\n");
}
