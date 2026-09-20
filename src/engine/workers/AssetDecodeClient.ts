export interface DecodedGeometry {
  name: string;
  position: Float32Array;
  normal?: Float32Array;
  uv?: Float32Array;
  index?: Uint32Array;
}

type Pending = {
  resolve: (value: DecodedGeometry[]) => void;
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
        pending.reject(
          new Error(String(event.data.message ?? "Asset worker error.")),
        );
        return;
      }

      pending.resolve(
        (event.data.geometries as DecodedGeometry[] | undefined) ?? [],
      );
    };
  }

  decode(
    id: string,
    url: string,
    dracoDecoderPath = "/draco/",
  ): Promise<DecodedGeometry[]> {
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: "decode", id, url, dracoDecoderPath });
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
