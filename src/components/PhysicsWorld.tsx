import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense, type ReactNode } from "react";
import { AssetLoader } from "./AssetLoader";
import { PlayerController } from "./player/PlayerController";
import { useEditorStore } from "../store/useEditorStore";

export function PhysicsWorld({ children }: { children?: ReactNode }) {
  const playerEnabled = useEditorStore((s) => s.playerEnabled);

  return (
    <Physics gravity={[0, -9.81, 0]}>
      {/* Static floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.25, 0]} receiveShadow>
          <boxGeometry args={[40, 0.5, 40]} />
          <meshStandardMaterial color="#14181a" roughness={0.85} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Reference metallic cube — verifies physics on load */}
      <RigidBody
        position={[0, 6, 0]}
        rotation={[0.4, 0.6, 0.2]}
        colliders="cuboid"
        restitution={0.35}
        friction={0.8}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#9aa5a0" metalness={1} roughness={0.18} />
        </mesh>
      </RigidBody>

      {/* Everything the AI/chat bridge has spawned */}
      <Suspense fallback={null}>
        <AssetLoader />
      </Suspense>

      {playerEnabled && <PlayerController />}

      {children}
    </Physics>
  );
}
