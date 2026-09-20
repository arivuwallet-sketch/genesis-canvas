import { useState } from "react";
import { GENRE_MATRIX, MULTIPLAYER_MODES } from "../../data/genres";
import { useGameConfigStore } from "../../store/useGameConfigStore";

export function GenreSelector() {
  const open = useGameConfigStore((s) => s.blueprintOpen);
  const setOpen = useGameConfigStore((s) => s.setBlueprintOpen);
  const primaryGenre = useGameConfigStore((s) => s.primaryGenre);
  const subGenre = useGameConfigStore((s) => s.subGenre);
  const multiplayerMode = useGameConfigStore((s) => s.multiplayerMode);
  const setPrimaryGenre = useGameConfigStore((s) => s.setPrimaryGenre);
  const setSubGenre = useGameConfigStore((s) => s.setSubGenre);
  const setMultiplayerMode = useGameConfigStore((s) => s.setMultiplayerMode);
  const [hovered, setHovered] = useState<string>(primaryGenre);

  const hoveredGroup =
    GENRE_MATRIX.find((g) => g.genre === hovered) ?? GENRE_MATRIX[0];

  return (
    <div className="relative mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="glass-panel flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left"
      >
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Game Blueprint Configuration
        </span>
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-primary">
          {primaryGenre} · {subGenre} · {multiplayerMode}
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="glass-panel absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-20 rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Genre matrix
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
              {GENRE_MATRIX.map((g) => (
                <li key={g.genre}>
                  <button
                    onMouseEnter={() => setHovered(g.genre)}
                    onClick={() => {
                      setPrimaryGenre(g.genre);
                      setHovered(g.genre);
                    }}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      primaryGenre === g.genre
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/80 hover:bg-secondary/60"
                    }`}
                  >
                    {g.genre}
                  </button>
                </li>
              ))}
            </ul>

            <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
              {(hoveredGroup?.subGenres ?? []).map((sub) => (
                <li key={sub}>
                  <button
                    onClick={() => {
                      if (hoveredGroup) setPrimaryGenre(hoveredGroup.genre);
                      setSubGenre(sub);
                    }}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      subGenre === sub
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/70 hover:bg-secondary/60"
                    }`}
                  >
                    {sub}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Mode
            </span>
            {MULTIPLAYER_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMultiplayerMode(m.value)}
                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  multiplayerMode === m.value
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
