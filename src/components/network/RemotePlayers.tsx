import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useSceneStore, type NetworkEntity } from "../../store/useSceneStore";

function RemoteEntity({ entity }: { entity: NetworkEntity }) {
  const group = useRef<THREE.Group>(null);
  const smoothed = useRef(
    new THREE.Vector3(entity.position[0], entity.position[1], entity.position[2]),
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const current = group.current;
    if (!current) return;

    const target = new THREE.Vector3(
      entity.position[0],
      entity.position[1],
      entity.position[2],
    );
    const blend = 1 - Math.exp(-12 * delta);
    smoothed.current.lerp(target, blend);
    current.position.copy(smoothed.current);

    let dYaw = entity.rotationY - current.rotation.y;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    current.rotation.y += dYaw * blend;
  });

  const isBoss = entity.type === "boss";
  const scale = isBoss ? 1.8 : 1;

  return (
    <group ref={group} scale={scale}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={isBoss ? [0.5, 1.0, 8, 20] : [0.3, 0.7, 6, 16]} />
        <meshStandardMaterial
          color={entity.color}
          emissive={entity.color}
          emissiveIntensity={isBoss ? 1.2 : 0.55}
          metalness={isBoss ? 0.65 : 0.4}
          roughness={isBoss ? 0.24 : 0.35}
        />
      </mesh>
      {isBoss && (
        <mesh position={[0, 1.1, 0]}>
          <torusGeometry args={[0.7, 0.05, 8, 32]} />
          <meshStandardMaterial
            color={entity.color}
            emissive={entity.color}
            emissiveIntensity={2}
          />
        </mesh>
      )}
      <Html center distanceFactor={12} position={[0, isBoss ? 2.25 : 1.05, 0]} zIndexRange={[5, 0]}>
        <span className="whitespace-nowrap rounded-full border border-primary/30 bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-foreground/80 backdrop-blur">
          {entity.name}
        </span>
      </Html>
    </group>
  );
}

export function RemotePlayers() {
  const networkEntities = useSceneStore((s) => s.networkEntities);
  return (
    <>
      {networkEntities.map((entity) => (
        <RemoteEntity key={entity.id} entity={entity} />
      ))}
    </>
  );
}
