import { useGameConfigStore } from "../store/useGameConfigStore";

export function CharacterBehaviorPanel() {
  const open = useGameConfigStore((s) => s.characterPanelOpen);
  const setOpen = useGameConfigStore((s) => s.setCharacterPanelOpen);
  const characters = useGameConfigStore((s) => s.characters);
  const updateCharacter = useGameConfigStore((s) => s.updateCharacter);
  const removeCharacter = useGameConfigStore((s) => s.removeCharacter);

  if (!open || characters.length === 0) return null;

  return (
    <aside className="glass-panel pointer-events-auto absolute left-[18rem] top-20 max-h-[65vh] w-72 overflow-y-auto rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Character behavior
        </p>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          hide
        </button>
      </div>

      <div className="space-y-4">
        {characters.map((c) => (
          <div key={c.id} className="rounded-xl border border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <input
                value={c.name}
                onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-xs text-primary focus:outline-none"
              />
              <button
                onClick={() => removeCharacter(c.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${c.name}`}
              >
                ×
              </button>
            </div>

            <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Role
              <select
                value={c.role}
                onChange={(e) =>
                  updateCharacter(c.id, { role: e.target.value as "Player" | "NPC" })
                }
                className="mt-1 w-full rounded-md bg-secondary/60 px-2 py-1 text-xs normal-case tracking-normal text-foreground focus:outline-none"
              >
                <option value="Player">Player</option>
                <option value="NPC">NPC</option>
              </select>
            </label>

            <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Fighting style
              <input
                value={c.fightingStyle}
                onChange={(e) => updateCharacter(c.id, { fightingStyle: e.target.value })}
                className="mt-1 w-full rounded-md bg-secondary/60 px-2 py-1 text-xs normal-case tracking-normal text-foreground focus:outline-none"
              />
            </label>

            <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Movement speed · {c.movementSpeed.toFixed(1)}
              <input
                type="range"
                min={0}
                max={60}
                step={0.5}
                value={c.movementSpeed}
                onChange={(e) =>
                  updateCharacter(c.id, { movementSpeed: Number(e.target.value) })
                }
                className="mt-1 w-full accent-primary"
              />
            </label>

            <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Aggression · {Math.round(c.aggression * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={c.aggression}
                onChange={(e) => updateCharacter(c.id, { aggression: Number(e.target.value) })}
                className="mt-1 w-full accent-primary"
              />
            </label>

            <label className="mb-2 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Patrol path
              <input
                value={c.patrolPath}
                onChange={(e) => updateCharacter(c.id, { patrolPath: e.target.value })}
                className="mt-1 w-full rounded-md bg-secondary/60 px-2 py-1 text-xs normal-case tracking-normal text-foreground focus:outline-none"
              />
            </label>

            <label className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Dialogue tree
              <textarea
                value={c.dialogueTree.join("\n")}
                onChange={(e) =>
                  updateCharacter(c.id, {
                    dialogueTree: e.target.value.split("\n").filter(Boolean),
                  })
                }
                rows={3}
                className="mt-1 w-full resize-none rounded-md bg-secondary/60 px-2 py-1 text-xs normal-case tracking-normal text-foreground focus:outline-none"
              />
            </label>
          </div>
        ))}
      </div>
    </aside>
  );
}
