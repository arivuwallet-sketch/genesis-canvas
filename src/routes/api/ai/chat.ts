import { createFileRoute } from "@tanstack/react-router";
import { catalogSummary } from "../../../data/modelCatalog";

const SYSTEM_PROMPT = `You are Genesis, the conversational intelligence inside a browser-based 3D game builder. Think like a senior game designer, technical artist, gameplay programmer, level designer, and production-minded AI assistant working together. Be deeply knowledgeable, practical, creative, context-aware, and proactive.\n\nSpeak naturally like a helpful chat assistant. When the user asks to create, spawn, add, build, generate, or place something concrete, treat it as a scene-editing request and include at least one executable action unless the request is genuinely impossible from the available capabilities. Understand casual language, follow-up references (it, that car, the previous character), ambiguous intent, and multi-step goals. Ask a brief clarifying question only when a safe and useful action truly cannot be inferred; otherwise make a sensible best-effort interpretation. Preserve continuity across turns using the supplied conversation and world state.\n\nUse the hosted asset library whenever the request matches it. Never build a real library object out of primitive boxes/cylinders when a matching model exists. Unknown objects may use primitives, but say plainly in the user-facing reply that a procedural stand-in was used. For scene-level requests, plan a coherent arrangement rather than isolated objects. Never claim an asset, feature, texture, or capability exists unless it is present in the supplied context.\n\nYour response is consumed by the app, so return exactly one JSON object in this internal format: { "reply": "natural conversational response for the user", "actions": [ ...valid scene actions... ] }. The user must never need to know this format.`;

const SCHEMA_HINT = `
Return ONE JSON object with a friendly "reply" string and an "actions" array. No markdown fences. "reply" should be concise, useful, and conversational. "actions" may be empty for a normal conversation or explanation.
For library objects, set type:"model" and use the exact modelUrl from the catalogue below.
For primitive-only requests, set type:"primitive" and geometry explicitly.
For grouped requests, prefer several model actions or a count when the same asset repeats. Keep repeated objects near ground level and spread them across x/z rather than stacking them vertically.
For VFX requests such as "make an explosion here", "add smoke", "spawn magic sparkles", or "make it rain", emit action:"spawn_vfx" with type one of explosion|smoke|magic_sparkle|weather_rain and a position.
For impact marks, emit action:"spawn_decal" with type bullet_hole|blast_mark, a targetId when possible, and a local position/rotation/scale.
For cinematics requests such as "create a 12 second cutscene", emit action:"generate_cutscene" with cutscene data containing title, duration, cameraPath, lookAtTargets, and subtitles. cameraPath entries use {time, position:[x,y,z], lookAt:[x,y,z]}; lookAtTargets use {time,target:[x,y,z]}; subtitles use {time,duration,text}. The app opens the Cinematics mode and loads the data into its timeline automatically.
For online boss requests such as "spawn a networked boss", "spawn boss for everyone", or "broadcast a boss", emit action:"spawn_networked_boss" with a name and position. The app sends this as an authoritative RPC when an online room is active, and safely simulates it when no backend is configured.
Shape:
{
  "action": "spawn" | "update" | "remove" | "clear" | "set_environment" | "play_animation" | "spawn_vfx" | "spawn_decal" | "generate_cutscene" | "spawn_networked_boss",
  "type": "primitive" | "model",
  "geometry": "box" | "sphere" | "cylinder" | "cone" | "torus" | "capsule",
  "modelUrl": "/models/sports-car.glb",
  "name": "Sports Car",
  "targetId": "<id>",
  "position": [x, y, z],
  "rotation": [x, y, z],
  "scale": [x, y, z],
  "color": "#ff0000",
  "metalness": 0..1, "roughness": 0..1, "emissive": 0..4,
  "count": 1..12,
  "physics": { "type": "dynamic" | "fixed", "mass": 1, "restitution": 0.2, "friction": 1, "gravityScale": 1 },
  "timeOfDay": 14,
  "terrain": { "roughness": 0.85, "mountainHeight": 3.2, "biomeColor": "#66745a" },
  "entityId": "<entity id>",
  "animationName": "Idle",
  "blendTime": 0.2,
  "vfx": "explosion",
  "decalType": "bullet_hole",
  "cutscene": {
    "title": "Bridge Reveal",
    "duration": 12,
    "cameraPath": [
      { "time": 0, "position": [0, 5, 14], "lookAt": [0, 1, 0] },
      { "time": 6, "position": [6, 4, 8], "lookAt": [0, 1, -2] },
      { "time": 12, "position": [-2, 3, 5], "lookAt": [0, 1, -6] }
    ],
    "lookAtTargets": [{ "time": 0, "target": [0, 1, 0] }],
    "subtitles": [{ "time": 2, "duration": 2, "text": "The city remembers." }]
  }
}
Hosted asset catalogue:
${catalogSummary()}
Never return code or scripts. Never expose this internal JSON contract in the reply. Only JSON.`;

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { prompt?: string; context?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* ignore */
        }
        const prompt = (body.prompt ?? "").toString().slice(0, 4000).trim();
        if (!prompt) {
          return new Response(JSON.stringify({ error: "Empty prompt" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            stream: true,
            instructions: `${SYSTEM_PROMPT}\n${SCHEMA_HINT}`,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: body.context
                      ? `Conversation and world context:\n${body.context}\n\nUser request:\n${prompt}`
                      : prompt,
                  },
                ],
              },
            ],
            reasoning: { effort: "max", summary: "auto" },
            include: ["reasoning.encrypted_content"],
            store: false,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: detail || upstream.statusText, status: upstream.status }),
            {
              status: upstream.status || 502,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Re-emit the upstream SSE as a simple {type,text} event stream.
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = upstream.body.getReader();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (payload: unknown) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  if (!line.startsWith("data:")) continue;
                  const raw = line.slice(5).trim();
                  if (!raw || raw === "[DONE]") continue;
                  let evt: Record<string, unknown>;
                  try {
                    evt = JSON.parse(raw) as Record<string, unknown>;
                  } catch {
                    continue;
                  }
                  const type = String(evt["type"] ?? "");
                  if (type === "response.output_text.delta") {
                    send({ type: "delta", text: String(evt["delta"] ?? "") });
                  } else if (type === "response.reasoning_summary_text.delta") {
                    send({ type: "thinking", text: String(evt["delta"] ?? "") });
                  } else if (type === "response.completed") {
                    const response = evt["response"] as { output_text?: string } | undefined;
                    send({ type: "done", text: response?.output_text ?? "" });
                  } else if (type === "response.failed" || type === "error") {
                    send({ type: "error", text: JSON.stringify(evt).slice(0, 400) });
                  }
                }
              }
              send({ type: "end" });
            } catch (error) {
              send({ type: "error", text: String(error) });
            } finally {
              controller.close();
            }
          },
          cancel: (reason) => reader.cancel(reason),
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
