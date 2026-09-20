import { useEffect, useMemo } from "react";
import { useGameplayStore } from "../../store/useGameplayStore";

export interface GameplayHudProps {
  playerId?: string;
  showMiniMap?: boolean;
}

export function GameplayHud({ playerId = "player_1", showMiniMap = true }: GameplayHudProps) {
  const player = useGameplayStore((state) => state.players[playerId]);
  const ensurePlayer = useGameplayStore((state) => state.ensurePlayer);
  const dialogue = useGameplayStore((state) => state.activeDialogue);

  useEffect(() => {
    ensurePlayer(playerId);
  }, [ensurePlayer, playerId]);

  const healthRatio = useMemo(
    () => (player ? Math.max(0, Math.min(1, player.health / Math.max(1, player.maxHealth))) : 0),
    [player],
  );

  if (!player) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div className="absolute bottom-6 left-6 w-64 rounded-xl border border-white/10 bg-black/45 p-3 shadow-xl backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between text-xs text-white/75">
          <span>Health</span>
          <span>{Math.ceil(player.health)} / {Math.ceil(player.maxHealth)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-150" style={{ width: `${healthRatio * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/65">
          <span>STA {Math.ceil(player.stamina)}</span>
          <span>MP {Math.ceil(player.mana)}</span>
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg text-white/70">
        +
      </div>

      {showMiniMap && (
        <div className="absolute right-5 top-5 h-36 w-36 rounded-full border border-white/10 bg-black/35 shadow-lg backdrop-blur-md">
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      )}

      {dialogue && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-white/10 bg-black/70 p-4 text-white shadow-2xl backdrop-blur-md">
          <p className="text-xs uppercase tracking-widest text-white/45">{dialogue.npcId}</p>
          <p className="mt-1 text-sm">Dialogue tree: {dialogue.treeId}</p>
        </div>
      )}
    </div>
  );
}
