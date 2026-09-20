import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

type DecodeRequest = {
  type: "decode";
  id: string;
  url: string;
  dracoDecoderPath?: string;
};

type DecodedGeometry = {
  name: string;
  position: Float32Array;
  normal?: Float32Array;
  uv?: Float32Array;
  index?: Uint32Array;
};

const buildLoader = (dracoDecoderPath: string) => {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(dracoDecoderPath);
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return { loader, draco };
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
    const { loader, draco } = buildLoader(request.dracoDecoderPath ?? "/draco/");

    const gltf = await new Promise<any>((resolve, reject) => {
      loader.parse(buffer, "", resolve, reject);
    });

    const geometries: DecodedGeometry[] = [];
    gltf.scene.traverse((object: any) => {
      if (geometries.length >= 256) return;
      if (!object?.isMesh || !object.geometry) return;

      const position = object.geometry.getAttribute("position");
      if (!position) return;

      const normal = object.geometry.getAttribute("normal");
      const uv = object.geometry.getAttribute("uv");
      const index = object.geometry.getIndex();

      geometries.push({
        name: object.name || `mesh-${geometries.length}`,
        position: new Float32Array(position.array),
        ...(normal ? { normal: new Float32Array(normal.array) } : {}),
        ...(uv ? { uv: new Float32Array(uv.array) } : {}),
        ...(index ? {
          index: index.array instanceof Uint32Array
            ? new Uint32Array(index.array)
            : Uint32Array.from(index.array),
        } : {}),
      });
    });

    draco.dispose();

    const transferables: ArrayBuffer[] = [];
    for (const geometry of geometries) {
      transferables.push(geometry.position.buffer);
      if (geometry.normal) transferables.push(geometry.normal.buffer);
      if (geometry.uv) transferables.push(geometry.uv.buffer);
      if (geometry.index) transferables.push(geometry.index.buffer);
    }

    self.postMessage({ type: "decoded", id: request.id, geometries }, transferables);
  } catch (error) {
    self.postMessage({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
