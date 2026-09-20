export interface GeometryRaycastHit {
  distance: number;
  point: [number, number, number];
  faceIndex: number;
}

type PendingResolver = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

export class GeometryAccelerationClient {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingResolver>();

  constructor(workerUrl: URL = new URL("./GeometryAcceleration.worker.ts", import.meta.url)) {
    this.worker = new Worker(workerUrl, { type: "module" });

    this.worker.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
      const id = String(event.data.id ?? "");
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);

      if (event.data.type === "error") {
        pending.reject(new Error(String(event.data.message ?? "Worker error.")));
      } else {
        pending.resolve(event.data);
      }
    };
  }

  build(id: string, positions: Float32Array) {
    return new Promise<void>((resolve, reject) => {
      this.pending.set(id, {
        resolve: () => resolve(),
        reject,
      });

      this.worker.postMessage(
        { type: "build", id, positions: positions.buffer },
        [positions.buffer],
      );
    });
  }

  raycast(
    id: string,
    origin: [number, number, number],
    direction: [number, number, number],
  ) {
    return new Promise<GeometryRaycastHit | null>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => {
          const hit = (value as { hit?: GeometryRaycastHit | null }).hit;
          resolve(hit ?? null);
        },
        reject,
      });

      this.worker.postMessage({
        type: "raycast",
        id,
        origin,
        direction,
      });
    });
  }

  dispose() {
    this.worker.terminate();
    for (const pending of this.pending.values()) {
      pending.reject(new Error("Geometry worker disposed."));
    }
    this.pending.clear();
  }
}
