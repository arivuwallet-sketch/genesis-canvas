import {
  Brain,
  Braces,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Code2,
  Eraser,
  Expand,
  Palette,
  Pause,
  Play,
  Sigma,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AgentActivityLog,
  type AgentActivityStatus,
  useAgentActivityStore,
} from "../../store/useAgentActivityStore";

const AGENT_META: Record<
  string,
  { label: string; icon: typeof Brain; iconClass: string; badgeClass: string }
> = {
  "Orchestrator Agent": {
    label: "Orchestrator",
    icon: Brain,
    iconClass: "text-cyan-300",
    badgeClass: "border-cyan-300/25 bg-cyan-300/10",
  },
  "Narrative Agent": {
    label: "Narrative",
    icon: Sparkles,
    iconClass: "text-violet-300",
    badgeClass: "border-violet-300/25 bg-violet-300/10",
  },
  "Terrain & Asset Agent": {
    label: "Terrain & Asset",
    icon: Palette,
    iconClass: "text-emerald-300",
    badgeClass: "border-emerald-300/25 bg-emerald-300/10",
  },
  "Physics & Logic Agent": {
    label: "Physics & Logic",
    icon: Sigma,
    iconClass: "text-amber-300",
    badgeClass: "border-amber-300/25 bg-amber-300/10",
  },
  "Code Executor": {
    label: "Code Executor",
    icon: TerminalSquare,
    iconClass: "text-pink-300",
    badgeClass: "border-pink-300/25 bg-pink-300/10",
  },
};

function metaFor(name: string) {
  return (
    AGENT_META[name] ?? {
      label: name.replace(/ Agent$/i, ""),
      icon: Code2,
      iconClass: "text-primary",
      badgeClass: "border-primary/25 bg-primary/10",
    }
  );
}

function statusIcon(status: AgentActivityStatus) {
  if (status === "completed") return <CircleCheck className="h-3 w-3 text-emerald-300" />;
  if (status === "error") return <CircleAlert className="h-3 w-3 text-red-300" />;
  return <Clock3 className="h-3 w-3 animate-pulse text-primary" />;
}

function isActive(status: AgentActivityStatus) {
  return status === "thinking" || status === "executing";
}

