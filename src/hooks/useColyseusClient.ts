import { useCallback, useEffect, useState } from "react";
import { useSceneStore, type NetworkEntity } from "../store/useSceneStore";

export type MultiplayerClientStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "simulated";

export interface PlayerInputData {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  sprint: boolean;
  analogX: number;
  analogY: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
}

export interface MultiplayerClientState {
  status: MultiplayerClientStatus;
  roomId: string | null;
  localPlayerId: string;
  players: RoomPlayer[];
}

type Listener = () => void;

const MULTIPLAYER_URL =
  (import.meta.env["VITE_MULTIPLAYER_URL"] as string | undefined) ??
  (import.meta.env["VITE_COLYSEUS_URL"] as string | undefined);

const state: MultiplayerClientState = {
  status: "disconnected",
  roomId: null,
  localPlayerId: "local",
  players: [],
};

const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let simulationTimer: ReturnType<typeof setInterval> | null = null;
let pendingRole: "host" | "join" = "join";
let simulatedAngle = 0;

function notify() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<MultiplayerClientState>) {
  Object.assign(state, patch);
  notify();
}

function addOrUpdatePlayer(player: RoomPlayer) {
  const next = state.players.filter((item) => item.id !== player.id);
  next.push(player);
  setState({ players: next });
}

function removePlayer(id: string) {
  setState({ players: state.players.filter((item) => item.id !== id) });
  useSceneStore.getState().removeNetworkEntity(id);
}

function upsertNetworkEntity(raw: Partial<NetworkEntity> & { id: string }) {
  const position = raw.position ?? [0, 1, 0];
  useSceneStore.getState().upsertNetworkEntity({
    id: raw.id,
    name: raw.name ?? "Network Entity",
    type: raw.type ?? "object",
    position: [
      Number(position[0]) || 0,
      Number(position[1]) || 0,
      Number(position[2]) || 0,
    ],
    rotationY: Number(raw.rotationY ?? 0) || 0,
    color: raw.color ?? "#6ad1f3",
    updatedAt: Date.now(),
  });
}

function applyServerPayload(message: unknown) {
  if (!message || typeof message !== "object") return;
  const packet = message as Record<string, unknown>;
  const type = String(packet["type"] ?? "");
  const data =
    packet["data"] && typeof packet["data"] === "object"
      ? (packet["data"] as Record<string, unknown>)
      : packet;

  if (type === "connected" || type === "room_joined") {
    const localId = String(data["localPlayerId"] ?? data["sessionId"] ?? state.localPlayerId);
    setState({
      localPlayerId: localId,
      status: "connected",
      roomId: String(data["roomId"] ?? state.roomId ?? ""),
    });
  }

  if (type === "snapshot" || type === "room_state" || type === "tick") {
    const players = Array.isArray(data["players"]) ? data["players"] : [];
    const entities = Array.isArray(data["entities"]) ? data["entities"] : [];

    if (players.length > 0) {
      setState({
        players: players.map((player) => {
          const value = player as Record<string, unknown>;
          return {
            id: String(value["id"] ?? value["sessionId"] ?? ""),
            name: String(value["name"] ?? "Player"),
            color: String(value["color"] ?? "#6ad1f3"),
          };
        }).filter((player) => player.id),
      });
    }

    for (const entity of entities) {
      if (!entity || typeof entity !== "object") continue;
      const value = entity as Record<string, unknown>;
      const position = Array.isArray(value["position"])
        ? (value["position"] as [number, number, number])
        : [0, 1, 0];
      upsertNetworkEntity({
        id: String(value["id"] ?? ""),
        name: String(value["name"] ?? "Network Entity"),
        type:
          value["type"] === "boss"
            ? "boss"
            : value["type"] === "npc"
              ? "npc"
              : value["type"] === "player"
                ? "player"
                : "object",
        position,
        rotationY: Number(value["rotationY"] ?? value["yaw"] ?? 0),
        color: String(value["color"] ?? "#6ad1f3"),
      });
    }
  }

  if (type === "player" || type === "player:transform" || type === "entity") {
    const id = String(data["id"] ?? "");
    if (!id || id === state.localPlayerId) return;
    const position = Array.isArray(data["position"])
      ? (data["position"] as [number, number, number])
      : [0, 1, 0];
    upsertNetworkEntity({
      id,
      name: String(data["name"] ?? "Player"),
      type: data["type"] === "npc" ? "npc" : "player",
      position,
      rotationY: Number(data["rotationY"] ?? data["yaw"] ?? 0),
      color: String(data["color"] ?? "#6ad1f3"),
    });
    addOrUpdatePlayer({
      id,
      name: String(data["name"] ?? "Player"),
      color: String(data["color"] ?? "#6ad1f3"),
    });
  }

  if (type === "player_join" || type === "player:join") {
    const id = String(data["id"] ?? data["sessionId"] ?? "");
    if (!id) return;
    addOrUpdatePlayer({
      id,
      name: String(data["name"] ?? "Player"),
      color: String(data["color"] ?? "#6ad1f3"),
    });
  }

  if (type === "player_leave" || type === "player:leave" || type === "entity_removed") {
    const id = String(data["id"] ?? "");
    if (id) removePlayer(id);
  }

  if (type === "boss_spawned" || type === "networked_boss_spawned") {
    const id = String(data["id"] ?? "network-boss");
    const position = Array.isArray(data["position"])
      ? (data["position"] as [number, number, number])
      : [0, 1, -6];
    upsertNetworkEntity({
      id,
      name: String(data["name"] ?? "Networked Boss"),
      type: "boss",
      position,
      rotationY: Number(data["rotationY"] ?? 0),
      color: String(data["color"] ?? "#ff5f4d"),
    });
  }
}

