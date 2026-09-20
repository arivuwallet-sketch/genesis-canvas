import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseUnrealCommandBatch,
  type UnrealCommandBatch,
} from "../../lib/unrealCommandSchema";

export interface UE5GameBuilderProps {
  wsUrl?: string;
  className?: string;
}

export const UE5GameBuilder = ({
  wsUrl = import.meta.env.VITE_UNREAL_WS_URL || "ws://localhost:3002",
  className = "",
}: UE5GameBuilderProps) => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const [prompt, setPrompt] = useState("");
  const [connectionState, setConnectionState] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const [status, setStatus] = useState("Connecting to Unreal Engine…");
  const [lastCommands, setLastCommands] = useState<UnrealCommandBatch | null>(null);
  const [lastEvent, setLastEvent] = useState<unknown>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    clearReconnectTimer();

    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState("connecting");
    setStatus(`Connecting to ${wsUrl}…`);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionState("open");
      setStatus("Connected to Unreal Engine.");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as unknown;
        setLastEvent(payload);

        if (
          payload &&
          typeof payload === "object" &&
          "type" in payload &&
          (payload as { type?: string }).type === "hello"
        ) {
          setStatus("Unreal command receiver is ready.");
          return;
        }

        if (
          payload &&
          typeof payload === "object" &&
          "type" in payload &&
          (payload as { type?: string }).type === "ue_command_error"
        ) {
          setStatus(
            "UE5 error: " +
              String((payload as { message?: unknown }).message ?? "Unknown UE5 error."),
          );
          return;
        }

        if (
          payload &&
          typeof payload === "object" &&
          "type" in payload &&
          (payload as { type?: string }).type === "ue_command_completed"
        ) {
          setStatus(
            "UE5: " +
              String(
                (payload as { message?: unknown }).message ?? "Command completed successfully.",
              ),
          );
        }
      } catch {
        setLastEvent(event.data);
        setStatus("Received a non-JSON message from Unreal.");
      }
    };

    socket.onerror = () => {
      setConnectionState("error");
      setStatus("Unreal WebSocket connection error.");
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      setConnectionState("closed");

      if (shouldReconnectRef.current) {
        setStatus("Unreal disconnected. Reconnecting…");
        reconnectTimerRef.current = setTimeout(connect, 1200);
      }
    };
  }, [clearReconnectTimer, wsUrl]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();

      const socket = socketRef.current;
      socketRef.current = null;

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "React component unmounted.");
      }
    };
  }, [clearReconnectTimer, connect]);

  const runPrompt = async () => {
    const value = prompt.trim();
    if (!value) return;

    setStatus("Generating Unreal commands…");

    try {
      const token = globalThis.localStorage?.getItem("token");
      const response = await fetch("/api/llm/ue5-commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: value }),
      });

      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "error" in payload
            ? String((payload as { error: unknown }).error)
            : `UE5 LLM request failed (${response.status}).`,
        );
      }

      const batch = parseUnrealCommandBatch(payload);
      setLastCommands(batch);

      if (batch.commands.length === 0) {
        setStatus("LLM returned no Unreal runtime commands.");
        return;
      }

      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("Unreal WebSocket is not connected.");
      }

      socket.send(JSON.stringify(batch));
      setStatus(
        `Sent ${batch.commands.length} Unreal command${batch.commands.length === 1 ? "" : "s"}.`,
      );
      setPrompt("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to run the UE5 pipeline.");
    }
  };

  const stateLabel =
    connectionState === "open"
      ? "Live"
      : connectionState === "connecting"
        ? "Connecting"
        : connectionState === "error"
          ? "Error"
          : "Offline";

  return (
    <section
      className={
        `mx-auto grid min-h-[680px] max-w-[1500px] overflow-hidden rounded-2xl border border-border/60 bg-slate-950/70 shadow-2xl backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_390px] ${className}`
      }
    >
      <div className="relative min-h-[520px] bg-black">
        <div className="absolute left-4 top-4 z-10 rounded-full border border-primary/20 bg-black/50 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-foreground/80 backdrop-blur">
          UE5 WebSocket · {stateLabel}
        </div>
        <div className="grid h-full min-h-[520px] place-items-center p-8 text-center text-sm text-muted-foreground">
          <div>
            <p className="text-base font-semibold text-foreground">Unreal Engine 5 Runtime</p>
            <p className="mt-1 max-w-md">
              This panel controls the running UE5 instance through the AI command socket.
              The Unreal viewport stays external to the React renderer.
            </p>
            <code className="mt-4 block rounded-lg border border-border/40 bg-white/5 px-3 py-2 text-xs">
              {wsUrl}
            </code>
          </div>
        </div>
      </div>

      <aside className="flex flex-col border-t border-border/60 bg-background/95 p-4 lg:border-l lg:border-t-0">
        <div>
          <p className="text-sm font-semibold">AI Unreal Builder</p>
          <p className="text-xs text-muted-foreground">
            React → LLM → JSON → UE5 WebSocket
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              void runPrompt();
            }
          }}
          placeholder="Spawn a highly detailed sports car and make it night time…"
          className="mt-4 min-h-32 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />

        <button
          type="button"
          onClick={() => void runPrompt()}
          disabled={!prompt.trim() || connectionState !== "open"}
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate & Send to UE5
        </button>

        <button
          type="button"
          onClick={connect}
          disabled={connectionState === "open" || connectionState === "connecting"}
          className="mt-2 rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          Reconnect UE5
        </button>

        <div className="mt-4 rounded-xl border border-border/60 bg-black/20 p-3 text-xs text-muted-foreground">
          {status}
        </div>

        {lastCommands && (
          <pre className="mt-4 max-h-56 overflow-auto rounded-xl border border-border/60 bg-black/30 p-3 text-[10px] leading-5 text-foreground/80">
            {JSON.stringify(lastCommands, null, 2)}
          </pre>
        )}

        {lastEvent !== null && (
          <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-border/60 bg-black/20 p-3 text-[10px] leading-5 text-foreground/70">
            {JSON.stringify(lastEvent, null, 2)}
          </pre>
        )}
      </aside>
    </section>
  );
};
