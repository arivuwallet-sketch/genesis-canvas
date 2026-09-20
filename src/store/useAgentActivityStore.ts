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