function timeLabel(value: string) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "--";
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function InspectorDrawer({ log, onClose }: { log: AgentActivityLog; onClose: () => void }) {
  return (
    <div className="mt-2 rounded-lg border border-primary/15 bg-black/20 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
          Raw Payload Inspector
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary"
        >
          Close
        </button>
      </div>
      <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-black/20 p-2 font-mono text-[9px] leading-relaxed text-foreground/75">
        {JSON.stringify(
          {
            id: log.id,
            agentName: log.agentName,
            status: log.status,
            message: log.message,
            timestamp: log.timestamp,
            progress: log.progress,
            payload: log.payload ?? null,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

export function AgentActivityFeed() {
  const logs = useAgentActivityStore((state) => state.logs);
  const activeAgentCount = useAgentActivityStore((state) => state.activeAgentCount);
  const collapsed = useAgentActivityStore((state) => state.collapsed);
  const toggleCollapse = useAgentActivityStore((state) => state.toggleCollapse);
  const clearLogs = useAgentActivityStore((state) => state.clearLogs);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const element = feedRef.current;
    if (!element || autoScrollPaused) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [logs.length, autoScrollPaused]);

  const visibleLogs = useMemo(() => logs.slice(-24), [logs]);
  const selected = visibleLogs.find((log) => log.id === selectedLogId) ?? null;

  const onScroll = () => {
    const element = feedRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const movedUp = element.scrollTop < lastScrollTop.current;
    if (movedUp && distanceFromBottom > 32) setAutoScrollPaused(true);
    if (distanceFromBottom < 12) setAutoScrollPaused(false);
    lastScrollTop.current = element.scrollTop;
  };

  const summary = logs.length === 0
    ? "Pipeline idle · waiting for a prompt"
    : activeAgentCount > 0
      ? activeAgentCount + " agent" + (activeAgentCount === 1 ? "" : "s") + " working"
      : "Pipeline complete · " + logs.length + " events";

  return (
    <section
      className={
        "pointer-events-auto w-full rounded-2xl border border-primary/15 bg-slate-950/75 shadow-[0_0_32px_rgba(126,227,74,0.08)] backdrop-blur-xl transition-all duration-300 " +
        (collapsed ? "overflow-hidden" : "")
      }
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex min-w-0 items-center gap-2 text-left"
          aria-label={collapsed ? "Expand activity feed" : "Collapse activity feed"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <span className="truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/85">
            Active AI Pipeline
          </span>
          <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-primary">
            <span className={"h-1.5 w-1.5 rounded-full " + (activeAgentCount > 0 ? "animate-pulse bg-primary" : "bg-muted-foreground")} />
            {activeAgentCount > 0 ? activeAgentCount + " Agents Active" : summary}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {!collapsed && autoScrollPaused && (
            <button
              type="button"
              onClick={() => {
                setAutoScrollPaused(false);
                requestAnimationFrame(() => {
                  feedRef.current?.scrollTo({ top: feedRef.current?.scrollHeight ?? 0, behavior: "smooth" });
                });
              }}
              className="flex items-center gap-1 rounded-md border border-primary/15 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-primary hover:bg-primary/5"
            >
              <Play className="h-2.5 w-2.5" />
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={clearLogs}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-primary"
            title="Clear logs"
            aria-label="Clear logs"
          >
            <Eraser className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-border/30">
          <div
            ref={feedRef}
            onScroll={onScroll}
            className="max-h-44 space-y-1.5 overflow-y-auto px-2.5 py-2"
          >
            {logs.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/30 bg-white/[0.015] px-3 py-4 text-[9px] text-muted-foreground">
                <Expand className="h-3.5 w-3.5 text-primary/60" />
                Send a prompt to watch the simulated agent pipeline execute.
              </div>
            ) : (
              visibleLogs.map((log) => {
                const meta = metaFor(log.agentName);
                const Icon = meta.icon;
                const active = isActive(log.status);

                return (
                  <div
                    key={log.id}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedLogId((value) => (value === log.id ? null : log.id))}
                      className="group flex w-full items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-primary/10 hover:bg-white/[0.025]"
                    >
                      <span className={"mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border " + meta.badgeClass}>
                        <Icon className={"h-3.5 w-3.5 " + meta.iconClass} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[9px] font-medium uppercase tracking-[0.12em] text-foreground/80">
                            {meta.label}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[8px] text-muted-foreground">
                            {statusIcon(log.status)}
                            {timeLabel(log.timestamp)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-foreground/70">
                          {log.message}
                        </span>
                        {active && (
                          <span className="mt-1.5 block">
                            {typeof log.progress === "number" ? (
                              <span className="block h-1 overflow-hidden rounded-full bg-white/5">
                                <span
                                  className="block h-full rounded-full bg-primary transition-[width] duration-500"
                                  style={{ width: Math.max(4, Math.min(100, log.progress)) + "%" }}
                                />
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.1em] text-primary/80">
                                <span className="animate-bounce">•</span>
                                <span className="animate-bounce [animation-delay:100ms]">•</span>
                                <span className="animate-bounce [animation-delay:200ms]">•</span>
                                <span>working</span>
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </button>

                    {selected?.id === log.id && (
                      <InspectorDrawer log={log} onClose={() => setSelectedLogId(null)} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {autoScrollPaused && (
            <div className="flex items-center justify-between border-t border-border/25 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.12em] text-amber-300/80">
                <Pause className="h-2.5 w-2.5" />
                Auto-scroll paused
              </span>
              <button
                type="button"
                onClick={() => {
                  setAutoScrollPaused(false);
                  requestAnimationFrame(() => {
                    feedRef.current?.scrollTo({ top: feedRef.current?.scrollHeight ?? 0, behavior: "smooth" });
                  });
                }}
                className="text-[8px] uppercase tracking-[0.12em] text-primary hover:text-foreground"
              >
                Jump to latest
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
