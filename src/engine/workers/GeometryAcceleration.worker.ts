import { BufferAttribute, BufferGeometry, Ray, Vector3 } from "three";
import { MeshBVH } from "three-mesh-bvh";

type BuildMessage = {
  type: "build";
  id: string;
  positions: ArrayBuffer;
};

type RaycastMessage = {
  type: "raycast";
  id: string;
  origin: [number, number, number];
  direction: [number, number, number];
};

type WorkerMessage = BuildMessage | RaycastMessage;

type IndexEntry = {
  id: string;
  geometry: BufferGeometry;
  bvh: MeshBVH;
};

const entries = new Map<string, IndexEntry>();

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "build") {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(message.positions);
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.computeBoundingBox();

    const bvh = new MeshBVH(geometry, {
      lazyGeneration: false,
      maxLeafTris: 8,
    });

    entries.set(message.id, { id: message.id, geometry, bvh });

    self.postMessage({
      type: "built",
      id: message.id,
      bounds: geometry.boundingBox
        ? {
            min: geometry.boundingBox.min.toArray(),
            max: geometry.boundingBox.max.toArray(),
          }
        : null,
    });
    return;
  }

  if (message.type === "raycast") {
    const entry = entries.get(message.id);
    if (!entry) {
      self.postMessage({ type: "error", id: message.id, message: "BVH not found." });
      return;
    }

    const ray = new Ray(
      new Vector3().fromArray(message.origin),
      new Vector3().fromArray(message.direction).normalize(),
    );
    const hits = entry.bvh.raycast(ray);
    const hit = hits[0];

    self.postMessage({
      type: "raycastResult",
      id: message.id,
      hit: hit
        ? {
            distance: hit.distance,
            point: hit.point.toArray(),
            faceIndex: hit.faceIndex ?? -1,
          }
        : null,
    });
  }
};
