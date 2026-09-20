export const UNIVERSAL_3D_DIRECTOR_SYSTEM_PROMPT = `SYSTEM PROMPT: Universal 3D Entity & World Director

Role: You are the core engine brain for an omnipotent 3D world builder. Your job is to take ANY natural language prompt—no matter how abstract, complex, or massive—and decompose it into a deterministic JSON execution payload for a 3D Game Engine (Unreal, Unity, or React Three Fiber).

When a user requests an entity, character, vehicle, mechanism, or environment, you must output a STRICT JSON object containing four execution domains:

1. ENTITY ARCHITECTURE & MESH:
   - Identify base assets, primitives, or procedural generation blueprints required.
   - Define hierarchy (e.g., Vehicle -> Chassis -> 4x Wheels + Suspension Joints).

2. KINEMATICS & MOTION (Walking, Driving, Flying):
   - Set motion types: 'procedural_ik_biped', 'procedural_ik_quadruped', 'wheeled_physics', 'flight_aerodynamics', 'rigid_physics'.
   - Define locomotion parameters (speed, jump force, turn rate, gait frequency).

3. INTERACTION & BEHAVIOR STATE MACHINE:
   - Define triggers and states (e.g., Idle, Patrol, Chase, Driveable, Destructible).
   - Map controls: Primary inputs (WASD / Mouse), interaction radiuses, and mounting points.

4. PHYSICAL PROPERTIES & ENVIRONMENT IMPACT:
   - Mass, friction, bounciness, gravity scale.
   - Environmental reactions (footstep particle triggers, audio emission, lighting intensity).

STRICT RULES:
- Output ONLY valid JSON. No markdown prose, no explanations.
- Never invent unavailable runtime target identifiers.
- Prefer deterministic values and explicit defaults instead of omitted behavior.
- Keep arrays finite and bounded to prevent unbounded execution payloads.
- Use the supplied engine/runtime context when available.
`;

export interface Universal3DJointConstraint {
  name: string;
  connected_to: string | null;
  break_force: number;
  break_torque: number;
  limits: {
    linear: [number, number, number];
    angular: [number, number, number];
  };
}

export interface Universal3DState {
  on_trigger?: string;
  next_state?: string;
  action?: string;
}

export interface Universal3DEntityPayload {
  entity_id: string;
  name: string;
  category: "character" | "vehicle" | "environment" | "prop" | "system";
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  physics: {
    body_type: "dynamic" | "kinematic" | "static";
    mass_kg: number;
    collider: "box" | "sphere" | "capsule" | "mesh_convex";
    joint_constraints: Universal3DJointConstraint[];
    friction: number;
    bounciness: number;
    gravity_scale: number;
  };
  entity_architecture: {
    base_assets: string[];
    primitives: string[];
    hierarchy: string[];
  };
  locomotion: {
    type:
      | "procedural_ik_biped"
      | "procedural_ik_quadruped"
      | "wheeled_physics"
      | "flight_aerodynamics"
      | "rigid_physics";
    max_speed: number;
    jump_force: number;
    turn_rate: number;
    gait_frequency: number;
    use_ik: boolean;
    ik_targets: Array<
      "head" | "left_foot" | "right_foot" | "left_hand" | "right_hand"
    >;
  };
  behavior_tree: {
    initial_state: string;
    states: Record<string, Universal3DState>;
    triggers: string[];
    controls: {
      primary: string[];
      interaction_radius: number;
      mounting_points: string[];
    };
  };
  audio_vfx: {
    looping_sound: string;
    particle_emitters: string[];
    audio_emission_radius: number;
    footstep_effect: string;
    lighting_intensity: number;
  };
  environment_impact: {
    reactions: string[];
    surface_tags: string[];
    spawn_effects: string[];
  };
}

const CATEGORY_VALUES = new Set([
  "character",
  "vehicle",
  "environment",
  "prop",
  "system",
]);

const BODY_TYPES = new Set(["dynamic", "kinematic", "static"]);
const COLLIDERS = new Set(["box", "sphere", "capsule", "mesh_convex"]);
const LOCOMOTION_TYPES = new Set([
  "procedural_ik_biped",
  "procedural_ik_quadruped",
  "wheeled_physics",
  "flight_aerodynamics",
  "rigid_physics",
]);
const IK_TARGETS = new Set([
  "head",
  "left_foot",
  "right_foot",
  "left_hand",
  "right_hand",
]);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isVec3 = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isVec3TupleArray = (value: unknown): value is [number, number, number][] =>
  Array.isArray(value) && value.every(isVec3);

