import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useEditorStore } from "../../store/useEditorStore";
import { useGameConfigStore } from "../../store/useGameConfigStore";
import { playerPosition, playerState } from "../../state/playerTransform";
import { sendPlayerInput } from "../../hooks/useColyseusClient";
import { useGameplayControlStore } from "../../store/useGameplayControlStore";

/* ------------------------------------------------------------------ */
/* Keyboard map — WASD + space to jump + shift to run                  */
/* ------------------------------------------------------------------ */

export const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
  { name: "interact", keys: ["KeyE"] },
  { name: "crouch", keys: ["KeyC"] },
  { name: "attack", keys: ["KeyF"] },
  { name: "release", keys: ["KeyQ"] },
];

export function PlayerKeyboardProvider({ children }: { children: ReactNode }) {
  return <KeyboardControls map={keyboardMap}>{children}</KeyboardControls>;
}

/* ------------------------------------------------------------------ */
/* Mouse look — pointer lock driven yaw / pitch                        */
/* ------------------------------------------------------------------ */

function useMouseLook(enabled: boolean) {
  const gl = useThree((s) => s.gl);
  const look = useRef({ yaw: Math.PI, pitch: -0.25 });

  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;

    const onClick = () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      look.current.yaw -= e.movementX * 0.0022;
      look.current.pitch = THREE.MathUtils.clamp(
        look.current.pitch - e.movementY * 0.0022,
        -1.2,
        1.1,
      );
    };

    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }, [enabled, gl]);

  return look;
}

/* ------------------------------------------------------------------ */
/* Avatar — hidden in first person                                     */
/* ------------------------------------------------------------------ */

function Avatar({ visible }: { visible: boolean }) {
  return (
    <group visible={visible}>
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 0.7, 6, 16]} />
        <meshStandardMaterial color="#8fb87a" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.35, -0.28]}>
        <boxGeometry args={[0.2, 0.08, 0.12]} />
        <meshStandardMaterial
          color="#b6f36a"
          emissive="#7ee34a"
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Controller: feeds input to Ecctrl + drives the camera rig           */
/* ------------------------------------------------------------------ */

const camTarget = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const forwardDir = new THREE.Vector3();

function ControllerRig() {
  const characterRef = useRef<EcctrlHandle>(null);
  const [, getKeys] = useKeyboardControls();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const isPlaying = useGameConfigStore((s) => s.isPlaying);
  const activeActorId = useGameplayControlStore((s) => s.activeActorId);
  const multiplayerMode = useGameConfigStore((s) => s.multiplayerMode);
  const setPlaying = useGameConfigStore((s) => s.setPlaying);
  const cameraMode = useEditorStore((s) => s.cameraMode);
  const firstPerson = cameraMode === "first";
  const look = useMouseLook(isPlaying && !activeActorId);
  const inputSendAccumulator = useRef(0);

  useEffect(() => {
    if (!isPlaying || activeActorId) return;
    const canvas = gl.domElement;
    const requestLock = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.().catch(() => undefined);
      }
    };
    const onPointerLockChange = () => {
      if (document.pointerLockElement !== canvas) setPlaying(false);
    };

    requestLock();
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, [gl, isPlaying, setPlaying]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const body = characterRef.current;
    if (!body || activeActorId) return;

    const keys = getKeys() as Record<string, boolean>;
    body.setMovement({
      forward: !!keys["forward"],
      backward: !!keys["backward"],
      leftward: !!keys["leftward"],
      rightward: !!keys["rightward"],
      jump: !!keys["jump"],
      run: !!keys["run"],
    });

    const { yaw, pitch } = look.current;

    // Movement is camera relative: forward is where the camera looks.
    forwardDir.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    body.setForwardDir(forwardDir);

    const pos = body.currPos;
    camTarget.set(pos.x, pos.y + 0.45, pos.z);

    // Publish for local camera focus and split-screen camera tracking.
    playerPosition.set(pos.x, pos.y, pos.z);
    playerState.yaw = yaw;
    playerState.active = true;
    inputSendAccumulator.current += delta;
    if (
      (multiplayerMode === "online" || multiplayerMode === "online-coop") &&
      inputSendAccumulator.current >= 0.05
    ) {
      inputSendAccumulator.current = 0;
      sendPlayerInput({
        up: !!keys["forward"],
        down: !!keys["backward"],
        left: !!keys["leftward"],
        right: !!keys["rightward"],
        jump: !!keys["jump"],
        attack: false,
        sprint: !!keys["run"],
        analogX: Number(!!keys["rightward"]) - Number(!!keys["leftward"]),
        analogY: Number(!!keys["backward"]) - Number(!!keys["forward"]),
      });
    }

    if (firstPerson) {
      camera.position.lerp(camTarget, 1 - Math.exp(-30 * delta));
      camera.lookAt(
        camTarget.x - Math.sin(yaw) * Math.cos(pitch),
        camTarget.y + Math.sin(pitch),
        camTarget.z - Math.cos(yaw) * Math.cos(pitch),
      );
    } else {
      const dist = 6.5;
      camDesired.set(
        camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist,
        camTarget.y + 1.1 - Math.sin(pitch) * dist,
        camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist,
      );
      camera.position.lerp(camDesired, 1 - Math.exp(-10 * delta));
      camera.lookAt(camTarget);
    }
  });

  return (
    <Ecctrl
      ref={characterRef}
      position={[5, 3, 5]}
      capsuleRadius={0.3}
      capsuleHalfHeight={0.35}
      maxWalkVel={2.6}
      maxRunVel={5}
      jumpVel={4.6}
      autoBalance
    >
      <Avatar visible={!firstPerson} />
    </Ecctrl>
  );
}

export function PlayerController() {
  return <ControllerRig />;
}
