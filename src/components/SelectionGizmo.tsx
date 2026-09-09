import { TransformControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useEditorStore } from "../store/useEditorStore";

/**
 * Transform gizmo. Drives a lightweight proxy object rather than the physics
 * body directly; on drag end the transform is committed to the store, which
 * teleports the Rapier body and rebuilds its collider when scale changes.
 *
 * Only mounted while an entity is explicitly selected.
 */
export function SelectionGizmo() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const mode = useEditorStore((s) => s.transformMode);
  const object = useEditorStore((s) =>
    s.spawnedObjects.find((o) => o.id === s.selectedId),
  );
  const updateObject = useEditorStore((s) => s.updateObject);
  const proxy = useRef<THREE.Object3D>(new THREE.Object3D());

  useEffect(() => {
    if (!object) return;
    proxy.current.position.fromArray(object.position);
    proxy.current.rotation.fromArray(object.rotation as unknown as [number, number, number]);
    proxy.current.scale.fromArray(object.scale);
  }, [object]);

  if (!selectedId || !object) return null;

  return (
    <>
      <primitive object={proxy.current} />
      <TransformControls
        object={proxy.current}
        mode={mode}
        size={0.8}
        onMouseUp={() => {
          const p = proxy.current;
          updateObject(selectedId, {
            position: [p.position.x, p.position.y, p.position.z],
            rotation: [p.rotation.x, p.rotation.y, p.rotation.z],
            scale: [
              Math.max(0.05, p.scale.x),
              Math.max(0.05, p.scale.y),
              Math.max(0.05, p.scale.z),
            ],
          });
        }}
      />
    </>
  );
}
