import { useFrame } from "@react-three/fiber";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { useKeyboardControls, type ReactNode, useRef, useEffect } from "react";
import * as THREE from "three";
import { playerPosition, playerState } from "../state/playerTransform";
import { useGameConfigStore } from "../store/useGameConfigStore";
import { useEditorStore } from "../store/useEditorStore";

export interface GameplayCharacterControllerProps {
  position?: [number, number, number];
  children?: ReactNode;
  firstPerson?: boolean;
  walkSpeed?: number;
  runSpeed?: number;
  jumpVelocity?: number;
  slopeMaxAngle?: number;
  airControl?: number;
  cameraDistance?: number;
}

const GameplayRig = (props: GameplayCharacterControllerProps) => {
  const body = useRef<EcctrlHandle>(null);
  const camera = useThreeSafeCamera();
  const [, getKeys] = useKeyboardControls();
  const firstPerson = props.firstPerson ?? useEditorStore.getState().cameraMode === "first";
  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(-0.2);
  const lastGrounded = useRef(false);
  const setPlaying = useGameConfigStore((s) => s.setPlaying);

  useEffect(() => {
    const onPointerLock = () => {
      if (document.pointerLockElement === null) setPlaying(false);
    };
    document.addEventListener("pointerlockchange", onPointerLock);
    return () => document.removeEventListener("pointerlockchange", onPointerLock);
  }, [setPlaying]);

  useFrame((_, dt) => {
    const controller = body.current;
    if (!controller) return;
    const keys = getKeys() as Record<string, boolean>;

    controller.setMovement({
      forward: !!keys.forward,
      backward: !!keys.backward,
      leftward: !!keys.leftward,
      rightward: !!keys.rightward,
      jump: !!keys.jump,
      run: !!keys.run,
    });

    const position = controller.currPos;
    const grounded = Math.abs(position.y - Math.round(position.y)) < 0.04;
    const airFactor = grounded ? 1 : Math.min(1, props.airControl ?? 0.35);

    if (airFactor < 1 && controller.setMovement) {
      controller.setMovement({
        forward: !!keys.forward,
        backward: !!keys.backward,
        leftward: !!keys.leftward,
        rightward: !!keys.rightward,
        jump: false,
        run: !!keys.run,
      });
    }

    lastGrounded.current = grounded;
    playerPosition.set(position.x, position.y, position.z);
    playerState.active = true;

    if (camera) {
      const target = new THREE.Vector3(position.x, position.y + 0.5, position.z);
      const distance = firstPerson ? 0 : (props.cameraDistance ?? 6);
      const desired = new THREE.Vector3(
        position.x + Math.sin(yawRef.current) * distance,
        position.y + 1.2 - Math.sin(pitchRef.current) * distance,
        position.z + Math.cos(yawRef.current) * distance,
      );
      camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
      camera.lookAt(target);
    }
  });

  return (
    <Ecctrl
      ref={body}
      position={props.position ?? [0, 3, 0]}
      maxWalkVel={props.walkSpeed ?? 3}
      maxRunVel={props.runSpeed ?? 6}
      jumpVel={props.jumpVelocity ?? 5}
      autoBalance
    >
      {props.children}
    </Ecctrl>
  );
};

function useThreeSafeCamera() {
  // Lazy import avoids making the gameplay wrapper own the entire viewport setup.
  // The concrete camera is acquired from R3F when this component is rendered.
  const { useThree } = require("@react-three/fiber") as typeof import("@react-three/fiber");
  return useThree((state) => state.camera);
}

export function GameplayCharacterController(props: GameplayCharacterControllerProps) {
  return <GameplayRig {...props} />;
}
