import { Decal, Edges, Html, useAnimations, useGLTF, useProgress } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { extendGLTFLoader, optimizeScene } from "../utils/assetManager";
import { registerAnimationActions, unregisterAnimationActions } from "../lib/animationRegistry";
import { carveGeometry, makePrimitiveGeometry } from "../utils/csg";
import { useEditorStore, type SpawnedObject } from "../store/useEditorStore";
import { useVfxStore, type Decal as VfxDecal } from "../store/useVfxStore";

/* ------------------------------------------------------------------ */
/* Error boundary -> stylized fallback volume                          */
/* ------------------------------------------------------------------ */

class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.warn("[AssetLoader] model failed to load", error);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Stylized bounding volume: loading + failure fallback                */
/* ------------------------------------------------------------------ */

const FALLBACK_BOX = new THREE.BoxGeometry(1, 1, 1);

export function FallbackVolume({
  scale = [1, 1, 1],
  label = "Generating mesh…",
}: {
  scale?: [number, number, number];
  label?: string;
}) {
  return (
    <group scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#7ee34a"
          transparent
          opacity={0.14}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[FALLBACK_BOX]} />
        <lineBasicMaterial color="#b6f36a" />
      </lineSegments>
      <Html center distanceFactor={8} zIndexRange={[5, 0]}>
        <div className="pointer-events-none flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-primary backdrop-blur">
          <span className="h-2 w-2 animate-spin rounded-full border border-primary border-t-transparent" />
          {label}
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Primitive mesh — CSG-carved when the entity has holes               */
/* ------------------------------------------------------------------ */

function PrimitiveMesh({
  object,
  selected,
}: {
  object: SpawnedObject;
  selected: boolean;
}) {
  const geometry = useMemo(() => {
    const base = makePrimitiveGeometry(object.geometry);
    return object.carves.length ? carveGeometry(base, object.carves) : base;
  }, [object.geometry, object.carves]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh castShadow receiveShadow scale={object.scale} geometry={geometry}>
      <meshStandardMaterial
        color={object.color}
        metalness={object.metalness}
        roughness={object.roughness}
        emissive={object.emissive > 0 ? object.color : "#000000"}
        emissiveIntensity={object.emissive}
      />
      <PrimitiveDecals objectId={object.id} />
      {selected && <Edges scale={1.02} color="#b6f36a" />}
    </mesh>
  );
}


function createDecalTexture(kind: VfxDecal["type"]) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  const center = 64;
  const gradient = ctx.createRadialGradient(center, center, 5, center, center, 58);
  if (kind === "bullet_hole") {
    gradient.addColorStop(0, "rgba(12,12,12,0.95)");
    gradient.addColorStop(0.3, "rgba(28,28,24,0.82)");
    gradient.addColorStop(0.62, "rgba(50,40,26,0.42)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    gradient.addColorStop(0, "rgba(24,18,12,0.78)");
    gradient.addColorStop(0.35, "rgba(65,44,24,0.55)");
    gradient.addColorStop(0.7, "rgba(95,62,28,0.2)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function PrimitiveDecals({ objectId }: { objectId: string }) {
  const decals = useVfxStore((state) => state.decals.filter((item) => item.targetId === objectId));
  const textures = useMemo(() => {
    const map = new Map<VfxDecal["type"], THREE.Texture>();
    for (const decal of decals) {
      if (!map.has(decal.type)) {
        const texture = createDecalTexture(decal.type);
        if (texture) map.set(decal.type, texture);
      }
    }
    return map;
  }, [decals]);

  useEffect(
    () => () => {
      for (const texture of textures.values()) texture.dispose();
    },
    [textures],
  );

  return (
    <>
      {decals.map((decal) => (
        <Decal
          key={decal.id}
          position={decal.position}
          rotation={decal.rotation}
          scale={decal.scale}
          map={textures.get(decal.type)}
          depthTest
          polygonOffset
          polygonOffsetFactor={-4}
        >
          <meshBasicMaterial
            transparent
            opacity={decal.type === "bullet_hole" ? 0.86 : 0.62}
            depthWrite={false}
            toneMapped={false}
          />
        </Decal>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* GLTF model — DRACO + KTX2 enabled, BVH optimized                    */
/* ------------------------------------------------------------------ */

function GLTFModel({
  url,
  scale,
  entityId,
}: {
  url: string;
  scale: [number, number, number];
  entityId: string;
}) {
  const gl = useThree((s) => s.gl);
  const { scene, animations } = useGLTF(url, true, true, (loader) =>
    extendGLTFLoader(loader, gl),
  );
  const cloned = useMemo(() => optimizeScene(skeletonClone(scene)), [scene]);
  const { actions, mixer } = useAnimations(animations, cloned);

  useEffect(() => {
    registerAnimationActions(entityId, actions);
    return () => {
      mixer.stopAllAction();
      unregisterAnimationActions(entityId);
    };
  }, [actions, entityId, mixer]);

  return <primitive object={cloned} scale={scale} />;
}

/* ------------------------------------------------------------------ */
/* One spawned entity: physics body + visual                           */
/* ------------------------------------------------------------------ */

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();

function SpawnedEntity({ object }: { object: SpawnedObject }) {
  const { physics } = object;
  const body = useRef<RapierRigidBody>(null);
  const selectedId = useEditorStore((s) => s.selectedId);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const selected = selectedId === object.id;

  // Gizmo / AI transforms live in the store; push them into the physics body.
  useEffect(() => {
    const rb = body.current;
    if (!rb) return;
    const [x, y, z] = object.position;
    rb.setTranslation({ x, y, z }, true);
    tmpEuler.set(object.rotation[0], object.rotation[1], object.rotation[2]);
    tmpQuat.setFromEuler(tmpEuler);
    rb.setRotation(
      { x: tmpQuat.x, y: tmpQuat.y, z: tmpQuat.z, w: tmpQuat.w },
      true,
    );
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, [object.position, object.rotation]);

  const colliders =
    object.kind === "model" ? "hull" : object.carves.length ? "trimesh" : "cuboid";

  return (
    <RigidBody
      ref={body}
      // Scale + carving change the collider shape, so rebuild the body.
      key={`${object.scale.join(",")}|${object.carves.length}`}
      type={physics.type}
      position={object.position}
      rotation={object.rotation}
      colliders={colliders}
      mass={physics.mass}
      restitution={physics.restitution}
      friction={physics.friction}
      gravityScale={physics.gravityScale}
      canSleep
    >
      <group
        visible={object.visible}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!object.locked && object.visible) setSelectedId(object.id);
        }}
      >
        {object.kind === "model" && object.modelUrl ? (
          <ModelErrorBoundary
            fallback={<FallbackVolume scale={object.scale} label="Procedural stand-in" />}
          >
            <Suspense fallback={<FallbackVolume scale={object.scale} />}>
              <GLTFModel url={object.modelUrl} scale={object.scale} entityId={object.id} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <PrimitiveMesh object={object} selected={selected} />
        )}
      </group>
    </RigidBody>
  );
}

/* ------------------------------------------------------------------ */
/* Renders everything the Zustand store says exists in the world       */
/* ------------------------------------------------------------------ */

export function AssetLoader() {
  const spawnedObjects = useEditorStore((s) => s.spawnedObjects);
  const setLoading = useEditorStore((s) => s.setLoading);

  // Mirror drei's global asset loading progress into the store for the HUD.
  useEffect(() => {
    let raf = 0;
    const push = (progress: number, active: boolean) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setLoading(progress, active));
    };
    const initial = useProgress.getState();
    push(initial.progress, initial.active);
    const unsub = useProgress.subscribe((s) => push(s.progress, s.active));
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [setLoading]);

  return (
    <>
      {spawnedObjects.map((object) => (
        <SpawnedEntity key={object.id} object={object} />
      ))}
    </>
  );
}
