import type { AssetCategory } from "../data/modelCatalog";

export type GameplayArchetype =
  | "vehicle"
  | "humanoid"
  | "building"
  | "prop"
  | "nature"
  | "unknown";

export type GameplayCapability =
  | "drive"
  | "walk"
  | "run"
  | "jump"
  | "crouch"
  | "fight"
  | "interact"
  | "door_open";

export interface GameplayActorSpec {
  archetype: GameplayArchetype;
  controllable: boolean;
  capabilities: GameplayCapability[];
  materialProfile: "realistic" | "stylized";
  autoControl: boolean;
}

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function inferGameplayArchetype(
  category?: AssetCategory,
): GameplayArchetype {
  switch (category) {
    case "vehicle":
      return "vehicle";
    case "character":
      return "humanoid";
    case "building":
      return "building";
    case "prop":
      return "prop";
    case "nature":
      return "nature";
    default:
      return "unknown";
  }
}

export function inferGameplaySpec(
  category: AssetCategory | undefined,
  text = "",
): GameplayActorSpec {
  const normalized = normalize(text);
  const archetype = inferGameplayArchetype(category);
  const realistic = /\b(realistic|real|photoreal|photorealistic|cinematic|high fidelity)\b/.test(
    normalized,
  );

  if (archetype === "vehicle") {
    return {
      archetype,
      controllable: true,
      capabilities: ["drive", "interact", "door_open"],
      materialProfile: realistic ? "realistic" : "realistic",
      autoControl: true,
    };
  }

  if (archetype === "humanoid") {
    return {
      archetype,
      controllable: true,
      capabilities: ["walk", "run", "jump", "crouch", "fight", "interact"],
      materialProfile: realistic ? "realistic" : "realistic",
      autoControl: /\b(player|playable|controllable|walk|walking|fight|fighting|jump|jumping)\b/.test(
        normalized,
      ),
    };
  }

  if (archetype === "building") {
    const doorRequested = /\b(door|open|enter|entrance)\b/.test(normalized);
    return {
      archetype,
      controllable: false,
      capabilities: doorRequested ? ["interact", "door_open"] : ["interact"],
      materialProfile: realistic ? "realistic" : "realistic",
      autoControl: false,
    };
  }

  if (archetype === "prop") {
    return {
      archetype,
      controllable: false,
      capabilities: ["interact"],
      materialProfile: realistic ? "realistic" : "realistic",
      autoControl: false,
    };
  }

  return {
    archetype,
    controllable: false,
    capabilities: [],
    materialProfile: realistic ? "realistic" : "realistic",
    autoControl: false,
  };
}

export function normalizeGameplaySpec(
  category: AssetCategory | undefined,
  text: string,
  raw?: unknown,
): GameplayActorSpec {
  const inferred = inferGameplaySpec(category, text);
  if (!raw || typeof raw !== "object") return inferred;

  const value = raw as Record<string, unknown>;
  const archetype =
    value.archetype === "vehicle" ||
    value.archetype === "humanoid" ||
    value.archetype === "building" ||
    value.archetype === "prop" ||
    value.archetype === "nature" ||
    value.archetype === "unknown"
      ? value.archetype
      : inferred.archetype;

  const capabilities = Array.isArray(value.capabilities)
    ? value.capabilities.filter(
        (item): item is GameplayCapability =>
          item === "drive" ||
          item === "walk" ||
          item === "run" ||
          item === "jump" ||
          item === "crouch" ||
          item === "fight" ||
          item === "interact" ||
          item === "door_open",
      )
    : inferred.capabilities;

  return {
    archetype,
    controllable: value.controllable === true || inferred.controllable,
    capabilities: capabilities.length ? capabilities : inferred.capabilities,
    materialProfile: value.materialProfile === "stylized" ? "stylized" : inferred.materialProfile,
    autoControl: value.autoControl === true || inferred.autoControl,
  };
}
