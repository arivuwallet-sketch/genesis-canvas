import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { getRemotePlayers } from "../../network/socketClient";
import { useNetworkRoster } from "./useRoster";

/**
 * One remote avatar. Network packets arrive at ~8-15 Hz; the mesh is lerped
 * toward the latest target every frame so motion reads as continuous.
 */
function RemoteAvatar({ id }: { id: string }) {
  const group = useRef<THREE.Group>(null);
  const color = getRemotePlayers().get(id)?.color ?? "#6ad1f3";
  const name = getRemotePlayers().get(id)?.name ?? id;

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const peer = getRemotePlayers().get(id);
    const g = group.current;
    if (!peer || !g) return;

    // Frame-rate independent smoothing toward the last received transform.
    const t = 1 - Math.exp(-12 * delta);
    const [tx, ty, tz] = peer.target.position;
    g.position.lerp(_tmp.set(tx, ty, tz), t);

    let dYaw = peer.target.yaw - g.rotation.y;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    g.rotation.y += dYaw * t;

    peer.current.position = [g.position.x, g.position.y, g.position.z];
    peer.current.yaw = g.rotation.y;
  });

  return (
    <group ref={group}>
      <mesh castShadow>
        <capsuleGeometry args={[0.3, 0.7, 6, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>
      <Html center distanceFactor={12} position={[0, 1.05, 0]} zIndexRange={[5, 0]}>
        <span className="whitespace-nowrap rounded-full border border-primary/30 bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-foreground/80 backdrop-blur">
          {name}
        </span>
      </Html>
    </group>
  );
}

const _tmp = new THREE.Vector3();

export function RemotePlayers() {
  const roster = useNetworkRoster();
  return (
    <>
      {roster.map((id: string) => (
        <RemoteAvatar key={id} id={id} />
      ))}
    </>
  );
}
