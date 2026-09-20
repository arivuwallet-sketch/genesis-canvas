import { createFileRoute } from "@tanstack/react-router";
import {
  buildUniversal3DDirectorUserPrompt,
  parseUniversal3DDirectorOutput,
  UNIVERSAL_3D_DIRECTOR_JSON_SCHEMA,
  UNIVERSAL_3D_DIRECTOR_SYSTEM_PROMPT,
  type Universal3DEntityPayload,
} from "../../../lib/universal3dDirector";

type LlmProvider = "openai" | "anthropic";

const getProvider = (): LlmProvider =>
  process.env["LLM_PROVIDER"] === "anthropic" ? "anthropic" : "openai";

const errorResponse = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function requestOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env["OPENAI_MODEL"] ?? "gpt-5.6",
      instructions: UNIVERSAL_3D_DIRECTOR_SYSTEM_PROMPT,
      input: buildUniversal3DDirectorUserPrompt(prompt),
      text: {
        format: {
          type: "json_schema",
          name: "universal_3d_entity_world_director",
          description: "Deterministic Universal 3D Entity & World Director payload.",
          schema: UNIVERSAL_3D_DIRECTOR_JSON_SCHEMA,
          strict: true,
        },
      },
      store: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) {
    throw new Error("OpenAI returned no Universal 3D Director output.");
  }

  return payload.output_text;
}

async function requestAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-6",
      max_tokens: 5000,
      system: UNIVERSAL_3D_DIRECTOR_SYSTEM_PROMPT,
      tools: [
        {
          name: "emit_universal_3d_director_payload",
          description: "Emit the complete Universal 3D Entity & World Director payload.",
          input_schema: UNIVERSAL_3D_DIRECTOR_JSON_SCHEMA,
        },
      ],
      tool_choice: {
        type: "tool",
        name: "emit_universal_3d_director_payload",
      },
      messages: [{ role: "user", content: buildUniversal3DDirectorUserPrompt(prompt) }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Anthropic request failed: ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; input?: unknown }>;
  };

  const toolUse = payload.content?.find(
    (item) => item.type === "tool_use" && item.input !== undefined,
  );

  if (!toolUse?.input) {
    throw new Error("Anthropic returned no Universal 3D Director tool output.");
  }

  return JSON.stringify(toolUse.input);
}

export const Route = createFileRoute("/api/ai/universal-director")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { prompt?: string } = {};

        try {
          body = (await request.json()) as typeof body;
        } catch {
          return errorResponse("Invalid JSON request.", 400);
        }

        const prompt = (body.prompt ?? "").toString().trim().slice(0, 12000);
        if (!prompt) {
          return errorResponse("Prompt is required.", 400);
        }

        try {
          const rawJson =
            getProvider() === "anthropic"
              ? await requestAnthropic(prompt)
              : await requestOpenAI(prompt);

          const payload = parseUniversal3DDirectorOutput(
            JSON.parse(rawJson),
          ) as Universal3DEntityPayload;

          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("Universal 3D Director generation failed:", error);
          return errorResponse(
            error instanceof Error
              ? error.message
              : "Universal 3D Director generation failed.",
            502,
          );
        }
      },
    },
  },
});
