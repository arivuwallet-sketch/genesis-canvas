import { registerGeneratedModel, type AssetCategory } from "../data/modelCatalog";
import { useEditorStore } from "../store/useEditorStore";
import { inferGameplaySpec } from "../gameplay/GameplayActorTypes";
import { applyCommand } from "./CommandParser";

/** Prompts that should be sculpted by the text-to-3D generator instead of the library. */
export function isGenerationPrompt(prompt: string, catalogHit: boolean): boolean {
  const p = prompt.toLowerCase();
  if (/^\/gen(erate)?\b/.test(p)) return true;
  if (/\b(rigged|blender|sculpt|meshy|text.?to.?3d|custom (3d )?model)\b/.test(p)) return true;
  return !catalogHit && /\bgenerate\b/.test(p) && /\b(realistic|3d|model)\b/.test(p);
}

const HUMANOID =
  /\b(character|person|human|man|woman|boy|girl|knight|soldier|warrior|zombie|wizard|mage|elf|orc|goblin|ninja|samurai|pirate|robot|android|hero|villain|npc|humanoid|astronaut|guard|king|queen|monster)\b/;

function cleanPrompt(prompt: string): string {
  return prompt
    .replace(/^\/gen(erate)?\s*/i, "")
    .replace(/\b(with )?blender\b/gi, "")
    .replace(/\b(please|create|generate|make|build|spawn|add|sculpt|me|a|an)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(body: unknown): Promise<string> {
  const res = await fetch("/api/ai/generate-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !data.id) throw new Error(data.error ?? `Generator error ${res.status}`);
  return data.id;
}

async function waitFor(
  id: string,
  kind: "text" | "rig",
  label: string,
  signal: { cancelled: boolean },
): Promise<string> {
  let lastReported = -1;
  for (let i = 0; i < 240 && !signal.cancelled; i++) {
    await sleep(i === 0 ? 2000 : 5000);
    const res = await fetch(`/api/ai/generate-model?kind=${kind}&id=${encodeURIComponent(id)}`);
    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      progress?: number;
      glbUrl?: string | null;
      error?: string | null;
    };
    if (!res.ok) throw new Error(data.error ?? `Generator error ${res.status}`);
    const progress = Math.round(data.progress ?? 0);
    if (progress >= lastReported + 25 && progress < 100) {
      lastReported = progress;
      useEditorStore.getState().pushLog(`${label}… ${progress}%`, "system");
    }
    if (data.status === "SUCCEEDED" && data.glbUrl) return data.glbUrl;
    if (data.status === "FAILED" || data.status === "CANCELED" || data.status === "EXPIRED") {
      throw new Error(data.error ?? `${label} failed.`);
    }
  }
  throw new Error(`${label} timed out.`);
}

const proxied = (url: string) => `/api/ai/model-file?src=${encodeURIComponent(url)}`;

/** Full pipeline: sculpt → PBR texture → (auto-rig humanoids) → spawn into the world. */
export async function generateRealisticModel(prompt: string): Promise<void> {
  const log = (t: string, k: "system" | "ai" | "error" = "system") =>
    useEditorStore.getState().pushLog(t, k);
  const subject = cleanPrompt(prompt) || prompt;
  const humanoid = HUMANOID.test(subject.toLowerCase()) || /\brigged\b/i.test(prompt);
  const signal = { cancelled: false };

  log(
    `Sculpting a realistic "${subject}"${humanoid ? " with a skeleton for animation" : ""}. This takes about 2–5 minutes; you can keep building meanwhile.`,
    "ai",
  );

  try {
    const previewId = await post({ action: "preview", prompt: subject });
    await waitFor(previewId, "text", "Sculpting shape", signal);
    const refineId = await post({ action: "refine", previewId });
    let glb = await waitFor(refineId, "text", "Painting realistic materials", signal);

    let rigged = false;
    if (humanoid) {
      try {
        const rigId = await post({ action: "rig", taskId: refineId });
        glb = await waitFor(rigId, "rig", "Adding skeleton", signal);
        rigged = true;
      } catch (e) {
        log(`Couldn't rig this model (${(e as Error).message}); placing it unrigged.`);
      }
    }

    const category: AssetCategory = humanoid ? "character" : "prop";
    const name = subject.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
    const entry = registerGeneratedModel({
      name,
      modelUrl: proxied(glb),
      scale: humanoid ? 1 : 1.5,
      category,
      keywords: [subject.toLowerCase()],
    });

    const result = applyCommand({
      action: "spawn",
      type: "model",
      modelUrl: entry.modelUrl,
      name: entry.name,
      position: [0, 1.5, 0],
      physics: { type: humanoid ? "dynamic" : "fixed" },
      gameplay: inferGameplaySpec(category, subject),
    });
    log(
      result.ok
        ? `${name} is ready — realistic textured model${rigged ? ", rigged for animation" : ""}, placed in the world.`
        : result.message,
      result.ok ? "ai" : "error",
    );
  } catch (e) {
    const msg = (e as Error).message;
    log(
      msg === "missing_key"
        ? "The realistic 3D generator isn't connected yet — add a Meshy API key to turn it on."
        : `Model generation failed: ${msg}`,
      "error",
    );
  }
}