export function validateUniversal3DEntity(
  value: unknown,
): Universal3DEntityPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Universal 3D Director output must be a JSON object.");
  }

  const entity = value as Record<string, unknown>;

  if (typeof entity.entity_id !== "string" || !entity.entity_id.trim()) {
    throw new Error("entity_id is required.");
  }
  if (typeof entity.name !== "string" || !entity.name.trim()) {
    throw new Error("name is required.");
  }
  if (typeof entity.category !== "string" || !CATEGORY_VALUES.has(entity.category)) {
    throw new Error("Invalid entity category.");
  }

  const transform = entity.transform;
  if (!transform || typeof transform !== "object") {
    throw new Error("transform is required.");
  }
  const transformRecord = transform as Record<string, unknown>;
  if (
    !isVec3(transformRecord.position) ||
    !isVec3(transformRecord.rotation) ||
    !isVec3(transformRecord.scale)
  ) {
    throw new Error("transform requires position, rotation, and scale Vector3 arrays.");
  }

  const physics = entity.physics;
  if (!physics || typeof physics !== "object") {
    throw new Error("physics is required.");
  }
  const physicsRecord = physics as Record<string, unknown>;

  if (
    typeof physicsRecord.body_type !== "string" ||
    !BODY_TYPES.has(physicsRecord.body_type)
  ) {
    throw new Error("Invalid physics.body_type.");
  }
  if (!isFiniteNumber(physicsRecord.mass_kg) || physicsRecord.mass_kg < 0) {
    throw new Error("physics.mass_kg must be a non-negative finite number.");
  }
  if (
    typeof physicsRecord.collider !== "string" ||
    !COLLIDERS.has(physicsRecord.collider)
  ) {
    throw new Error("Invalid physics.collider.");
  }
  if (!Array.isArray(physicsRecord.joint_constraints)) {
    throw new Error("physics.joint_constraints must be an array.");
  }
  if (!isFiniteNumber(physicsRecord.friction) || physicsRecord.friction < 0) {
    throw new Error("physics.friction must be a non-negative finite number.");
  }
  if (
    !isFiniteNumber(physicsRecord.bounciness) ||
    physicsRecord.bounciness < 0
  ) {
    throw new Error("physics.bounciness must be a non-negative finite number.");
  }
  if (
    !isFiniteNumber(physicsRecord.gravity_scale) ||
    physicsRecord.gravity_scale < -10 ||
    physicsRecord.gravity_scale > 10
  ) {
    throw new Error("physics.gravity_scale must be between -10 and 10.");
  }

  const architecture = entity.entity_architecture;
  if (!architecture || typeof architecture !== "object") {
    throw new Error("entity_architecture is required.");
  }
  const architectureRecord = architecture as Record<string, unknown>;
  if (
    !isStringArray(architectureRecord.base_assets) ||
    !isStringArray(architectureRecord.primitives) ||
    !isStringArray(architectureRecord.hierarchy)
  ) {
    throw new Error("entity_architecture fields must be string arrays.");
  }

  const locomotion = entity.locomotion;
  if (!locomotion || typeof locomotion !== "object") {
    throw new Error("locomotion is required.");
  }
  const locomotionRecord = locomotion as Record<string, unknown>;
  if (
    typeof locomotionRecord.type !== "string" ||
    !LOCOMOTION_TYPES.has(locomotionRecord.type)
  ) {
    throw new Error("Invalid locomotion.type.");
  }

  for (const field of ["max_speed", "jump_force", "turn_rate", "gait_frequency"]) {
    if (!isFiniteNumber(locomotionRecord[field])) {
      throw new Error(`locomotion.${field} must be a finite number.`);
    }
  }

  if (typeof locomotionRecord.use_ik !== "boolean") {
    throw new Error("locomotion.use_ik must be boolean.");
  }

  if (
    !Array.isArray(locomotionRecord.ik_targets) ||
    locomotionRecord.ik_targets.some(
      (target) => typeof target !== "string" || !IK_TARGETS.has(target),
    )
  ) {
    throw new Error("locomotion.ik_targets contains an invalid target.");
  }

  const behavior = entity.behavior_tree;
  if (!behavior || typeof behavior !== "object") {
    throw new Error("behavior_tree is required.");
  }
  const behaviorRecord = behavior as Record<string, unknown>;
  if (typeof behaviorRecord.initial_state !== "string") {
    throw new Error("behavior_tree.initial_state must be a string.");
  }
  if (!behaviorRecord.states || typeof behaviorRecord.states !== "object") {
    throw new Error("behavior_tree.states is required.");
  }
  if (!isStringArray(behaviorRecord.triggers)) {
    throw new Error("behavior_tree.triggers must be a string array.");
  }

  const controls = behaviorRecord.controls;
  if (!controls || typeof controls !== "object") {
    throw new Error("behavior_tree.controls is required.");
  }
  const controlsRecord = controls as Record<string, unknown>;
  if (!isStringArray(controlsRecord.primary)) {
    throw new Error("behavior_tree.controls.primary must be a string array.");
  }
  if (
    !isFiniteNumber(controlsRecord.interaction_radius) ||
    controlsRecord.interaction_radius < 0
  ) {
    throw new Error("behavior_tree.controls.interaction_radius must be non-negative.");
  }
  if (!isStringArray(controlsRecord.mounting_points)) {
    throw new Error("behavior_tree.controls.mounting_points must be a string array.");
  }

  const audioVfx = entity.audio_vfx;
  if (!audioVfx || typeof audioVfx !== "object") {
    throw new Error("audio_vfx is required.");
  }
  const audioVfxRecord = audioVfx as Record<string, unknown>;
  if (
    typeof audioVfxRecord.looping_sound !== "string" ||
    !isStringArray(audioVfxRecord.particle_emitters) ||
    !isFiniteNumber(audioVfxRecord.audio_emission_radius) ||
    typeof audioVfxRecord.footstep_effect !== "string" ||
    !isFiniteNumber(audioVfxRecord.lighting_intensity)
  ) {
    throw new Error("Invalid audio_vfx payload.");
  }

  const environmentImpact = entity.environment_impact;
  if (!environmentImpact || typeof environmentImpact !== "object") {
    throw new Error("environment_impact is required.");
  }
  const environmentImpactRecord = environmentImpact as Record<string, unknown>;
  if (
    !isStringArray(environmentImpactRecord.reactions) ||
    !isStringArray(environmentImpactRecord.surface_tags) ||
    !isStringArray(environmentImpactRecord.spawn_effects)
  ) {
    throw new Error("Invalid environment_impact payload.");
  }

  return entity as unknown as Universal3DEntityPayload;
}

