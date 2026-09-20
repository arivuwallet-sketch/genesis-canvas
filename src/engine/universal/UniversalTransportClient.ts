import {
  decodeTransportFrame,
  encodeStateDelta,
  type UniversalEntityState,
} from "./UniversalTransport";

export interface UniversalTransportOptions {
  url: string;
  reconnectMs?: number;
  binaryMode?: boolean;
  onFrame?: (frame: unknown) => void;
  onStatus?: (status: "connecting" | "open" | "closed" | "error") => void;
}

export class UniversalTransportClient {
  private readonly url: string;
  private readonly reconnectMs: number;
  private readonly binaryMode: boolean;
  private readonly onFrame?: (frame: unknown) => void;
  private readonly onStatus?: UniversalTransportOptions["onStatus"];
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private revision = 0;

  constructor(options: UniversalTransportOptions) {
    this.url = options.url;
    this.reconnectMs = Math.max(250, options.reconnectMs ?? 1200);
    this.binaryMode = options.binaryMode ?? true;
    this.onFrame = options.onFrame;
    this.onStatus = options.onStatus;
  }

  connect() {
    if (this.disposed) return;
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.onStatus?.("connecting");
    const socket = new WebSocket(this.url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.onopen = () => this.onStatus?.("open");

    socket.onmessage = (event) => {
      try {
        const data =
          event.data instanceof ArrayBuffer
            ? decodeTransportFrame(event.data)
            : JSON.parse(String(event.data));
        this.onFrame?.(data);
      } catch (error) {
        console.warn("[UniversalTransport] Failed to decode frame.", error);
      }
    };

    socket.onerror = () => this.onStatus?.("error");

    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.onStatus?.("closed");
      this.scheduleReconnect();
    };
  }

  sendStateDelta(
    entities: UniversalEntityState[],
    removedEntityIds: string[],
  ) {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    this.revision += 1;
    if (this.binaryMode) {
      socket.send(
        encodeStateDelta(this.revision, entities, removedEntityIds),
      );
    } else {
      socket.send(
        JSON.stringify({
          protocol_version: 1,
          frame_type: "state_delta",
          revision: this.revision,
          entities,
          removedEntityIds,
        }),
      );
    }

    return true;
  }

  dispose() {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close(1000, "disposed");
    this.socket = null;
  }

  private scheduleReconnect() {
    if (this.disposed || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectMs);
  }
}
