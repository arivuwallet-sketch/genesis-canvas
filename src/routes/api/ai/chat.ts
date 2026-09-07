import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT =
  "You are an omnipotent 3D game engine assistant. When a user requests an object or logic, respond ONLY with a strict JSON object detailing the action, model URL/type, position, and physics properties.";

const SCHEMA_HINT = `
Reply with ONE JSON object (or an array of them) and nothing else. No prose, no markdown fences.
Shape:
{
  "action": "spawn" | "update" | "remove" | "clear",
  "type": "primitive" | "model",
  "geometry": "box" | "sphere" | "cylinder" | "cone" | "torus" | "capsule",
  "modelUrl": "/models/robot.glb",           // ONLY this URL exists; otherwise use a primitive
  "name": "Red Box",
  "targetId": "<id>",                        // for update/remove; omit to target the newest entity
  "position": [x, y, z],                     // y is up; spawn above ground, e.g. 5
  "rotation": [x, y, z],
  "scale": [x, y, z],
  "color": "#ff0000",
  "metalness": 0..1, "roughness": 0..1, "emissive": 0..4,
  "count": 1..12,
  "physics": { "type": "dynamic" | "fixed", "mass": 1, "restitution": 0.2, "friction": 1, "gravityScale": 1 }
}
Never return code or scripts. Only JSON.`;

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
        const prompt = (body.prompt ?? "").toString().slice(0, 2000).trim();
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
            model: "openai/gpt-5.6-sol",
            stream: true,
            instructions: `${SYSTEM_PROMPT}\n${SCHEMA_HINT}`,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: body.context
                      ? `World state:\n${body.context}\n\nRequest: ${prompt}`
                      : prompt,
                  },
                ],
              },
            ],
            reasoning: { effort: "low", summary: "auto" },
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