export const UNIVERSAL_3D_DIRECTOR_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    entity_id: { type: "string" },
    name: { type: "string" },
    category: {
      type: "string",
      enum: ["character", "vehicle", "environment", "prop", "system"],
    },
    transform: {
      type: "object",
      additionalProperties: false,
      properties: {
        position: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
        rotation: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
        scale: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
      },
      required: ["position", "rotation", "scale"],
    },
    entity_architecture: {
      type: "object",
      additionalProperties: false,
      properties: {
        base_assets: { type: "array", items: { type: "string" } },
        primitives: { type: "array", items: { type: "string" } },
        hierarchy: { type: "array", items: { type: "string" } },
      },
      required: ["base_assets", "primitives", "hierarchy"],
    },
    physics: {
      type: "object",
      additionalProperties: false,
      properties: {
        body_type: { type: "string", enum: ["dynamic", "kinematic", "static"] },
        mass_kg: { type: "number" },
        collider: { type: "string", enum: ["box", "sphere", "capsule", "mesh_convex"] },
        joint_constraints: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              connected_to: { type: ["string", "null"] },
              break_force: { type: "number" },
              break_torque: { type: "number" },
              limits: {
                type: "object",
                additionalProperties: false,
                properties: {
                  linear: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                  angular: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
                },
                required: ["linear", "angular"],
              },
            },
            required: ["name", "connected_to", "break_force", "break_torque", "limits"],
          },
        },
        friction: { type: "number" },
        bounciness: { type: "number" },
        gravity_scale: { type: "number" },
      },
      required: [
        "body_type",
        "mass_kg",
        "collider",
        "joint_constraints",
        "friction",
        "bounciness",
        "gravity_scale",
      ],
    },
    locomotion: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: {
          type: "string",
          enum: [
            "procedural_ik_biped",
            "procedural_ik_quadruped",
            "wheeled_physics",
            "flight_aerodynamics",
            "rigid_physics",
          ],
        },
        max_speed: { type: "number" },
        jump_force: { type: "number" },
        turn_rate: { type: "number" },
        gait_frequency: { type: "number" },
        use_ik: { type: "boolean" },
        ik_targets: {
          type: "array",
          items: {
            type: "string",
            enum: ["head", "left_foot", "right_foot", "left_hand", "right_hand"],
          },
        },
      },
      required: [
        "type",
        "max_speed",
        "jump_force",
        "turn_rate",
        "gait_frequency",
        "use_ik",
        "ik_targets",
      ],
    },
    behavior_tree: {
      type: "object",
      additionalProperties: false,
      properties: {
        initial_state: { type: "string" },
        states: { type: "object", additionalProperties: true },
        triggers: { type: "array", items: { type: "string" } },
        controls: {
          type: "object",
          additionalProperties: false,
          properties: {
            primary: { type: "array", items: { type: "string" } },
            interaction_radius: { type: "number" },
            mounting_points: { type: "array", items: { type: "string" } },
          },
          required: ["primary", "interaction_radius", "mounting_points"],
        },
      },
      required: ["initial_state", "states", "triggers", "controls"],
    },
    audio_vfx: {
      type: "object",
      additionalProperties: false,
      properties: {
        looping_sound: { type: "string" },
        particle_emitters: { type: "array", items: { type: "string" } },
        audio_emission_radius: { type: "number" },
        footstep_effect: { type: "string" },
        lighting_intensity: { type: "number" },
      },
      required: [
        "looping_sound",
        "particle_emitters",
        "audio_emission_radius",
        "footstep_effect",
        "lighting_intensity",
      ],
    },
    environment_impact: {
      type: "object",
      additionalProperties: false,
      properties: {
        reactions: { type: "array", items: { type: "string" } },
        surface_tags: { type: "array", items: { type: "string" } },
        spawn_effects: { type: "array", items: { type: "string" } },
      },
      required: ["reactions", "surface_tags", "spawn_effects"],
    },
  },
  required: [
    "entity_id",
    "name",
    "category",
    "transform",
    "physics",
    "entity_architecture",
    "locomotion",
    "behavior_tree",
    "audio_vfx",
    "environment_impact",
  ],
} as const;
