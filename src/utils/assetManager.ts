import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from "three-mesh-bvh";

/* ------------------------------------------------------------------ */
/* three-mesh-bvh: accelerate raycasting for every geometry / mesh     */
/* ------------------------------------------------------------------ */

let bvhInstalled = false;
export function installBVH() {
  if (bvhInstalled) return;
  const proto = THREE.BufferGeometry.prototype as unknown as Record<string, unknown>;
  proto["computeBoundsTree"] = computeBoundsTree;
  proto["disposeBoundsTree"] = disposeBoundsTree;
  (THREE.Mesh.prototype as unknown as Record<string, unknown>)["raycast"] =
    acceleratedRaycast;
  bvhInstalled = true;
}
installBVH();


/** Build BVH bounds trees + shadow flags on every mesh of a loaded scene. */
export function optimizeScene(scene: THREE.Object3D) {
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const geom = mesh.geometry as unknown as {
      boundsTree?: unknown;
      computeBoundsTree?: () => void;
    };
    if (geom && !geom.boundsTree && geom.computeBoundsTree) {
      try {
        geom.computeBoundsTree();
      } catch {
        /* geometry not indexable — skip BVH */
      }
    }
  });
  return scene;
}

/* ------------------------------------------------------------------ */
/* Loader configuration: DRACO + KTX2 / Basis                          */
/* ------------------------------------------------------------------ */

export const DRACO_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.6/";
export const KTX2_PATH = "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/libs/basis/";

let dracoLoader: DRACOLoader | null = null;
export function getDracoLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_PATH);
    dracoLoader.setDecoderConfig({ type: "js" });
  }
  return dracoLoader;
}

let ktx2Loader: KTX2Loader | null = null;
export function getKTX2Loader(renderer?: THREE.WebGLRenderer) {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader().setTranscoderPath(KTX2_PATH);
  }
  if (renderer) ktx2Loader.detectSupport(renderer);
  return ktx2Loader;
}

/** Attach DRACO + KTX2 support to a GLTFLoader instance (used by useGLTF). */
export function extendGLTFLoader(loader: GLTFLoader, renderer?: THREE.WebGLRenderer) {
  loader.setDRACOLoader(getDracoLoader());
  loader.setKTX2Loader(getKTX2Loader(renderer));
}

/** Standalone loader for imperative loads outside of Suspense. */
export function createGLTFLoader(renderer?: THREE.WebGLRenderer) {
  const loader = new GLTFLoader();
  extendGLTFLoader(loader, renderer);
  return loader;
}

/* ------------------------------------------------------------------ */
/* Model catalogue used by the chat command bridge                     */
/* ------------------------------------------------------------------ */

export interface CatalogEntry {
  name: string;
  modelUrl: string;
  scale: number;
  keywords: string[];
}

export const MODEL_CATALOG: CatalogEntry[] = [
  {
    name: "Robot",
    modelUrl: "/models/robot.glb",
    scale: 0.6,
    keywords: ["robot", "bot", "droid", "android"],
  },
];

export function matchCatalog(prompt: string): CatalogEntry | null {
  const p = prompt.toLowerCase();
  return (
    MODEL_CATALOG.find((entry) => entry.keywords.some((k) => p.includes(k))) ?? null
  );
}
