import { useState } from "react";
import { useAgentStream } from "../../hooks/useAgentStream";

export const MasterPromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const { startAgentPipeline, isProcessing } = useAgentStream();

  const handleRunPipeline = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isProcessing) return;

    void startAgentPipeline(trimmedPrompt);
    setPrompt("");
  };

  return (
    <div className="chat-input-wrapper">
      <input
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleRunPipeline();
        }}
        disabled={isProcessing}
        placeholder="e.g. Build a 3hr stealth horror game..."
      />
      <button onClick={handleRunPipeline} disabled={isProcessing || !prompt.trim()}>
        {isProcessing ? "Agents Working..." : "Generate"}
      </button>
    </div>
  );
};
