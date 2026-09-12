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
type AnyGLTFLoader = {
  setDRACOLoader: (l: unknown) => unknown;
  setKTX2Loader: (l: unknown) => unknown;
};

export function extendGLTFLoader(loader: unknown, renderer?: THREE.WebGLRenderer) {
  const l = loader as AnyGLTFLoader;
  l.setDRACOLoader(getDracoLoader());
  l.setKTX2Loader(getKTX2Loader(renderer));
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

/**
 * Every model here ships in `public/models` and is Kenney CC0 (public domain),
 * so nothing hotlinks a third-party CDN at runtime.
 * Keywords are ordered most-specific-first inside each entry; the catalogue
 * itself is ordered so narrow matches ("sports car") win over broad ones ("car").
 */
export const MODEL_CATALOG: CatalogEntry[] = [
  /* ---- vehicles ---- */
  {
    name: "Sports Car",
    modelUrl: "/models/sports-car.glb",
    scale: 1,
    keywords: ["sports car", "supercar", "sportscar", "coupe"],
  },
  {
    name: "Race Car",
    modelUrl: "/models/race-car.glb",
    scale: 1,
    keywords: ["race car", "racecar", "racing car", "formula", "rally car"],
  },
  {
    name: "Police Car",
    modelUrl: "/models/police-car.glb",
    scale: 1,
    keywords: ["police car", "police", "cop car", "squad car"],
  },
  {
    name: "Taxi",
    modelUrl: "/models/taxi.glb",
    scale: 1,
    keywords: ["taxi", "cab"],
  },
  {
    name: "Fire Truck",
    modelUrl: "/models/firetruck.glb",
    scale: 1,
    keywords: ["fire truck", "firetruck", "fire engine"],
  },
  {
    name: "Truck",
    modelUrl: "/models/truck.glb",
    scale: 1,
    keywords: ["truck", "lorry", "semi"],
  },
  {
    name: "Van",
    modelUrl: "/models/van.glb",
    scale: 1,
    keywords: ["van", "minivan"],
  },
  {
    name: "SUV",
    modelUrl: "/models/suv.glb",
    scale: 1,
    keywords: ["suv", "jeep", "4x4", "offroad"],
  },
  {
    name: "Sedan",
    modelUrl: "/models/sedan.glb",
    scale: 1,
    keywords: ["sedan", "car", "vehicle", "automobile", "auto"],
  },

  /* ---- characters ---- */
  {
    name: "Character (Male)",
    modelUrl: "/models/character-male.glb",
    scale: 1,
    keywords: ["male character", "man", "guy", "hero", "player", "character", "person", "human", "npc", "people"],
  },
  {
    name: "Character (Female)",
    modelUrl: "/models/character-female.glb",
    scale: 1,
    keywords: ["female character", "woman", "girl", "heroine", "lady"],
  },
  {
    name: "Robot",
    modelUrl: "/models/robot.glb",
    scale: 0.6,
    keywords: ["robot", "bot", "droid", "android", "mech"],
  },

  /* ---- buildings ---- */
  {
    name: "Skyscraper",
    modelUrl: "/models/skyscraper.glb",
    scale: 1,
    keywords: ["skyscraper", "tower", "high rise", "highrise"],
  },
  {
    name: "Shop",
    modelUrl: "/models/shop.glb",
    scale: 1,
    keywords: ["shop", "store", "storefront"],
  },
  {
    name: "Building",
    modelUrl: "/models/building.glb",
    scale: 1,
    keywords: ["building", "house", "office", "apartment", "block"],
  },

  /* ---- nature / environment ---- */
  {
    name: "Palm Tree",
    modelUrl: "/models/palm-tree.glb",
    scale: 1,
    keywords: ["palm tree", "palm"],
  },
  {
    name: "Pine Tree",
    modelUrl: "/models/pine-tree.glb",
    scale: 1,
    keywords: ["pine tree", "pine", "oak", "fir", "conifer"],
  },
  {
    name: "Tree",
    modelUrl: "/models/tree.glb",
    scale: 1,
    keywords: ["tree", "trees", "forest"],
  },
  {
    name: "Bush",
    modelUrl: "/models/bush.glb",
    scale: 1,
    keywords: ["bush", "shrub", "hedge"],
  },
  {
    name: "Grass",
    modelUrl: "/models/grass.glb",
    scale: 1,
    keywords: ["grass", "weeds", "foliage"],
  },
  {
    name: "Rock",
    modelUrl: "/models/rock.glb",
    scale: 1,
    keywords: ["rock", "boulder", "stone"],
  },
  {
    name: "Small Rock",
    modelUrl: "/models/small-rock.glb",
    scale: 1,
    keywords: ["small rock", "pebble", "small stone"],
  },
  {
    name: "Ground Tile",
    modelUrl: "/models/ground-tile.glb",
    scale: 1,
    keywords: ["ground", "terrain", "land", "tile", "floor patch"],
  },
  {
    name: "Campfire",
    modelUrl: "/models/campfire.glb",
    scale: 1,
    keywords: ["campfire", "fire", "bonfire", "logs"],
  },
];

/** Longest keyword first so "sports car" beats "car" regardless of list order. */
const KEYWORD_INDEX = MODEL_CATALOG.flatMap((entry) =>
  entry.keywords.map((keyword) => ({ keyword, entry })),
).sort((a, b) => b.keyword.length - a.keyword.length);

/** Find the best library model for a free-text phrase, or null. */
export function matchCatalog(prompt: string): CatalogEntry | null {
  const p = ` ${prompt.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  return KEYWORD_INDEX.find(({ keyword }) => p.includes(` ${keyword} `))?.entry ?? null;
}

/** Compact list handed to the AI so it stops inventing models out of boxes. */
export function catalogSummary(): string {
  return MODEL_CATALOG.map((e) => `${e.modelUrl} (${e.name})`).join(", ");
}
