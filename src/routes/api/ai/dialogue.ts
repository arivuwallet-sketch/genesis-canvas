import { createFileRoute } from "@tanstack/react-router";

const DIALOGUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    treeId: { type: "string" },
    npcId: { type: "string" },
    contextTags: { type: "array", items: { type: "string" }, maxItems: 32 },
    eventsReferenced: { type: "array", items: { type: "string" }, maxItems: 32 },
    lines: {
      type: "array",
      maxItems: 64,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          speaker: { type: "string" },
          text: { type: "string" },
          condition: {
            type: "object",
            additionalProperties: false,
            properties: {
              key: { type: "string" },
              value: { type: "string" },
            },
            required: ["key", "value"],
          },
        },
        required: ["speaker", "text"],
      },
    },
  },
  required: ["treeId", "npcId", "contextTags", "eventsReferenced", "lines"],
};

export const Route = createFileRoute("/api/ai/dialogue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "Missing LOVABLE_API_KEY" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const npcId = typeof body.npcId === "string" ? body.npcId.slice(0, 64) : "";
        const treeId = typeof body.treeId === "string" ? body.treeId.slice(0, 64) : "";
        const context = typeof body.context === "string" ? body.context.slice(0, 2000) : "";

        if (!npcId || !treeId || !context) {
          return new Response(
            JSON.stringify({ error: "npcId, treeId and context are required." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const prompt = [
          "Generate a concise in-world dialogue tree.",
          "Reference only facts/events present in the supplied world and quest context.",
          "Do not invent completed actions, characters, or lore facts.",
          "The tree must be safe to inject into a live NPC runtime.",
          "NPC: " + npcId,
          "Tree: " + treeId,
          "Current context: " + context,
          "World: " + JSON.stringify(body.world ?? {}),
          "Recent quests: " + JSON.stringify(body.recentQuests ?? []),
        ].join("\n");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            input: prompt,
            instructions: "Return only JSON matching the supplied schema.",
            text: {
              format: {
                type: "json_schema",
                name: "genesis_dialogue_tree",
                schema: DIALOGUE_SCHEMA,
                strict: true,
              },
            },
            store: false,
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: detail || upstream.statusText }),
            {
              status: upstream.status || 502,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const payload = (await upstream.json()) as {
          output_text?: string;
          output?: Array<{ content?: Array<{ text?: string }> }>;
        };

        const raw =
          payload.output_text ??
          payload.output?.flatMap((item) => item.content ?? [])
            .map((item) => item.text ?? "")
            .join("") ??
          "";

        if (!raw) {
          return new Response(
            JSON.stringify({ error: "Dialogue model returned no structured text." }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          return new Response(JSON.stringify(JSON.parse(raw)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(
            JSON.stringify({ error: "Dialogue model returned invalid JSON." }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
