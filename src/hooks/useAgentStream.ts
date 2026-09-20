import { useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useAgentActivityStore, type AgentActivityStatus } from "../store/useAgentActivityStore";

type AgentStreamEvent = {
  taskId?: string;
  agent?: string;
  message?: string;
  status?: AgentActivityStatus;
};

export const useAgentStream = () => {
  const addLog = useAgentActivityStore((state) => state.addLog);
  const updateLog = useAgentActivityStore((state) => state.updateLog);
  const [isProcessing, setIsProcessing] = useState(false);

  const startAgentPipeline = async (masterPrompt: string) => {
    setIsProcessing(true);

    try {
      await fetchEventSource("http://localhost:5000/api/generate-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ prompt: masterPrompt }),

        onmessage(event) {
          let data: AgentStreamEvent;

          try {
            data = JSON.parse(event.data) as AgentStreamEvent;
          } catch (error) {
            console.error("Invalid agent pipeline event:", error);
            return;
          }

          if (event.event === "agent_start") {
            if (!data.taskId || !data.agent) return;

            addLog({
              id: data.taskId,
              agentName: data.agent,
              status: "thinking",
              message: data.message ?? "Agent started.",
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (event.event === "agent_update") {
            if (!data.taskId) return;

            updateLog(data.taskId, {
              ...(data.message === undefined ? {} : { message: data.message }),
              ...(data.status === undefined ? {} : { status: data.status }),
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (event.event === "pipeline_complete") {
            setIsProcessing(false);
          }
        },

        onclose() {
          setIsProcessing(false);
        },

        onerror(error) {
          console.error("Agent Pipeline Connection Error:", error);
          setIsProcessing(false);
          throw error;
        },
      });
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  };

  return { startAgentPipeline, isProcessing };
};
