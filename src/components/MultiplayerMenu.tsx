import { useEffect, useState, type ReactNode } from "react";
import { Gamepad2, Globe2, Laptop2, Link2, Radio, Users, X } from "lucide-react";
import { useColyseusClient, createRoomCode } from "../hooks/useColyseusClient";
import { useEditorStore } from "../store/useEditorStore";
import { useGameConfigStore } from "../store/useGameConfigStore";
import type { MultiplayerMode } from "../data/genres";

const MODES: Array<{ value: MultiplayerMode; label: string; icon: ReactNode }> = [
  { value: "singleplayer", label: "Singleplayer", icon: <Laptop2 className="h-4 w-4" /> },
  { value: "split-screen", label: "Local Split-Screen", icon: <Gamepad2 className="h-4 w-4" /> },
  { value: "online", label: "Online Multiplayer", icon: <Globe2 className="h-4 w-4" /> },
  { value: "online-coop", label: "Online Co-Op", icon: <Users className="h-4 w-4" /> },
];

export function MultiplayerMenu() {
  const open = useGameConfigStore((s) => s.multiplayerMenuOpen);
  const setOpen = useGameConfigStore((s) => s.setMultiplayerMenuOpen);
  const mode = useGameConfigStore((s) => s.multiplayerMode);
  const setMode = useGameConfigStore((s) => s.setMultiplayerMode);
  const playerCount = useGameConfigStore((s) => s.localPlayerCount);
  const setPlayerCount = useGameConfigStore((s) => s.setLocalPlayerCount);
  const isPlaying = useGameConfigStore((s) => s.isPlaying);
  const setNetwork = useEditorStore((s) => s.setNetwork);
  const [roomCode, setRoomCode] = useState("");
  const client = useColyseusClient();

  if (!open || isPlaying) return null;

  const chooseMode = (next: MultiplayerMode) => {
    setMode(next);
    if (next === "singleplayer" || next === "split-screen") {
      client.leaveRoom();
    }
  };

  const host = () => {
    const code = createRoomCode();
    setRoomCode(code);
    client.hostServer(code);
  };

  const join = () => {
    const room = roomCode.trim();
    if (!room) return;
    client.connectToRoom(room);
  };

  useEffect(() => {
    setNetwork({
      status:
        client.status === "connected" || client.status === "simulated"
          ? client.status
          : client.status === "connecting"
            ? "connecting"
            : "offline",
      peers: Math.max(0, client.players.length - 1),
    });
  }, [client.status, client.players.length, setNetwork]);

  return (
    <aside className="pointer-events-auto absolute right-5 top-20 z-30 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-primary/15 bg-card/90 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Multiplayer</p>
          <p className="text-xs text-muted-foreground">Local and authoritative online sessions</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
          aria-label="Close multiplayer menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => chooseMode(item.value)}
            className={
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em] transition-colors " +
              (mode === item.value
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/25 hover:text-primary")
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {mode === "split-screen" && (
        <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Local players
            </span>
            <select
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value) as 2 | 3 | 4)}
              className="rounded-lg border border-border/60 bg-card px-2 py-1 text-xs text-primary outline-none"
            >
              <option value={2}>2-Player</option>
              <option value={3}>3-Player</option>
              <option value={4}>4-Player</option>
            </select>
          </div>
          <p className="text-[10px] leading-5 text-muted-foreground">
            Player 1 uses keyboard + mouse. Players 2–4 are mapped to connected USB/Bluetooth gamepads.
          </p>
        </div>
      )}

      {(mode === "online" || mode === "online-coop") && (
        <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
            <span className="text-muted-foreground">Room</span>
            <span className="flex items-center gap-1.5 text-primary">
              <Radio className="h-3 w-3" />
              {client.status}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={host}
              className="flex-1 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-primary hover:bg-primary/15"
            >
              Host Server
            </button>
            <button
              type="button"
              onClick={join}
              className="flex-1 rounded-lg border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary"
            >
              Join Server
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="IP address or room code"
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Users className="h-3 w-3" />
              Player list · {client.players.length}
            </div>
            <div className="space-y-1.5">
              {client.players.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  No players yet. With no backend configured, Genesis uses a simulated room.
                </p>
              ) : (
                client.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg bg-secondary/35 px-2.5 py-2 text-xs"
                  >
                    <span className="truncate text-foreground/85">{player.name}</span>
                    <span className="h-2 w-2 rounded-full" style={{ background: player.color }} />
                  </div>
                ))
              )}
            </div>
          </div>

          {client.roomId && (
            <button
              type="button"
              onClick={client.leaveRoom}
              className="w-full rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-destructive hover:bg-destructive/10"
            >
              Leave Room
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
