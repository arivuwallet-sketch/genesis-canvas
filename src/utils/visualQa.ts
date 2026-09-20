import { captureViewportBase64 } from "./captureViewportBase64";
import { applyCommand, type CommandResult } from "./CommandParser";

export interface VisualQaResult {
  needsCorrection: boolean;
  reason: string;
  corrections: unknown[];
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const isMajorPrompt = (prompt: string) =>
  /\b(build|construct|create|generate|spawn|make|assemble|place|design)\b/i.test(prompt) ||
  /\b(house|building|city|village|vehicle|car|character|boss|environment|scene|terrain|bridge|factory)\b/i.test(prompt);

export function shouldRunVisualQa(prompt: string, actionMessage = "") {
  return isMajorPrompt(prompt) || /spawned|built|updated|created/i.test(actionMessage);
}

export async function runVisualQaAfterMajorCommand(
  prompt: string,
  commandSummary: string,
): Promise<VisualQaResult | null> {
  if (!shouldRunVisualQa(prompt, commandSummary)) return null;

  // Give Rapier/rendering a chance to settle before sampling the frame.
  await delay(2000);

  const image = captureViewportBase64();
  if (!image) return null;

  try {
    const response = await fetch("/api/ai/visual-qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.slice(0, 4000),
        commandSummary: commandSummary.slice(0, 4000),
        image,
      }),
    });

    if (!response.ok) {
      console.warn("[VisualQA] Vision API returned", response.status);
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!payload || typeof payload !== "object") return null;

    const data = payload as Partial<VisualQaResult>;
    const corrections = Array.isArray(data.corrections) ? data.corrections : [];

    return {
      needsCorrection: data.needsCorrection === true,
      reason: typeof data.reason === "string" ? data.reason : "No visual QA reason supplied.",
      corrections,
    };
  } catch (error) {
    console.warn("[VisualQA] Background validation failed.", error);
    return null;
  }
}

export async function runVisualQaAndApplyCorrection(
  prompt: string,
  commandSummary: string,
): Promise<CommandResult | null> {
  const result = await runVisualQaAfterMajorCommand(prompt, commandSummary);
  if (!result?.needsCorrection || result.corrections.length === 0) {
    return result
      ? { ok: true, message: result.reason }
      : null;
  }

  return applyCommand(result.corrections);
}