function sendPacket(packet: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  try {
    socket.send(JSON.stringify(packet));
    return true;
  } catch {
    return false;
  }
}

function clearTransport() {
  socket?.close();
  socket = null;
  if (simulationTimer) clearInterval(simulationTimer);
  simulationTimer = null;
}

function startSimulation(roomId: string) {
  clearTransport();
  const palette = ["#b6f36a", "#6ad1f3", "#f3a76a", "#d06af3"];
  setState({
    status: "simulated",
    roomId,
    localPlayerId: "local-sim",
    players: [
      { id: "local-sim", name: "You", color: palette[0] },
      { id: "sim-player-2", name: "Player 2", color: palette[1] },
    ],
  });

  simulatedAngle = 0;
  upsertNetworkEntity({
    id: "sim-player-2",
    name: "Player 2",
    type: "player",
    position: [4, 1, 0],
    rotationY: 0,
    color: palette[1],
  });

  simulationTimer = setInterval(() => {
    simulatedAngle += 0.045;
    upsertNetworkEntity({
      id: "sim-player-2",
      name: "Player 2",
      type: "player",
      position: [Math.cos(simulatedAngle) * 5, 1, Math.sin(simulatedAngle) * 5],
      rotationY: -simulatedAngle,
      color: palette[1],
    });
  }, 90);
}

export function subscribeMultiplayer(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMultiplayerClientState(): MultiplayerClientState {
  return {
    ...state,
    players: state.players.slice(),
  };
}

export async function connectToRoom(roomId: string, role: "host" | "join" = "join") {
  const room = roomId.trim();
  if (!room) return;

  pendingRole = role;
  clearTransport();
  useSceneStore.getState().clearNetworkEntities();

  if (!MULTIPLAYER_URL || typeof WebSocket === "undefined") {
    startSimulation(room);
    return;
  }

  setState({
    status: "connecting",
    roomId: room,
    players: [],
  });

  try {
    const url = new URL(MULTIPLAYER_URL);
    url.searchParams.set("roomId", room);
    socket = new WebSocket(url.toString());

    socket.addEventListener("open", () => {
      setState({ status: "connected" });
      sendPacket({
        type: pendingRole === "host" ? "host" : "join",
        roomId: room,
      });
    });

    socket.addEventListener("message", (event) => {
      try {
        applyServerPayload(JSON.parse(String(event.data)));
      } catch {
        /* Ignore malformed server packets; the session stays alive. */
      }
    });

    socket.addEventListener("close", () => {
      if (state.status === "connected" || state.status === "connecting") {
        setState({ status: "disconnected" });
      }
    });

    socket.addEventListener("error", () => {
      startSimulation(room);
    });
  } catch {
    startSimulation(room);
  }
}

export function sendPlayerInput(inputData: PlayerInputData) {
  return sendPacket({
    type: "input",
    roomId: state.roomId,
    input: inputData,
    timestamp: Date.now(),
  });
}

export function sendNetworkRpc(method: string, payload: Record<string, unknown> = {}) {
  const sent = sendPacket({
    type: "rpc",
    roomId: state.roomId,
    method,
    payload,
  });

  if (!sent && method === "spawnNetworkedBoss") {
    upsertNetworkEntity({
      id: "sim-network-boss",
      name: String(payload["name"] ?? "Networked Boss"),
      type: "boss",
      position: (payload["position"] as [number, number, number] | undefined) ?? [0, 1, -6],
      rotationY: 0,
      color: "#ff5f4d",
    });
  }

  return sent;
}

export function leaveRoom() {
  sendPacket({ type: "leave", roomId: state.roomId });
  clearTransport();
  useSceneStore.getState().clearNetworkEntities();
  setState({
    status: "disconnected",
    roomId: null,
    localPlayerId: "local",
    players: [],
  });
}

export function createRoomCode() {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function useColyseusClient() {
  const [, forceRender] = useState(0);

  useEffect(() => subscribeMultiplayer(() => forceRender((value) => value + 1)), []);

  const connect = useCallback((roomId: string) => connectToRoom(roomId), []);
  const host = useCallback((roomId: string) => connectToRoom(roomId, "host"), []);
  const sendInput = useCallback((inputData: PlayerInputData) => sendPlayerInput(inputData), []);
  const rpc = useCallback(
    (method: string, payload: Record<string, unknown> = {}) => sendNetworkRpc(method, payload),
    [],
  );
  const leave = useCallback(() => leaveRoom(), []);

  return {
    ...getMultiplayerClientState(),
    connectToRoom: connect,
    hostServer: host,
    sendPlayerInput: sendInput,
    sendNetworkRpc: rpc,
    leaveRoom: leave,
  };
}

export function requestNetworkedBoss(name = "Networked Boss", position: [number, number, number] = [0, 1, -6]) {
  return sendNetworkRpc("spawnNetworkedBoss", { name, position });
}
