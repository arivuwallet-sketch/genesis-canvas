const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.AGENT_SERVER_PORT ?? 5000);

app.use(cors());
app.use(express.json());

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.post("/api/generate-game", async (req, res) => {
  const { prompt } = req.body ?? {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "A non-empty prompt is required." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const sendEvent = (event, data) => {
    if (closed || res.writableEnded) return false;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  };

  try {
    if (!sendEvent("agent_start", {
      taskId: "task-1",
      agent: "🧠 Orchestrator",
      message: "Analyzing Master Prompt...",
      prompt: prompt.trim(),
    })) return;

    await delay(2000);
    if (closed) return;

    sendEvent("agent_update", {
      taskId: "task-1",
      status: "completed",
      message: "Deconstruction complete.",
    });

    sendEvent("agent_start", {
      taskId: "task-2",
      agent: "📐 Environment Agent",
      message: "Generating heightmap terrain...",
    });

    await delay(3000);
    if (closed) return;

    sendEvent("agent_update", {
      taskId: "task-2",
      status: "completed",
      message: "Terrain geometry finalized.",
    });

    sendEvent("pipeline_complete", {
      success: true,
      prompt: prompt.trim(),
    });
  } catch (error) {
    console.error("Agent pipeline error:", error);

    sendEvent("pipeline_complete", {
      success: false,
      error: error instanceof Error ? error.message : "Unknown agent pipeline error.",
    });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

app.listen(PORT, () => {
  console.log(`AI Engine Backend running on port ${PORT}`);
});
