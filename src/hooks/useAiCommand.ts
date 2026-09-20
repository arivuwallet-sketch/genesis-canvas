import { useCallback, useRef } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { startAgentActivitySimulation } from "../store/useAgentActivityStore";
import { useGraphicsStore } from "../store/useGraphicsStore";
import { matchCatalog } from "../data/modelCatalog";
import { applyAiResponse, applyCommand, extractAssistantReply } from "../utils/CommandParser";

/** Instant local shortcuts so obvious commands never wait on the network. */
function localShortcut(prompt: string): string | null {
  const p = prompt.toLowerCase().trim();

  if (/^(clear|reset)\b/.test(p)) {
    applyCommand({ action: "clear" });
    return "World cleared.";
  }

  if (/\b(carve|cut|drill|punch)\b/.test(p) && /\b(hole|opening|window)\b/.test(p)) {
    const radius = Number(/([0-9]*\.?[0-9]+)\s*m?\b/.exec(p)?.[1] ?? 0.35);
    return applyCommand({ action: "carve", radius: Number.isFinite(radius) ? radius : 0.35 }).message;
  }

  // Obvious requests are built immediately from the hosted GLB library.
  // This guarantees direct prompts such as "create a real car" work even
  // while the Master Prompt tab is selected.
  if (/\b(create|build|make|spawn|add|generate|place)\b/.test(p)) {
    const entry = matchCatalog(p);
    if (entry) {
      const countMatch = p.match(/\b(\d{1,2})\b/);
      const count = countMatch
        ? Math.min(12, Math.max(1, Number(countMatch[1])))
        : /\b(some|several|few|multiple|a few)\b/.test(p)
          ? 3
          : 1;

      if (/\b(ultra|photoreal|realistic|real)\b/.test(p)) {
        const graphics = useGraphicsStore.getState();
        graphics.set("textureQuality", "ultra");
        graphics.set("shadowQuality", "ultra");
        graphics.set("upscaling", "native");
      }

      const result = applyCommand({
        action: "spawn",
        type: "model",
        modelUrl: entry.modelUrl,
        name: entry.name,
        position: [0, entry.category === "vehicle" ? 1.1 : 1.2, 0],
        count,
        physics: {
          type:
            entry.category === "nature" ||
            entry.category === "building" ||
            entry.category === "prop"
              ? "fixed"
              : "dynamic",
        },
      });

      return result.ok
        ? `Built ${count > 1 ? `${count} ` : ""}${entry.name} from the real local 3D asset library.`
        : result.message;
    }
  }

  return null;
}

export function useAiCommand() {
  const abortRef = useRef<AbortController | null>(null);

  return useCallback(async () => {
    const store = useEditorStore.getState();
    const prompt = store.chatInput.trim();
    if (!prompt || store.aiThinking) return;

    store.setChatInput("");
    store.pushLog(prompt, "user");
    startAgentActivitySimulation(prompt);

    const shortcut = localShortcut(prompt);
    if (shortcut) {
      store.pushLog(shortcut, "system");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    store.setAiThinking(true);
    store.setStreamText("");

    const conversation = store.log
      .slice(-12)
      .map((entry) => `${entry.kind}: ${entry.text.slice(0, 500)}`)
      .join("\n");

    const world = store.spawnedObjects
      .slice(-12)
      .map(
        (o) =>
          `${o.id}:${o.name} [${o.kind}] @[${o.position.map((n) => n.toFixed(1)).join(",")}] scale=[${o.scale.map((n) => n.toFixed(1)).join(",")}]`,
      )
      .join("\n");

    const context = `Recent conversation:\n${conversation || "(none)"}\n\nCurrent world:\n${world || "(empty)"}`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          res.status === 402
            ? "AI credits exhausted — add credits in Lovable to continue."
            : res.status === 429
              ? "Rate limited — wait a moment and try again."
              : `AI request failed (${res.status}). ${detail.slice(0, 160)}`,
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let errored: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          let evt: { type?: string; text?: string };
          try {
            evt = JSON.parse(raw) as typeof evt;
          } catch {
            continue;
          }
          if (evt.type === "delta" && evt.text) {
            full += evt.text;
            useEditorStore.getState().appendStreamText(evt.text);
          } else if (evt.type === "done" && evt.text && !full) {
            full = evt.text;
            useEditorStore.getState().setStreamText(evt.text);
          } else if (evt.type === "error") {
            errored = evt.text ?? "Unknown AI error";
          }
        }
      }

      if (errored) throw new Error(errored);

      const result = applyAiResponse(full);
      const assistantReply =
        extractAssistantReply(full) ??
        (result.ok ? result.message : "I couldn't complete that request.");
      const s = useEditorStore.getState();
      s.pushLog(assistantReply, "ai");
      if (result.ok && result.message !== assistantReply) {
        const actionDetails = result.message.replace(assistantReply, "").trim();
        if (actionDetails) s.pushLog(actionDetails, "system");
      } else if (!result.ok) {
        s.pushLog(result.message, "error");
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      useEditorStore.getState().pushLog((error as Error).message, "error");
    } finally {
      const s = useEditorStore.getState();
      s.setAiThinking(false);
      s.setStreamText("");
    }
  }, []);
}
