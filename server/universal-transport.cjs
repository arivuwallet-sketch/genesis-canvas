const { WebSocketServer } = require("ws");

const PORT = Number(process.env.UNIVERSAL_TRANSPORT_PORT || 3010);
const wss = new WebSocketServer({ port: PORT, clientTracking: true });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({
    type: "hello",
    protocol: "genesis-engine-v1",
    binary: true,
  }));

  socket.on("message", (data, isBinary) => {
    // The transport is intentionally opaque at this layer. Binary frames are
    // validated/decoded by the participating engine, then broadcast unchanged.
    if (!isBinary) return;
    for (const peer of wss.clients) {
      if (peer === socket || peer.readyState !== 1) continue;
      peer.send(data, { binary: true });
    }
  });
});

wss.on("listening", () => {
  console.log(`Universal binary transport listening on ws://localhost:${PORT}`);
});

wss.on("error", (error) => {
  console.error("[UniversalTransport] server error", error);
});
