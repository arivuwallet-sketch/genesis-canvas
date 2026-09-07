import { useEffect } from "react";
import { useEditorStore } from "../store/useEditorStore";

export function OverlayUI() {
  const chatInput = useEditorStore((s) => s.chatInput);
  const setChatInput = useEditorStore((s) => s.setChatInput);
  const submitPrompt = useEditorStore((s) => s.submitPrompt);
  const showPerf = useEditorStore((s) => s.showPerf);
  const togglePerf = useEditorStore((s) => s.togglePerf);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      if (e.key.toLowerCase() === "p") togglePerf();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePerf]);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* Top bar */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4">
        <div className="glass-panel flex items-center gap-3 rounded-full px-4 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/80">
            Omnipotent Engine
          </span>
        </div>
        <button
          onClick={togglePerf}
          className="glass-panel rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
        >
          Perf {showPerf ? "on" : "off"} · P
        </button>
      </header>

      {/* Bottom prompt bar */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center px-4 pb-7">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPrompt();
          }}
          className="glass-panel flex w-full max-w-2xl items-center gap-3 rounded-2xl px-4 py-3"
        >
          <span className="font-mono text-xs text-primary">›</span>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Describe what to create in the world…"
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
  );
}
