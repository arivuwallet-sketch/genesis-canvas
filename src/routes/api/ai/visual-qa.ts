import { createFileRoute } from "@tanstack/react-router";

const VISION_SYSTEM_PROMPT = [
  "You are a silent visual QA agent for a live 3D game builder.",
  "You just inspected the rendered viewport after an AI scene-editing command.",
  "Determine whether the requested result visibly spawned and whether there are obvious missing textures, severe object clipping, broken placement, or obviously incorrect physics presentation.",
  "Do not narrate implementation details.",
  "Return only the strict JSON object requested by the schema.",
  "Only create corrections when the visual evidence supports them.",
  "Use the same scene action vocabulary as the Genesis command parser.",
].join("\n");

const QA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    needsCorrection: { type: "boolean" },
    reason: { type: "string" },
    corrections: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: {
            type: "string",
            enum: ["spawn", "update", "remove", "set_environment", "spawn_vfx"],
          },
          targetId: { type: ["string", "null"] },
          name: { type: ["string", "null"] },
          modelUrl: { type: ["string", "null"] },
          geometry: { type: ["string", "null"] },
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
          metalness: { type: "number" },
          roughness: { type: "number" },
          emissive: { type: "number" },
          count: { type: "integer", minimum: 1, maximum: 8 },
          physics: {
            type: ["object", "null"],
            additionalProperties: false,
            properties: {
              type: { type: ["string", "null"], enum: ["dynamic", "fixed", null] },
              mass: { type: "number" },
              restitution: { type: "number" },
              friction: { type: "number" },
              gravityScale: { type: "number" },
            },
            required: ["type", "mass", "restitution", "friction", "gravityScale"],
          },
          terrain: {
            type: ["object", "null"],
            additionalProperties: false,
            properties: {
              roughness: { type: "number" },
              mountainHeight: { type: "number" },
              biomeColor: { type: "string" },
            },
            required: ["roughness", "mountainHeight", "biomeColor"],
          },
          type: { type: ["string", "null"] },
          preset: { type: ["string", "null"] },
          vfx: { type: ["string", "null"] },
        },
        required: [
          "action",
          "targetId",
          "name",
          "modelUrl",
          "geometry",
          "position",
          "rotation",
          "scale",
          "color",
          "metalness",
          "roughness",
          "emissive",
          "count",
          "physics",
          "terrain",
          "type",
          "preset",
          "vfx",
        ],
      },
    },
  },
  required: ["needsCorrection", "reason", "corrections"],
} as const;

export const Route = createFileRoute("/api/ai/visual-qa")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { prompt?: string; commandSummary?: string; image?: string } = {};

        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON request." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const image = typeof body.image === "string" ? body.image : "";
        if (!image.startsWith("data:image/")) {
          return new Response(JSON.stringify({ error: "A viewport image is required." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const apiKey = process.env["OPENAI_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env["OPENAI_VISION_MODEL"] ?? "gpt-5.6",
            instructions: VISION_SYSTEM_PROMPT,
            input: [{
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: [
                    `User request: ${String(body.prompt ?? "").slice(0, 4000)}`,
                    `Executed command summary: ${String(body.commandSummary ?? "").slice(0, 4000)}`,
                  ].join("\n"),
                },
                {
                  type: "input_image",
                  image_url: image,
                },
              ],
            }],
            text: {
              format: {
                type: "json_schema",
                name: "visual_qa_result",
                description: "Strict visual QA verdict and optional scene corrections.",
                schema: QA_SCHEMA,
                strict: true,
              },
            },
            store: false,
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: detail.slice(0, 500) || response.statusText }),
            {
              status: response.status || 502,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const payload = (await response.json()) as { output_text?: string };
        if (!payload.output_text) {
          return new Response(JSON.stringify({ error: "Vision model returned no QA result." }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(payload.output_text, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
