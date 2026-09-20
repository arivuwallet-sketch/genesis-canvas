/**
 * CommandParser — translates AI JSON payloads into Zustand world updates.
 *
 * SECURITY: this module NEVER evaluates code. `eval`, `new Function` and any
 * other dynamic execution path are deliberately absent. Only strict
 * `JSON.parse` output is accepted, and every field is whitelisted, coerced and
 * clamped before it can touch the scene graph.
 */
import {
  useEditorStore,
  type PhysicsProps,
  type PrimitiveGeometry,
  type SpawnedObject,
} from "../store/useEditorStore";
import { MODEL_CATALOG, matchCatalog, type CatalogEntry } from "../data/modelCatalog";
import { useGameConfigStore } from "../store/useGameConfigStore";

const GEOMETRIES: PrimitiveGeometry[] = [
  "box",
  "sphere",
  "cylinder",
  "cone",
  "torus",
  "capsule",
];

export interface CommandResult {
  ok: boolean;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Safe extraction of JSON from a model response                       */
/* ------------------------------------------------------------------ */

/** Pull JSON objects/arrays out of raw model text (handles ```json fences). */
export function extractJsonCandidates(raw: string): unknown[] {
  const text = raw.replace(/```json/gi, "```").replace(/```/g, "\n");
  const out: unknown[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{" || ch === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          out.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          /* not valid JSON — ignore, never execute */
        }
        start = -1;
      }
      if (depth < 0) depth = 0;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Coercion helpers                                                    */
/* ------------------------------------------------------------------ */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function num(v: unknown, fallback: number, min = -1e4, max = 1e4): number {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? clamp(n, min, max) : fallback;
}

function vec3(v: unknown, fallback: [number, number, number], min = -500, max = 500) {
  if (Array.isArray(v) && v.length >= 3) {
    return [
      num(v[0], fallback[0], min, max),
      num(v[1], fallback[1], min, max),
      num(v[2], fallback[2], min, max),
    ] as [number, number, number];
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const s = clamp(v, min, max);
    return [s, s, s] as [number, number, number];
  }
  if (isRecord(v) && ("x" in v || "y" in v || "z" in v)) {
    return [
      num(v["x"], fallback[0], min, max),
      num(v["y"], fallback[1], min, max),
      num(v["z"], fallback[2], min, max),
    ] as [number, number, number];
  }
  return null;
}

/** Only accept plain CSS hex / simple named colours — never arbitrary strings. */
function color(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  if (/^[a-z]{3,20}$/i.test(s)) return s.toLowerCase();
  return null;
}

function geometry(v: unknown): PrimitiveGeometry | null {
  if (typeof v !== "string") return null;
  const s = v.toLowerCase().trim();
  if ((GEOMETRIES as string[]).includes(s)) return s as PrimitiveGeometry;
  if (s === "cube" || s === "block") return "box";
  if (s === "ball" || s === "orb") return "sphere";
  if (s === "pill") return "capsule";
  if (s === "ring" || s === "donut") return "torus";
  return null;
}

/**
 * Resolve any model reference to a library entry we actually host.
 * Exact URL/name first, then keyword matching, so "a red sports car" or
 * "/models/ferrari.glb" both land on a real asset instead of a box.
 */
function resolveModel(v: unknown): CatalogEntry | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const exact = MODEL_CATALOG.find(
    (e) => e.modelUrl === s || e.name.toLowerCase() === s.toLowerCase(),
  );
  if (exact) return exact;
  // Hallucinated path like /models/ferrari.glb → match on the file stem.
  const stem = s.replace(/^.*\//, "").replace(/\.(glb|gltf)$/i, "").replace(/[-_]+/g, " ");
  return matchCatalog(stem) ?? matchCatalog(s);
}

function physics(v: unknown): Partial<PhysicsProps> {
  if (!isRecord(v)) return {};
  const out: Partial<PhysicsProps> = {};
  const t = v["type"] ?? v["bodyType"];
  if (t === "fixed" || t === "static" || v["static"] === true) out.type = "fixed";
  if (t === "dynamic") out.type = "dynamic";
  if (v["gravity"] === false) out.gravityScale = 0;
  if ("mass" in v) out.mass = num(v["mass"], 1, 0.01, 1000);
  if ("restitution" in v || "bounciness" in v)
    out.restitution = num(v["restitution"] ?? v["bounciness"], 0.2, 0, 2);
  if ("friction" in v) out.friction = num(v["friction"], 1, 0, 10);
  if ("gravityScale" in v) out.gravityScale = num(v["gravityScale"], 1, -5, 10);
  return out;
}

/* ------------------------------------------------------------------ */
/* Command normalisation                                               */
/* ------------------------------------------------------------------ */

function toObjectPatch(cmd: Record<string, unknown>): Partial<SpawnedObject> {
  const patch: Partial<SpawnedObject> = {};

  const rawName = cmd["name"] ?? cmd["label"];
  const entry =
    resolveModel(cmd["modelUrl"] ?? cmd["url"] ?? cmd["model"]) ??
    resolveModel(cmd["asset"] ?? cmd["object"] ?? rawName);
  const geo = geometry(cmd["geometry"] ?? cmd["shape"] ?? cmd["primitive"]);
  const type = typeof cmd["type"] === "string" ? cmd["type"].toLowerCase() : null;

  // An explicit primitive request wins only when no real library asset matched.
  if (entry) {
    patch.kind = "model";
    patch.modelUrl = entry.modelUrl;
    patch.name = entry.name;
    patch.scale = [entry.scale, entry.scale, entry.scale];
  } else if (geo || type === "primitive") {
    patch.kind = "primitive";
    patch.modelUrl = null;
    patch.geometry = geo ?? "box";
  } else if (type === "model" || type === "gltf") {
    // Hallucinated / unknown model → safe geometric placeholder.
    patch.kind = "primitive";
    patch.modelUrl = null;
    patch.geometry = "box";
  }

  const name = cmd["name"] ?? cmd["label"];
  if (typeof name === "string" && name.trim()) patch.name = name.trim().slice(0, 40);

  const pos = vec3(cmd["position"] ?? cmd["pos"], [0, 5, 0]);
  if (pos) patch.position = pos;

  const rot = vec3(cmd["rotation"] ?? cmd["rot"], [0, 0, 0], -Math.PI * 4, Math.PI * 4);
  if (rot) patch.rotation = rot;

  const scl = vec3(cmd["scale"] ?? cmd["size"], [1, 1, 1], 0.05, 40);
  if (scl) patch.scale = scl;

  const col = color(cmd["color"] ?? cmd["colour"] ?? cmd["material"]);
  if (col) patch.color = col;

  if ("metalness" in cmd) patch.metalness = num(cmd["metalness"], 0.4, 0, 1);
  if ("roughness" in cmd) patch.roughness = num(cmd["roughness"], 0.4, 0, 1);
  if ("emissive" in cmd || "glow" in cmd)
    patch.emissive = num(cmd["emissive"] ?? cmd["glow"], 0, 0, 4);

  const phys = physics(cmd["physics"] ?? cmd);
  if (Object.keys(phys).length) patch.physics = phys as PhysicsProps;

  return patch;
}

function resolveTargetId(cmd: Record<string, unknown>): string | null {
  const raw = cmd["targetId"] ?? cmd["id"] ?? cmd["target"];
  const state = useEditorStore.getState();
  const objects = state.spawnedObjects;
  if (raw === undefined && state.selectedId) return state.selectedId;
  if (typeof raw === "string") {
    const byId = objects.find((o) => o.id === raw);
    if (byId) return byId.id;
    const byName = objects.find((o) => o.name.toLowerCase() === raw.toLowerCase());
    if (byName) return byName.id;
    if (raw === "last" || raw === "latest")
      return objects.length ? objects[objects.length - 1]!.id : null;
    return null;
  }
  return objects.length ? objects[objects.length - 1]!.id : null;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function applyCommand(input: unknown): CommandResult {
  if (Array.isArray(input)) {
    const results = input.map(applyCommand);
    return {
      ok: results.some((r) => r.ok),
      message: results.map((r) => r.message).join(" "),
    };
  }
  if (!isRecord(input)) return { ok: false, message: "Ignored malformed payload." };

  // Batched payloads: { actions: [...] } or { commands: [...] }
  const batch = input["actions"] ?? input["commands"] ?? input["objects"];
  if (Array.isArray(batch) && !("action" in input)) return applyCommand(batch);

  const store = useEditorStore.getState();
  const action = String(input["action"] ?? input["op"] ?? "").toLowerCase();

  switch (action) {
    case "environment":
    case "set_environment":
    case "terrain": {
      const game = useGameConfigStore.getState();
      const terrain = isRecord(input["terrain"]) ? input["terrain"] : input;
      const biomeColor = color(terrain["biomeColor"] ?? terrain["color"]);
      game.setTerrain({
        roughness: num(terrain["roughness"], game.terrain.roughness, 0.1, 2),
        mountainHeight: num(
          terrain["mountainHeight"] ?? terrain["height"],
          game.terrain.mountainHeight,
          0,
          15,
        ),
        ...(biomeColor ? { biomeColor } : {}),
      });
      if ("timeOfDay" in input) {
        game.setTimeOfDay(num(input["timeOfDay"], game.timeOfDay, 0, 24));
      }
      return { ok: true, message: "Updated the procedural environment." };
    }

    case "play_animation":
    case "animate": {
      const entityId = String(input["entityId"] ?? input["targetId"] ?? input["id"] ?? "");
      const animationName = String(input["animationName"] ?? input["animation"] ?? "");
      if (!entityId || !animationName) {
        return { ok: false, message: "Animation request is missing an entity or animation name." };
      }
      const ok = store.playAnimation(
        entityId,
        animationName,
        num(input["blendTime"], 0.2, 0, 5),
      );
      return ok
        ? { ok: true, message: `Playing ${animationName} on ${entityId.slice(0, 6)}.` }
        : { ok: false, message: `Animation "${animationName}" was not found on that entity.` };
    }

    case "spawn":
    case "create":
    case "add": {
      const count = clamp(num(input["count"], 1, 1, 12), 1, 12);
      const patch = toObjectPatch(input);
      const requestedModel = input["modelUrl"] ?? input["url"] ?? input["model"] ?? input["asset"];
      const requestedText = requestedModel ?? input["name"] ?? input["object"];
      const matchedModel = resolveModel(requestedText);
      const unknownModelFallback =
        typeof requestedText === "string" &&
        !matchedModel &&
        !geometry(input["geometry"] ?? input["shape"] ?? input["primitive"]) &&
        (input["type"] === "model" || requestedModel !== undefined);
      let last = "";
      const entry = resolveModel(input["modelUrl"] ?? input["url"] ?? input["model"] ?? input["asset"] ?? input["object"] ?? input["name"]);
      const base = patch.position ?? [0, 1, 0];
      for (let i = 0; i < count; i++) {
        // Repeated library assets are laid out across the ground plane instead of
        // being stacked vertically, which makes requests such as "add some trees"
        // immediately read as a scene rather than a pile of primitives.
        const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
        const row = Math.floor(i / cols);
        const col = i % cols;
        const spacing = entry?.category === "nature" ? 4 : 3;
        const jitter = (Math.random() - 0.5) * 0.8;
        const position: [number, number, number] = [
          base[0] + (col - (cols - 1) / 2) * spacing + jitter,
          base[1],
          base[2] + (row - (Math.ceil(count / cols) - 1) / 2) * spacing + jitter,
        ];
        last = store.spawnObject({
          ...patch,
          position,
          name: patch.name ?? entry?.name ?? (patch.kind === "model" ? "Model" : "Primitive"),
        });
      }
      const description = patch.kind === "model"
        ? `real ${patch.name ?? entry?.name ?? "library model"}`
        : unknownModelFallback
          ? `procedural stand-in for unknown "${String(requestedText).slice(0, 32)}"`
          : `primitive ${patch.geometry ?? "box"}`;
      return {
        ok: true,
        message: `Spawned ${count} ${description}${count > 1 ? "s" : ""} (${last.slice(0, 6)}).`,
      };
    }

    case "update":
    case "modify":
    case "set": {
      const id = resolveTargetId(input);
      if (!id) return { ok: false, message: "No matching entity to update." };
      const patch = toObjectPatch(input);
      delete patch.kind;
      if (patch.modelUrl === null) delete patch.modelUrl;
      store.updateObject(id, patch);
      return { ok: true, message: `Updated entity ${id.slice(0, 6)}.` };
    }

    case "remove":
    case "delete":
    case "despawn": {
      const id = resolveTargetId(input);
      if (!id) return { ok: false, message: "No matching entity to remove." };
      store.removeObject(id);
      return { ok: true, message: `Removed entity ${id.slice(0, 6)}.` };
    }

    case "carve":
    case "subtract":
    case "hole": {
      const id = resolveTargetId(input);
      if (!id) return { ok: false, message: "Select an entity to carve first." };
      const at = vec3(input["position"] ?? input["at"] ?? input["point"], [0, 0, 0], -5, 5) ?? [
        0, 0, 0,
      ];
      const radius = num(input["radius"] ?? input["size"], 0.35, 0.05, 3);
      const ok = store.carveObject(id, { position: at, radius });
      return ok
        ? { ok: true, message: `Carved a ${radius.toFixed(2)}m hole in ${id.slice(0, 6)}.` }
        : { ok: false, message: "Carve failed — entity missing." };
    }

    case "clear":
    case "reset": {
      store.clearObjects();
      return { ok: true, message: "World cleared." };
    }

    default:
      return { ok: false, message: `Unknown action "${action || "none"}".` };
  }
}

/** Extract the human-facing response from the internal assistant envelope. */
export function extractAssistantReply(raw: string): string | null {
  const candidates = extractJsonCandidates(raw);
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const reply = candidate["reply"];
    if (typeof reply === "string" && reply.trim()) return reply.trim().slice(0, 2000);
  }
  return null;
}

/** Parse raw model text and apply every valid action found in it. */
export function applyAiResponse(raw: string): CommandResult {
  const candidates = extractJsonCandidates(raw);
  if (candidates.length === 0)
    return { ok: false, message: "No structured assistant response was received." };

  const messages: string[] = [];
  let actionable = false;
  let conversational = false;

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const reply = candidate["reply"];
    if (typeof reply === "string" && reply.trim()) {
      messages.push(reply.trim().slice(0, 2000));
      conversational = true;
    }

    const batch = candidate["actions"] ?? candidate["commands"] ?? candidate["objects"];
    if (Array.isArray(batch)) {
      const result = applyCommand(batch);
      if (result.ok) {
        messages.push(result.message);
        actionable = true;
      }
    } else if ("action" in candidate) {
      const result = applyCommand(candidate);
      if (result.ok) {
        messages.push(result.message);
        actionable = true;
      }
    }
  }

  if (!actionable && !conversational)
    return { ok: false, message: "Assistant response was not actionable." };

  return { ok: true, message: messages.join(" ") };
}
