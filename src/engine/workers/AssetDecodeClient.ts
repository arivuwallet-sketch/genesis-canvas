type Pending = {
  resolve: (value: ArrayBuffer) => void;
  reject: (reason?: unknown) => void;
};

export class AssetDecodeClient {
  private readonly worker: Worker;
  private readonly pending = new Map<string, Pending>();

  constructor(
    workerUrl: URL = new URL("./AssetDecode.worker.ts", import.meta.url),
  ) {
    this.worker = new Worker(workerUrl, { type: "module" });
    this.worker.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
      const id = String(event.data.id ?? "");
      const pending = this.pending.get(id);
      if (!pending) return;

      this.pending.delete(id);
      if (event.data.type === "error") {
        pending.reject(new Error(String(event.data.message ?? "Asset worker error.")));
      } else {
        pending.resolve(event.data.buffer as ArrayBuffer);
      }
    };
  }

  fetchCompressed(
    id: string,
    url: string,
    dracoDecoderPath?: string,
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({
        type: "decode",
        id,
        url,
        dracoDecoderPath,
      });
    });
  }

  dispose() {
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      pending.reject(new Error("Asset decode worker disposed."));
    }
    this.pending.clear();
  }
}
