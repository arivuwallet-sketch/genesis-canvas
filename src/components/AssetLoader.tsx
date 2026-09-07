import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils.js";
import { extendGLTFLoader, optimizeScene } from "../utils/assetManager";
import { useEditorStore, type SpawnedObject } from "../store/useEditorStore";

/* ------------------------------------------------------------------ */
/* Error boundary -> stylized fallback volume                          */
/* ------------------------------------------------------------------ */

class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[AssetLoader] model failed to load", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Stylized wireframe bounding box used while loading or when a model fails. */
export function FallbackVolume({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#7ee34a"
          transparent
          opacity={0.12}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE_BoxGeometry()]} />
        <lineBasicMaterial color="#b6f36a" />
      </lineSegments>
    </group>
  );
}

// tiny helper so we don't import all of three just for the edges geometry
import * as THREE from "three";
function THREE_BoxGeometry() {
  return new THREE.BoxGeometry(1, 1, 1);
}

/* ------------------------------------------------------------------ */
/* GLTF model, DRACO + KTX2 enabled, BVH optimized                     */
/* ------------------------------------------------------------------ */

function GLTFModel({ url, scale }: { url: string; scale: number }) {
  const gl = useThree((s) => s.gl);
  const { scene } = useGLTF(url, true, true, (loader) =>
    extendGLTFLoader(loader as GLTFLoader, gl),
  );

  const cloned = useMemo(() => optimizeScene(SkeletonUtils.clone(scene)), [scene]);

  return <primitive object={cloned} scale={scale} />;
}

/* ------------------------------------------------------------------ */
/* One spawned entity: physics body + model                            */
/* ------------------------------------------------------------------ */

function SpawnedEntity({ object }: { object: SpawnedObject }) {
  return (
    <RigidBody
      position={object.position}
      colliders="hull"
      restitution={0.2}
      friction={1}
      canSleep
    >
      {object.modelUrl ? (
        <ModelErrorBoundary fallback={<FallbackVolume scale={object.scale} />}>
          <Suspense fallback={<FallbackVolume scale={object.scale} />}>
            <GLTFModel url={object.modelUrl} scale={object.scale} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <FallbackVolume scale={object.scale} />
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

  // Mirror drei's global loading progress into the store for the HUD.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const { active, progress } = (
        useGLTF as unknown as { preload: unknown }
      ) && LoaderState();
      setLoading(progress, active);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [setLoading]);

  return (
    <>
      {spawnedObjects.map((object) => (
        <SpawnedEntity key={object.id} object={object} />
      ))}
    </>
  );
}

// drei exposes loading state through its progress store
import { useProgress } from "@react-three/drei";
function LoaderState() {
  const { active, progress } = useProgress.getState();
  return { active, progress };
}
