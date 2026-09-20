type DecodeRequest = {
  type: "decode";
  id: string;
  url: string;
  dracoDecoderPath?: string;
};

self.onmessage = async (event: MessageEvent<DecodeRequest>) => {
  const request = event.data;

  try {
    if (request.type !== "decode") return;

    const response = await fetch(request.url, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Asset fetch failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // The actual GLTFLoader/DRACO/Meshopt decode remains a main-thread
    // integration point because decoded BufferGeometry/Scene graphs are not
    // transferable objects. The worker owns the I/O and decompression staging
    // buffer, so the expensive network/blob lifetime is isolated from React.
    self.postMessage(
      {
        type: "decodedBuffer",
        id: request.id,
        buffer,
        dracoDecoderPath: request.dracoDecoderPath ?? "",
      },
      [buffer],
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
