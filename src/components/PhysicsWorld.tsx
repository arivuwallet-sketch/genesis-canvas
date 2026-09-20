import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { AssetLoader } from "./AssetLoader";
import { PlayerController } from "./player/PlayerController";
import { useEditorStore } from "../store/useEditorStore";
import { useGraphicsStore } from "../store/useGraphicsStore";
import { useGameConfigStore } from "../store/useGameConfigStore";


function RealisticGround({ detailed }: { detailed: boolean }) {
  const texture = useMemo(() => {
    if (!detailed || typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = 34 + Math.floor(Math.random() * 24);
      image.data[i] = n;
      image.data[i + 1] = n + 4;
      image.data[i + 2] = n + 2;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(18, 18);
    t.anisotropy = 8;
    return t;
  }, [detailed]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <mesh position={[0, -0.25, 0]} receiveShadow>
      <boxGeometry args={[40, 0.5, 40]} />
      <meshStandardMaterial
        map={texture ?? undefined}
        color={detailed ? "#596052" : "#14181a"}
        roughness={0.9}
        metalness={0.02}
      />
    </mesh>
  );
}

export function PhysicsWorld({ children }: { children?: ReactNode }) {
  const playerEnabled = useEditorStore((s) => s.playerEnabled);
  const isPlaying = useGameConfigStore((s) => s.isPlaying);
  const quality = useGraphicsStore((s) => s.textureQuality);

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

      {(playerEnabled || isPlaying) && <PlayerController />}

      {children}
    </Physics>
  );
}
