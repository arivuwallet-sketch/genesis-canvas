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
import { MODEL_CATALOG } from "./assetManager";

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

/** Only URLs we actually host are honoured — hallucinated models fall back. */
function modelUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  const known = MODEL_CATALOG.find(
    (e) => e.modelUrl === s || e.name.toLowerCase() === s.toLowerCase(),
  );
  if (known) return known.modelUrl;
  if (s.startsWith("/models/") && s.endsWith(".glb")) {
    return MODEL_CATALOG.some((e) => e.modelUrl === s) ? s : null;
  }
  return null;
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

  const url = modelUrl(cmd["modelUrl"] ?? cmd["url"] ?? cmd["model"]);
  const geo = geometry(cmd["geometry"] ?? cmd["shape"] ?? cmd["primitive"]);
  const type = typeof cmd["type"] === "string" ? cmd["type"].toLowerCase() : null;

  if (url) {
    patch.kind = "model";
    patch.modelUrl = url;
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
  const objects = useEditorStore.getState().spawnedObjects;
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
    case "spawn":
    case "create":
    case "add": {
      const count = clamp(num(input["count"], 1, 1, 12), 1, 12);
      const patch = toObjectPatch(input);
      let last = "";
      for (let i = 0; i < count; i++) {
        const jitter: [number, number, number] = patch.position
          ? [
              patch.position[0] + (i ? (Math.random() - 0.5) * 2 : 0),
              patch.position[1] + i * 1.5,
              patch.position[2] + (i ? (Math.random() - 0.5) * 2 : 0),
            ]
          : [(Math.random() - 0.5) * 6, 5 + i * 1.5, (Math.random() - 0.5) * 6];
        last = store.spawnObject({
          ...patch,
          position: jitter,
          name: patch.name ?? (patch.kind === "model" ? "Model" : "Primitive"),
        });
      }
      return {
        ok: true,
        message: `Spawned ${count} ${patch.name ?? patch.geometry ?? "object"}${count > 1 ? "s" : ""} (${last.slice(0, 6)}).`,
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

    case "clear":
    case "reset": {
      store.clearObjects();
      return { ok: true, message: "World cleared." };
    }

    default:
      return { ok: false, message: `Unknown action "${action || "none"}".` };
  }
}

/** Parse raw model text and apply every valid command found in it. */
export function applyAiResponse(raw: string): CommandResult {
  const candidates = extractJsonCandidates(raw);
  if (candidates.length === 0)
    return { ok: false, message: "No structured command in the response." };

  const results = candidates.map(applyCommand).filter((r) => r.ok);
  if (results.length === 0)
    return { ok: false, message: "Command payload was not actionable." };
  return { ok: true, message: results.map((r) => r.message).join(" ") };
}
