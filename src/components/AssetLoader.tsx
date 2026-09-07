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

export function FallbackVolume({ scale = 1 }: { scale?: number }) {
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
/* GLTF model — DRACO + KTX2 enabled, BVH optimized                    */
/* ------------------------------------------------------------------ */

function GLTFModel({ url, scale }: { url: string; scale: number }) {
  const gl = useThree((s) => s.gl);
  const { scene } = useGLTF(url, true, true, (loader) => extendGLTFLoader(loader, gl));
  const cloned = useMemo(() => optimizeScene(skeletonClone(scene)), [scene]);

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

  // Mirror drei's global asset loading progress into the store for the HUD.
  useEffect(() => {
    setLoading(useProgress.getState().progress, useProgress.getState().active);
    return useProgress.subscribe((s) => setLoading(s.progress, s.active));
  }, [setLoading]);

  return (
    <>
      {spawnedObjects.map((object) => (
        <SpawnedEntity key={object.id} object={object} />
      ))}
    </>
  );
}
