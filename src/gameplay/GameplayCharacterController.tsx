import { useFrame, useThree } from "@react-three/fiber";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { useKeyboardControls } from "@react-three/drei";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { playerPosition, playerState } from "../state/playerTransform";
import { useGameConfigStore } from "../store/useGameConfigStore";
import { useEditorStore } from "../store/useEditorStore";
import { gameplayEventBus } from "./GameplayEventBus";

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
  cameraHeight?: number;
  enabled?: boolean;
}

const GameplayRig = (props: GameplayCharacterControllerProps) => {
  const body = useRef<EcctrlHandle>(null);
  const camera = useThree((state) => state.camera);
  const [, getKeys] = useKeyboardControls();
  const isPlaying = useGameConfigStore((state) => state.isPlaying);
  const setPlaying = useGameConfigStore((state) => state.setPlaying);
  const firstPerson = props.firstPerson ?? useEditorStore((state) => state.cameraMode === "first");
  const lastGrounded = useRef(false);

  useEffect(() => {
    const onPointerLock = () => {
      if (document.pointerLockElement === null && isPlaying) {
        setPlaying(false);
      }
    };
    document.addEventListener("pointerlockchange", onPointerLock);
    return () => document.removeEventListener("pointerlockchange", onPointerLock);
  }, [isPlaying, setPlaying]);

  useFrame((_, dt) => {
    const controller = body.current;
    if (!controller || props.enabled === false) return;

    const keys = getKeys() as Record<string, boolean>;
    controller.setMovement({
      forward: !!keys.forward,
      backward: !!keys.backward,
      leftward: !!keys.leftward,
      rightward: !!keys.rightward,
      jump: !!keys.jump,
      run: !!keys.run,
    });

    const grounded = controller.isOnGround;
    if (grounded !== lastGrounded.current) {
      gameplayEventBus.emit("onTriggerEntered", {
        entityId: "player_1",
        triggerId: grounded ? "grounded" : "airborne",
      });
      lastGrounded.current = grounded;
    }

    const position = controller.currPos;
    playerPosition.set(position.x, position.y, position.z);
    playerState.active = true;

    const target = new THREE.Vector3(
      position.x,
      position.y + (props.cameraHeight ?? 0.55),
      position.z,
    );
    const distance = firstPerson ? 0 : props.cameraDistance ?? 6;
    const desired = new THREE.Vector3(
      position.x,
      position.y + (props.cameraHeight ?? 0.55) + 1.05,
      position.z + distance,
    );

    if (distance > 0) {
      camera.position.lerp(desired, 1 - Math.exp(-10 * Math.min(dt, 0.05)));
    } else {
      camera.position.lerp(target, 1 - Math.exp(-18 * Math.min(dt, 0.05)));
    }
    camera.lookAt(target);

    if (controller.movingDirection.lengthSq() > 0.001) playerState.yaw = Math.atan2(controller.movingDirection.x, controller.movingDirection.z);
  });

  return (
    <Ecctrl
      ref={body}
      position={props.position ?? [0, 3, 0]}
      enable={props.enabled !== false}
      maxWalkVel={props.walkSpeed ?? 3}
      maxRunVel={props.runSpeed ?? 6}
      jumpVel={props.jumpVelocity ?? 5}
      airDragFactor={props.airControl ?? 0.35}
      slopeMaxAngle={props.slopeMaxAngle ?? Math.PI / 3}
      groundDetection="shapeCast"
      autoBalance
    >
      {props.children}
    </Ecctrl>
  );
};

export function GameplayCharacterController(props: GameplayCharacterControllerProps) {
  return <GameplayRig {...props} />;
}
