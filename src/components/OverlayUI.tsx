import { useEffect, useRef } from "react";
import { useEditorStore, type GraphicsQuality } from "../store/useEditorStore";
import { useNetworkSync } from "../hooks/useNetworkSync";
import { useAiCommand } from "../hooks/useAiCommand";
import { hudTunnel } from "./hud/Diagnostics";

const QUALITY: { value: GraphicsQuality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "ultra", label: "Ultra" },
];

function QualitySelect() {
  const quality = useEditorStore((s) => s.graphicsQuality);
  const setQuality = useEditorStore((s) => s.setGraphicsQuality);

  return (
    <label className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span>Graphics</span>
      <select
        value={quality}
        onChange={(e) => setQuality(e.target.value as GraphicsQuality)}
        className="cursor-pointer bg-transparent uppercase tracking-[0.18em] text-primary focus:outline-none"
      >
        {QUALITY.map((q) => (
          <option key={q.value} value={q.value} className="bg-card text-foreground">
            {q.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingBar() {
  const isLoading = useEditorStore((s) => s.isLoading);
  const progress = useEditorStore((s) => s.loadingProgress);
  if (!isLoading) return null;

  return (
    <div className="glass-panel absolute left-1/2 top-4 w-64 -translate-x-1/2 rounded-xl px-4 py-3">
      <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Loading assets</span>
        <span className="text-primary">{Math.round(progress)}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function EntityList() {
  const spawnedObjects = useEditorStore((s) => s.spawnedObjects);
  const removeObject = useEditorStore((s) => s.removeObject);
  if (spawnedObjects.length === 0) return null;

  return (
    <aside className="glass-panel absolute right-5 top-20 w-56 rounded-xl p-3">
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Entities · {spawnedObjects.length}
      </p>
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {spawnedObjects.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-foreground/85 hover:bg-secondary/60"
          >
            <span className="truncate">{o.name}</span>
            <button
              onClick={() => removeObject(o.id)}
              className="text-muted-foreground transition-colors hover:text-destructive"
              aria-label={`Remove ${o.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Transcript() {
  const log = useEditorStore((s) => s.log);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log.length]);

  if (log.length === 0) return null;

  return (
    <div className="glass-panel mb-3 max-h-44 w-full overflow-y-auto rounded-2xl px-4 py-3 text-xs">
      {log.map((entry) => (
        <p
          key={entry.id}
          className={
            entry.kind === "user"
              ? "py-0.5 text-foreground/90"
              : "py-0.5 text-primary/80"
          }
        >
          <span className="mr-2 font-mono text-muted-foreground">
            {entry.kind === "user" ? "›" : "·"}
          </span>
          {entry.text}
        </p>
      ))}
      <div ref={endRef} />
    </div>
  );
}

export function OverlayUI() {
  const chatInput = useEditorStore((s) => s.chatInput);
  const setChatInput = useEditorStore((s) => s.setChatInput);
  const submitPrompt = useAiCommand();
  const aiThinking = useEditorStore((s) => s.aiThinking);
  const streamText = useEditorStore((s) => s.streamText);
  const showPerf = useEditorStore((s) => s.showPerf);
  const togglePerf = useEditorStore((s) => s.togglePerf);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const toggleCameraMode = useEditorStore((s) => s.toggleCameraMode);
  const playerEnabled = useEditorStore((s) => s.playerEnabled);
  const setPlayerEnabled = useEditorStore((s) => s.setPlayerEnabled);

  // Socket lifecycle + listeners live entirely in this hook.
  useNetworkSync();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "p") togglePerf();
      if (key === "c") toggleCameraMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePerf, toggleCameraMode]);

  const pill =
    "glass-panel rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors";

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* Top bar */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-5 py-4">
        <div className="glass-panel flex items-center gap-3 rounded-full px-4 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/80">
            Omnipotent Engine
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => setPlayerEnabled(!playerEnabled)}
            className={`${pill} ${playerEnabled ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            {playerEnabled ? "Play mode" : "Orbit mode"}
          </button>
          <button
            onClick={toggleCameraMode}
            className={`${pill} text-muted-foreground hover:text-primary`}
          >
            {cameraMode === "first" ? "1st person" : "3rd person"} · C
          </button>
          <QualitySelect />
          <button
            onClick={togglePerf}
            className={`${pill} text-muted-foreground hover:text-primary`}
          >
            Perf {showPerf ? "on" : "off"} · P
          </button>
        </div>
      </header>

      <LoadingBar />
      <EntityList />
      <hudTunnel.Out />

      {playerEnabled && (
        <p className="absolute bottom-28 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Click the world to look · WASD move · Space jump · Esc release
        </p>
      )}

      {/* Bottom prompt bar */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center px-4 pb-7">
        <div className="w-full max-w-2xl">
          <Transcript />
          {aiThinking && (
            <div className="glass-panel mb-3 flex items-start gap-3 rounded-2xl px-4 py-3 text-xs text-primary/85">
              <span className="mt-0.5 flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
              </span>
              <span className="min-w-0 flex-1 truncate font-mono">
                {streamText.trim().slice(-160) || "Thinking…"}
              </span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitPrompt();
            }}
            className="glass-panel flex w-full items-center gap-3 rounded-2xl px-4 py-3"
          >
            <span className="font-mono text-xs text-primary">›</span>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder='Try "spawn robot" or "clear"…'
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-primary/35 bg-primary/12 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/22"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
