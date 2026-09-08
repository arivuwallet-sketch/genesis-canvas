import { useGLTF, useProgress } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { extendGLTFLoader, optimizeScene } from "../utils/assetManager";
import { useEditorStore, type SpawnedObject } from "../store/useEditorStore";

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
}: {
  scale?: [number, number, number];
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
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Primitive geometry                                                  */
/* ------------------------------------------------------------------ */

function PrimitiveGeo({ object }: { object: SpawnedObject }) {
  switch (object.geometry) {
    case "sphere":
      return <sphereGeometry args={[0.6, 32, 24]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.5, 0.5, 1.2, 32]} />;
    case "cone":
      return <coneGeometry args={[0.6, 1.2, 32]} />;
    case "torus":
      return <torusGeometry args={[0.5, 0.2, 20, 48]} />;
    case "capsule":
      return <capsuleGeometry args={[0.4, 0.7, 8, 24]} />;
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

function PrimitiveMesh({ object }: { object: SpawnedObject }) {
  return (
    <mesh castShadow receiveShadow scale={object.scale}>
      <PrimitiveGeo object={object} />
      <meshStandardMaterial
        color={object.color}
        metalness={object.metalness}
        roughness={object.roughness}
        emissive={object.emissive > 0 ? object.color : "#000000"}
        emissiveIntensity={object.emissive}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* GLTF model — DRACO + KTX2 enabled, BVH optimized                    */
/* ------------------------------------------------------------------ */

function GLTFModel({
  url,
  scale,
}: {
  url: string;
  scale: [number, number, number];
}) {
  const gl = useThree((s) => s.gl);
  const { scene } = useGLTF(url, true, true, (loader) => extendGLTFLoader(loader, gl));
  const cloned = useMemo(() => optimizeScene(skeletonClone(scene)), [scene]);

  return <primitive object={cloned} scale={scale} />;
}

/* ------------------------------------------------------------------ */
/* One spawned entity: physics body + visual                           */
/* ------------------------------------------------------------------ */

function SpawnedEntity({ object }: { object: SpawnedObject }) {
  const { physics } = object;

  return (
    <RigidBody
      type={physics.type}
      position={object.position}
      rotation={object.rotation}
      colliders={object.kind === "model" ? "hull" : "cuboid"}
      mass={physics.mass}
      restitution={physics.restitution}
      friction={physics.friction}
      gravityScale={physics.gravityScale}
      canSleep
    >
      {object.kind === "model" && object.modelUrl ? (
        <ModelErrorBoundary fallback={<FallbackVolume scale={object.scale} />}>
          <Suspense fallback={<FallbackVolume scale={object.scale} />}>
            <GLTFModel url={object.modelUrl} scale={object.scale} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <PrimitiveMesh object={object} />
      )}
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
