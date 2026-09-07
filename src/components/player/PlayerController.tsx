import { KeyboardControls, type KeyboardControlsEntry } from "@react-three/drei";
import { Ecctrl } from "ecctrl";
import { useMemo } from "react";
import { useEditorStore } from "../../store/useEditorStore";

export const keyboardMap: KeyboardControlsEntry[] = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

/** Simple capsule avatar — hidden in first person. */
function Avatar({ visible }: { visible: boolean }) {
  return (
    <group visible={visible}>
      <mesh castShadow position={[0, 0.1, 0]}>
        <capsuleGeometry args={[0.3, 0.7, 6, 16]} />
        <meshStandardMaterial color="#b6f36a" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0.22]}>
        <boxGeometry args={[0.18, 0.08, 0.12]} />
        <meshStandardMaterial
          color="#7ee34a"
          emissive="#7ee34a"
          emissiveIntensity={1.6}
        />
      </mesh>
    </group>
  );
}

export function PlayerController() {
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const firstPerson = cameraMode === "first";

  // Remount Ecctrl when the perspective changes so the camera rig resets.
  const key = useMemo(() => `ecctrl-${cameraMode}`, [cameraMode]);

  return (
    <KeyboardControls map={keyboardMap}>
      <Ecctrl
        key={key}
        position={[4, 3, 4]}
        capsuleRadius={0.3}
        capsuleHalfHeight={0.35}
        camInitDis={firstPerson ? -0.01 : -5}
        camMinDis={firstPerson ? -0.01 : -2}
        camMaxDis={firstPerson ? -0.01 : -10}
        camCollision={!firstPerson}
        maxVelLimit={5}
        jumpVel={4.5}
        followLight={false}
      >
        <Avatar visible={!firstPerson} />
      </Ecctrl>
    </KeyboardControls>
  );
}
