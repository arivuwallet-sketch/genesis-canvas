import { createFileRoute } from "@tanstack/react-router";
import {
  UNITY_COMMAND_JSON_SCHEMA,
  UNITY_LLM_SYSTEM_PROMPT,
  buildUnityLlmUserPrompt,
  parseUnityCommandBatch,
  type UnityCommandBatch,
} from "../../../lib/unityCommandSchema";

type LlmProvider = "openai" | "anthropic";

const getProvider = (): LlmProvider =>
  process.env["LLM_PROVIDER"] === "anthropic" ? "anthropic" : "openai";

const getErrorResponse = (message: string, status = 500) =>
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
      model: process.env["OPENAI_MODEL"] ?? "gpt-5.6-luna",
      instructions: UNITY_LLM_SYSTEM_PROMPT,
      input: buildUnityLlmUserPrompt(prompt),
      text: {
        format: {
          type: "json_schema",
          name: "unity_command_batch",
          description: "Strict Unity runtime command batch.",
          schema: UNITY_COMMAND_JSON_SCHEMA,
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
    throw new Error("OpenAI returned no structured command output.");
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
      max_tokens: 4000,
      system: UNITY_LLM_SYSTEM_PROMPT,
      tools: [
        {
          name: "emit_unity_commands",
          description: "Emit the complete Unity runtime command batch for the user's request.",
          input_schema: UNITY_COMMAND_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "emit_unity_commands" },
      messages: [{ role: "user", content: buildUnityLlmUserPrompt(prompt) }],
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
    throw new Error("Anthropic returned no command tool output.");
  }

  return JSON.stringify(toolUse.input);
}

export const Route = createFileRoute("/api/llm/commands")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { prompt?: string } = {};

        try {
          body = (await request.json()) as typeof body;
        } catch {
          return getErrorResponse("Invalid JSON request.", 400);
        }

        const prompt = (body.prompt ?? "").toString().trim().slice(0, 8000);
        if (!prompt) {
          return getErrorResponse("Prompt is required.", 400);
        }

        try {
          const rawJson =
            getProvider() === "anthropic"
              ? await requestAnthropic(prompt)
              : await requestOpenAI(prompt);

          const batch = parseUnityCommandBatch(JSON.parse(rawJson)) as UnityCommandBatch;

          return new Response(JSON.stringify(batch), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("Unity command generation failed:", error);
          return getErrorResponse(
            error instanceof Error ? error.message : "Unity command generation failed.",
            502,
          );
        }
      },
    },
  },
});
