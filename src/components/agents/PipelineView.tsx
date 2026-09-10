import { useGameConfigStore } from "../../store/useGameConfigStore";

export function PipelineView() {
  const stages = useGameConfigStore((s) => s.stages);
  const prompt = useGameConfigStore((s) => s.pipelinePrompt);
  const running = useGameConfigStore((s) => s.pipelineRunning);
  const reset = useGameConfigStore((s) => s.resetPipeline);

  if (!prompt) return null;

  return (
    <div className="glass-panel mb-3 rounded-2xl px-4 py-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Pipeline execution
          </p>
          <p className="truncate text-xs text-foreground/85">{prompt}</p>
        </div>
        <button
          onClick={reset}
          className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
        >
          {running ? "cancel" : "clear"}
        </button>
      </div>

      <ol className="space-y-2">
        {stages.map((stage) => (
          <li key={stage.id} className="flex gap-3 text-xs">
            <span className="mt-0.5 w-4 shrink-0 text-center">
              {stage.status === "running" ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
              ) : stage.status === "done" ? (
                <span className="text-primary">✓</span>
              ) : (
                <span className="text-muted-foreground/50">•</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={
                  stage.status === "idle"
                    ? "text-muted-foreground/60"
                    : stage.status === "running"
                      ? "animate-pulse text-primary"
                      : "text-foreground/85"
                }
              >
                {stage.label}
                {stage.status === "running" ? "…" : ""}
              </p>
              {stage.output.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {stage.output.map((line) => (
                    <li key={line} className="font-mono text-[11px] text-muted-foreground">
                      – {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
