import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Text-to-3D generation (Meshy). Produces sculpted, PBR-textured GLB models and
 * optionally auto-rigs humanoids. The client drives the stages and polls.
 */
const MESHY = "https://api.meshy.ai/openapi";

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), prompt: z.string().min(2).max(600) }),
  z.object({ action: z.literal("refine"), previewId: z.string().min(4).max(80) }),
  z.object({ action: z.literal("rig"), taskId: z.string().min(4).max(80) }),
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function meshy(path: string, apiKey: string, body?: unknown) {
  const res = await fetch(`${MESHY}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* non-JSON error */
  }
  if (!res.ok) {
    const msg =
      res.status === 401
        ? "The 3D generator key is invalid."
        : res.status === 402
          ? "The 3D generator account is out of credits."
          : res.status === 429
            ? "The 3D generator is busy — try again shortly."
            : String(data["message"] ?? text).slice(0, 200) || `Generator error ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return data;
}

export const Route = createFileRoute("/api/ai/generate-model")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["MESHY_API_KEY"];
        if (!apiKey) return json({ error: "missing_key" }, 503);
        let input: z.infer<typeof postSchema>;
        try {
          input = postSchema.parse(await request.json());
        } catch {
          return json({ error: "Invalid request" }, 400);
        }
        try {
          if (input.action === "preview") {
            const d = await meshy("/v2/text-to-3d", apiKey, {
              mode: "preview",
              prompt: input.prompt,
              art_style: "realistic",
              should_remesh: true,
              topology: "triangle",
              target_polycount: 30000,
            });
            return json({ id: d["result"] });
          }
          if (input.action === "refine") {
            const d = await meshy("/v2/text-to-3d", apiKey, {
              mode: "refine",
              preview_task_id: input.previewId,
              enable_pbr: true,
            });
            return json({ id: d["result"] });
          }
          const d = await meshy("/v1/rigging", apiKey, {
            input_task_id: input.taskId,
            height_meters: 1.75,
          });
          return json({ id: d["result"] });
        } catch (e) {
          const err = e as Error & { status?: number };
          return json({ error: err.message }, err.status && err.status < 600 ? err.status : 502);
        }
      },

      GET: async ({ request }) => {
        const apiKey = process.env["MESHY_API_KEY"];
        if (!apiKey) return json({ error: "missing_key" }, 503);
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        const kind = url.searchParams.get("kind") === "rig" ? "rig" : "text";
        if (!/^[A-Za-z0-9-]{4,80}$/.test(id)) return json({ error: "Invalid id" }, 400);
        try {
          const d = await meshy(kind === "rig" ? `/v1/rigging/${id}` : `/v2/text-to-3d/${id}`, apiKey);
          const result = (d["result"] ?? {}) as Record<string, unknown>;
          const modelUrls = (d["model_urls"] ?? {}) as Record<string, unknown>;
          const glb =
            kind === "rig"
              ? (result["rigged_character_glb_url"] as string | undefined)
              : (modelUrls["glb"] as string | undefined);
          const taskError = (d["task_error"] ?? {}) as Record<string, unknown>;
          return json({
            status: String(d["status"] ?? "PENDING"),
            progress: Number(d["progress"] ?? 0),
            glbUrl: glb ?? null,
            error: taskError["message"] ? String(taskError["message"]) : null,
          });
        } catch (e) {
          const err = e as Error & { status?: number };
          return json({ error: err.message }, err.status && err.status < 600 ? err.status : 502);
        }
      },
    },
  },
});
