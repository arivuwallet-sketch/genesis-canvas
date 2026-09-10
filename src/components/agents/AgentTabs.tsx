import { AGENT_TABS, useGameConfigStore } from "../../store/useGameConfigStore";

export function AgentTabs() {
  const activeTab = useGameConfigStore((s) => s.activeTab);
  const setActiveTab = useGameConfigStore((s) => s.setActiveTab);

  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {AGENT_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`glass-panel rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
            activeTab === tab.id
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Read-only planner readouts for the non-master agent tabs. */
export function AgentPanel() {
  const activeTab = useGameConfigStore((s) => s.activeTab);
  const stages = useGameConfigStore((s) => s.stages);
  const primaryGenre = useGameConfigStore((s) => s.primaryGenre);
  const subGenre = useGameConfigStore((s) => s.subGenre);

  if (activeTab === "master") return null;

  const stage = stages.find((s) => s.id === activeTab);
  const title =
    activeTab === "story"
      ? "Story & scene plan"
      : activeTab === "mechanics"
        ? "Mechanics & logic plan"
        : "Asset generation queue";

  return (
    <div className="glass-panel mb-3 rounded-2xl px-4 py-3 text-xs">
      <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {title} · {primaryGenre} / {subGenre}
      </p>
      {stage && stage.output.length > 0 ? (
        <ul className="space-y-1">
          {stage.output.map((line) => (
            <li key={line} className="font-mono text-[11px] text-foreground/80">
              – {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          No plan yet. Run a master prompt to populate this agent.
        </p>
      )}
    </div>
  );
}
