import { create } from "zustand";

export type AgentActivityStatus = "thinking" | "executing" | "completed" | "error";

export interface AgentActivityLog {
  id: string;
  agentName: string;
  status: AgentActivityStatus;
  message: string;
  timestamp: string;
  progress?: number;
  payload?: unknown;
}

interface AgentActivityState {
  logs: AgentActivityLog[];
  activeAgentCount: number;
  collapsed: boolean;
  addLog: (log: AgentActivityLog) => void;
  updateLog: (id: string, partialLog: Partial<AgentActivityLog>) => void;
  clearLogs: () => void;
  toggleCollapse: () => void;
}

const MAX_LOGS = 80;

const countActive = (logs: AgentActivityLog[]) =>
  new Set(
    logs
      .filter((log) => log.status === "thinking" || log.status === "executing")
      .map((log) => log.agentName),
  ).size;

export const useAgentActivityStore = create<AgentActivityState>((set) => ({
  logs: [],
  activeAgentCount: 0,
  collapsed: false,

  addLog: (log) =>
    set((state) => {
      const logs = [...state.logs, log].slice(-MAX_LOGS);
      return { logs, activeAgentCount: countActive(logs) };
    }),

  updateLog: (id, partialLog) =>
    set((state) => {
      const logs = state.logs.map((log) =>
        log.id === id ? { ...log, ...partialLog } : log,
      );
      return { logs, activeAgentCount: countActive(logs) };
    }),

  clearLogs: () => set({ logs: [], activeAgentCount: 0 }),

  toggleCollapse: () => set((state) => ({ collapsed: !state.collapsed })),
}));

export const makeAgentActivityId = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 14);

export const addAgentActivityLog = (
  agentName: string,
  status: AgentActivityStatus,
  message: string,
  progress?: number,
  payload?: unknown,
) => {
  useAgentActivityStore.getState().addLog({
    id: makeAgentActivityId(),
    agentName,
    status,
    message,
    timestamp: new Date().toISOString(),
    ...(progress === undefined ? {} : { progress }),
    ...(payload === undefined ? {} : { payload }),
  });
};

let simulationTimers: ReturnType<typeof setTimeout>[] = [];

const clearSimulationTimers = () => {
  while (simulationTimers.length) clearTimeout(simulationTimers.pop()!);
};

const scheduleActivity = (
  delay: number,
  run: () => void,
) => {
  simulationTimers.push(setTimeout(run, delay));
};

export function startAgentActivitySimulation(prompt: string) {
  clearSimulationTimers();
  const store = useAgentActivityStore.getState();
  store.clearLogs();

  const context = {
    source: "chat_prompt",
    prompt: prompt.slice(0, 1000),
  };

  let orchestratorId = "";
  let narrativeId = "";
  let terrainId = "";
  let physicsId = "";

  scheduleActivity(0, () => {
    orchestratorId = makeAgentActivityId();
    store.addLog({
      id: orchestratorId,
      agentName: "Orchestrator Agent",
      status: "thinking",
      message: "Deconstructing user prompt into execution sub-tasks...",
      timestamp: new Date().toISOString(),
      progress: 12,
      payload: { ...context, phase: "decompose" },
    });
  });

  scheduleActivity(1000, () => {
    const now = new Date().toISOString();
    store.updateLog(orchestratorId, {
      status: "completed",
      message: "Execution plan ready. Dispatching specialist agents.",
      timestamp: now,
      progress: 100,
      payload: { ...context, phase: "dispatch" },
    });
    narrativeId = makeAgentActivityId();
    store.addLog({
      id: narrativeId,
      agentName: "Narrative Agent",
      status: "thinking",
      message: "Generating scene lore and boss dialogue trees...",
      timestamp: now,
      progress: 30,
      payload: { ...context, phase: "narrative", tasks: ["scene lore", "dialogue tree"] },
    });
  });

  scheduleActivity(2500, () => {
    const now = new Date().toISOString();
    store.updateLog(narrativeId, {
      status: "completed",
      message: "Narrative beats and boss dialogue tree complete.",
      timestamp: now,
      progress: 100,
    });
    terrainId = makeAgentActivityId();
    store.addLog({
      id: terrainId,
      agentName: "Terrain & Asset Agent",
      status: "executing",
      message: "Fetching stone wall GLTF assets & placing bounding boxes...",
      timestamp: now,
      progress: 58,
      payload: { ...context, phase: "terrain_assets", assetType: "stone_wall_glb" },
    });
  });

  scheduleActivity(4000, () => {
    const now = new Date().toISOString();
    store.updateLog(terrainId, {
      status: "completed",
      message: "Stone asset pass complete; scene bounds are ready.",
      timestamp: now,
      progress: 100,
    });
    physicsId = makeAgentActivityId();
    store.addLog({
      id: physicsId,
      agentName: "Physics & Logic Agent",
      status: "executing",
      message: "Binding Rapier colliders and behavior state machines...",
      timestamp: now,
      progress: 76,
      payload: { ...context, phase: "physics_logic", systems: ["rapier", "boss-state-machine"] },
    });
  });

  scheduleActivity(5500, () => {
    const now = new Date().toISOString();
    store.updateLog(physicsId, {
      status: "completed",
      message: "Rapier colliders and behavior state machines bound.",
      timestamp: now,
      progress: 100,
    });
    store.updateLog(orchestratorId, {
      status: "completed",
      message: "Pipeline Execution Complete. Updating Scene Graph.",
      timestamp: now,
      progress: 100,
      payload: { ...context, phase: "complete", sceneGraphSync: true },
    });
  });
}
