/**
 * Network service layer.
 *
 * A thin abstraction over socket.io-client so the rest of the app never talks
 * to a socket directly. When no realtime server is configured
 * (VITE_SOCKET_URL), the client falls back to a local "simulated" transport so
 * the interpolation / HUD pipeline is fully exercisable offline.
 */

import type { Socket } from "socket.io-client";
import { useSceneStore } from "../store/useSceneStore";

export type Vec3 = [number, number, number];

export interface PlayerTransform {
  position: Vec3;
  /** Y rotation, radians. */
  yaw: number;
}

export interface RemotePlayer {
  id: string;
  name: string;
  color: string;
  /** Latest transform received from the wire — the lerp target. */
  target: PlayerTransform;
  /** Rendered transform — lerped toward `target` every frame. */
  current: PlayerTransform;
  lastSeen: number;
}

export type NetworkStatus = "offline" | "connecting" | "connected" | "simulated";

type Listener = () => void;

const SOCKET_URL = import.meta.env["VITE_SOCKET_URL"] as string | undefined;
const SEND_HZ = 15;

/* ------------------------------------------------------------------ */
/* Mutable transform registry (kept OUT of React state on purpose:     */
/* remote transforms change ~15x/s and must not re-render the canvas)  */
/* ------------------------------------------------------------------ */

const remotePlayers = new Map<string, RemotePlayer>();
const rosterListeners = new Set<Listener>();

let socket: Socket | null = null;
let status: NetworkStatus = "offline";
let ping = 0;
let localId = "local";
let simTimer: ReturnType<typeof setInterval> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let lastSentAt = 0;

const PALETTE = ["#b6f36a", "#6ad1f3", "#f3a76a", "#d06af3"];

function notifyRoster() {
  rosterListeners.forEach((l) => l());
}

function upsertRemote(id: string, t: PlayerTransform, name?: string) {
  const existing = remotePlayers.get(id);
  if (existing) {
    existing.target = t;
    existing.lastSeen = performance.now();
    useSceneStore.getState().upsertNetworkEntity({
      id,
      name: existing.name,
      type: "player",
      position: t.position,
      rotationY: t.yaw,
      color: existing.color,
      updatedAt: Date.now(),
    });
    return;
  }
  const displayName = name ?? `Player ${remotePlayers.size + 1}`;
  const color = PALETTE[remotePlayers.size % PALETTE.length]!;
  remotePlayers.set(id, {
    id,
    name: displayName,
    color,
    target: t,
    current: { position: [...t.position] as Vec3, yaw: t.yaw },
    lastSeen: performance.now(),
  });
  useSceneStore.getState().upsertNetworkEntity({
    id,
    name: displayName,
    type: "player",
    position: t.position,
    rotationY: t.yaw,
    color,
    updatedAt: Date.now(),
  });
  notifyRoster();
}

function dropRemote(id: string) {
  if (remotePlayers.delete(id)) {
    useSceneStore.getState().removeNetworkEntity(id);
    notifyRoster();
  }
}

/* ------------------------------------------------------------------ */
/* Simulated transport — two ghost peers orbiting the origin           */
/* ------------------------------------------------------------------ */

function startSimulation() {
  status = "simulated";
  localId = "local";
  const peers = [
    { id: "sim-a", name: "Ghost A", radius: 6, speed: 0.5, phase: 0 },
    { id: "sim-b", name: "Ghost B", radius: 9, speed: -0.32, phase: 2.1 },
  ];
  // 8 Hz on purpose: coarse updates make the client-side lerp visible.
  simTimer = setInterval(() => {
    const t = performance.now() / 1000;
    for (const p of peers) {
      const a = t * p.speed + p.phase;
      upsertRemote(
        p.id,
        { position: [Math.cos(a) * p.radius, 0.9, Math.sin(a) * p.radius], yaw: -a },
        p.name,
      );
    }
    ping = 28 + Math.round(Math.sin(t) * 6);
  }, 125);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function connect(onStatus: (s: NetworkStatus) => void) {
  if (socket || simTimer) return;

  if (!SOCKET_URL) {
    startSimulation();
    onStatus(status);
    return;
  }

  status = "connecting";
  onStatus(status);

  const { io } = await import("socket.io-client");
  socket = io(SOCKET_URL, { transports: ["websocket"], reconnectionAttempts: 3 });

  socket.on("connect", () => {
    localId = socket?.id ?? "local";
    status = "connected";
    onStatus(status);
  });
  socket.on("disconnect", () => {
    status = "offline";
    onStatus(status);
  });
  socket.on("connect_error", () => {
    // Server unreachable — degrade to the local simulation instead of dying.
    socket?.close();
    socket = null;
    startSimulation();
    onStatus(status);
  });

  socket.on("player:transform", (payload: { id: string; name?: string } & PlayerTransform) => {
    if (payload.id === localId) return;
    upsertRemote(payload.id, { position: payload.position, yaw: payload.yaw }, payload.name);
  });
  socket.on("player:leave", (payload: { id: string }) => dropRemote(payload.id));

  pingTimer = setInterval(() => {
    const sent = performance.now();
    socket?.emit("ping:check", null, () => {
      ping = Math.round(performance.now() - sent);
    });
  }, 2000);
}

export function disconnect() {
  socket?.close();
  socket = null;
  if (simTimer) clearInterval(simTimer);
  if (pingTimer) clearInterval(pingTimer);
  simTimer = null;
  pingTimer = null;
  remotePlayers.clear();
  status = "offline";
  ping = 0;
  notifyRoster();
}

/** Throttled outbound transform emit — safe to call every frame. */
export function sendTransform(t: PlayerTransform) {
  const now = performance.now();
  if (now - lastSentAt < 1000 / SEND_HZ) return;
  lastSentAt = now;
  socket?.emit("player:transform", { id: localId, ...t });
}

export function getRemotePlayers() {
  return remotePlayers;
}

export function getPing() {
  return ping;
}

export function getStatus() {
  return status;
}

/** Subscribe to join/leave only (never to per-frame transforms). */
export function subscribeRoster(listener: Listener) {
  rosterListeners.add(listener);
  return () => rosterListeners.delete(listener);
}
