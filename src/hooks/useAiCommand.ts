import { useCallback, useRef } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { applyAiResponse, applyCommand } from "../utils/CommandParser";

/** Instant local shortcuts so obvious commands never wait on the network. */
function localShortcut(prompt: string): string | null {
  const p = prompt.toLowerCase().trim();
  if (/^(clear|reset)\b/.test(p)) {
    applyCommand({ action: "clear" });
    return "World cleared.";
  }
  // "carve hole in wall" / "carve a 0.5 hole" — instant CSG on the selection.
  if (/\b(carve|cut|drill|punch)\b/.test(p) && /\b(hole|opening|window)\b/.test(p)) {
    const radius = Number(/([0-9]*\.?[0-9]+)\s*m?\b/.exec(p)?.[1] ?? 0.35);
    return applyCommand({ action: "carve", radius: Number.isFinite(radius) ? radius : 0.35 })
      .message;
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

    const context = store.spawnedObjects
      .slice(-8)
      .map((o) => `${o.id}:${o.name}@[${o.position.map((n) => n.toFixed(1)).join(",")}]`)
      .join("; ");

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
      const s = useEditorStore.getState();
      s.pushLog(full.trim().slice(0, 300) || "(empty response)", "ai");
      s.pushLog(result.message, result.ok ? "system" : "error");
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
