import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import type { RapierRigidBody } from "@react-three/rapier";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { gameplayEventBus } from "../../gameplay/GameplayEventBus";
import type { SpawnedObject } from "../../store/useEditorStore";
import { useGameConfigStore } from "../../store/useGameConfigStore";
import { useGameplayControlStore } from "../../store/useGameplayControlStore";
import { playFirstRegisteredAnimation } from "../../lib/animationRegistry";

interface GameplayActorProps {
  object: SpawnedObject;
  bodyRef: RefObject<RapierRigidBody | null>;
  children: ReactNode;
}

export function GameplayActor({
  object,
  bodyRef,
  children,
}: GameplayActorProps) {
  const root = useRef<THREE.Group>(null);

  if (object.gameplay.archetype === "vehicle") {
    return (
      <group ref={root}>
        <VehicleGameplay object={object} bodyRef={bodyRef} />
        {children}
      </group>
    );
  }

  if (object.gameplay.archetype === "humanoid") {
    return (
      <group ref={root}>
        <HumanoidGameplay object={object} bodyRef={bodyRef} />
        {children}
      </group>
    );
  }

  if (
    object.gameplay.capabilities.includes("door_open") &&
    object.gameplay.archetype === "building"
  ) {
    return (
      <group ref={root}>
        <BuildingDoorGameplay object={object} />
        {children}
      </group>
    );
  }

  return <group ref={root}>{children}</group>;
}

function VehicleGameplay({
  object,
  bodyRef,
}: {
  object: SpawnedObject;
  bodyRef: React.RefObject<RapierRigidBody | null>;
}) {
  const [, getKeys] = useKeyboardControls();
  const camera = useThree((state) => state.camera);
  const isPlaying = useGameConfigStore((state) => state.isPlaying);
  const activeActorId = useGameplayControlStore((state) => state.activeActorId);
  const setActiveActor = useGameplayControlStore((state) => state.setActiveActor);
  const clearActiveActor = useGameplayControlStore((state) => state.clearActiveActor);

  const [doorsOpen, setDoorsOpen] = useState(false);
  const lastInteract = useRef(false);
  const yaw = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!object.gameplay.autoControl || activeActorId) return;
    setActiveActor(object.id, "vehicle");
    initialized.current = true;
    return () => {
      if (initialized.current) clearActiveActor(object.id);
    };
  }, [activeActorId, clearActiveActor, object.gameplay.autoControl, object.id, setActiveActor]);

  useFrame((_, rawDelta) => {
    const body = bodyRef.current;
    if (!body || !isPlaying || activeActorId !== object.id) return;

    const dt = Math.min(0.05, Math.max(0, rawDelta));
    const keys = getKeys() as Record<string, boolean>;
    const forwardInput =
      Number(Boolean(keys.forward)) - Number(Boolean(keys.backward));
    const steerInput =
      Number(Boolean(keys.rightward)) - Number(Boolean(keys.leftward));

    const interactPressed = Boolean(keys.interact) && !lastInteract.current;
    lastInteract.current = Boolean(keys.interact);

    if (interactPressed && object.gameplay.capabilities.includes("door_open")) {
      setDoorsOpen((value) => !value);
      gameplayEventBus.emit("onGameplayCommand", {
        command: "VehicleDoorsToggled",
        payload: { entityId: object.id, open: !doorsOpen },
      });
    }

    const rotation = body.rotation();
    if (!initialized.current) {
      yaw.current = Math.atan2(
        2 * (rotation.w * rotation.y + rotation.x * rotation.z),
        1 - 2 * (rotation.y * rotation.y + rotation.z * rotation.z),
      );
      initialized.current = true;
    }
    const q = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize();
    const velocity = body.linvel();
    const velocityVector = new THREE.Vector3(velocity.x, velocity.y, velocity.z);

    const longitudinal = velocityVector.dot(forward);
    const lateral = velocityVector.dot(right);
    const targetSpeed = forwardInput * 18;
    const acceleration = forwardInput === 0 ? 4.5 : 10;
    const nextLongitudinal = THREE.MathUtils.damp(
      longitudinal,
      targetSpeed,
      acceleration,
      dt,
    );
    const lateralGrip = Boolean(keys.space) ? 5 : 12;

    const nextVelocity = forward
      .clone()
      .multiplyScalar(nextLongitudinal)
      .add(
        right
          .clone()
          .multiplyScalar(
            THREE.MathUtils.damp(lateral, 0, lateralGrip, dt),
          ),
      );

    body.setLinvel(
      {
        x: nextVelocity.x,
        y: velocity.y,
        z: nextVelocity.z,
      },
      true,
    );

    const steeringAuthority =
      Math.min(1, Math.abs(longitudinal) / 4) *
      (forwardInput >= 0 ? 1 : -1);
    yaw.current +=
      steerInput *
      steeringAuthority *
      1.7 *
      dt;

    const newRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw.current,
    );

    body.setRotation(
      {
        x: newRotation.x,
        y: newRotation.y,
        z: newRotation.z,
        w: newRotation.w,
      },
      true,
    );

    const position = body.translation();
    camera.position.lerp(
      new THREE.Vector3(
        position.x - forward.x * 6 + right.x * 2,
        position.y + 3,
        position.z - forward.z * 6 + right.z * 2,
      ),
      1 - Math.exp(-6 * dt),
    );
    camera.lookAt(
      position.x + forward.x * 3,
      position.y + 0.8,
      position.z + forward.z * 3,
    );
  });

  return (
    <>
      <VehicleFallbackDoors
        visible={doorsOpen}
        object={object}
      />
    </>
  );
}

function VehicleFallbackDoors({
  visible,
  object,
}: {
  visible: boolean;
  object: SpawnedObject;
}) {
  if (!object.gameplay.capabilities.includes("door_open")) return null;

  const width = Math.max(1, object.scale[0] * 1.8);
  const height = Math.max(0.55, object.scale[1] * 0.7);

  return (
    <group visible={visible}>
      <DoorProxy position={[-width * 0.32, height * 0.55, 0]} />
      <DoorProxy position={[width * 0.32, height * 0.55, 0]} />
    </group>
  );
}

function DoorProxy({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.55, 0.8, 0.04]} />
      <meshPhysicalMaterial
        color="#1b2022"
        metalness={0.72}
        roughness={0.2}
        clearcoat={0.7}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

function HumanoidGameplay({
  object,
  bodyRef,
}: {
  object: SpawnedObject;
  bodyRef: React.RefObject<RapierRigidBody | null>;
}) {
  const [, getKeys] = useKeyboardControls();
  const camera = useThree((state) => state.camera);
  const isPlaying = useGameConfigStore((state) => state.isPlaying);
  const activeActorId = useGameplayControlStore((state) => state.activeActorId);
  const setActiveActor = useGameplayControlStore((state) => state.setActiveActor);
  const clearActiveActor = useGameplayControlStore((state) => state.clearActiveActor);
  const [crouched, setCrouched] = useState(false);
  const previousAttack = useRef(false);
  const previousJump = useRef(false);
  const previousCrouch = useRef(false);
  const currentAnimation = useRef("");

  useEffect(() => {
    if (!object.gameplay.autoControl || activeActorId) return;
    setActiveActor(object.id, "humanoid");
    return () => clearActiveActor(object.id);
  }, [activeActorId, clearActiveActor, object.gameplay.autoControl, object.id, setActiveActor]);

  useFrame((_, rawDelta) => {
    const body = bodyRef.current;
    if (!body || !isPlaying || activeActorId !== object.id) return;

    const dt = Math.min(0.05, Math.max(0, rawDelta));
    const keys = getKeys() as Record<string, boolean>;
    const moving =
      Boolean(keys.forward) ||
      Boolean(keys.backward) ||
      Boolean(keys.leftward) ||
      Boolean(keys.rightward);

    const crouchPressed = Boolean(keys.crouch) && !previousCrouch.current;
    previousCrouch.current = Boolean(keys.crouch);

    if (crouchPressed && object.gameplay.capabilities.includes("crouch")) {
      setCrouched((value) => !value);
    }

    const attackPressed = Boolean(keys.attack) && !previousAttack.current;
    previousAttack.current = Boolean(keys.attack);

    const jumpPressed = Boolean(keys.jump) && !previousJump.current;
    previousJump.current = Boolean(keys.jump);

    if (
      attackPressed &&
      object.gameplay.capabilities.includes("fight")
    ) {
      const played = playFirstRegisteredAnimation(
        object.id,
        ["Attack", "Punch", "Fight", "Combat", "Melee"],
      );
      gameplayEventBus.emit("onGameplayCommand", {
        command: "CharacterAttack",
        payload: {
          entityId: object.id,
          animationPlayed: played,
        },
      });
    }

    const velocity = body.linvel();
    const speed = crouched ? 1.6 : 3.8;
    const forward = new THREE.Vector3(
      Number(Boolean(keys.rightward)) - Number(Boolean(keys.leftward)),
      0,
      Number(Boolean(keys.forward)) - Number(Boolean(keys.backward)),
    );
    forward.normalize();

    const target = forward.multiplyScalar(speed);
    const nextX = THREE.MathUtils.damp(velocity.x, target.x, 12, dt);
    const nextZ = THREE.MathUtils.damp(velocity.z, target.z, 12, dt);

    if (jumpPressed && Math.abs(velocity.y) < 1.2) {
      body.setLinvel({ x: nextX, y: 5.6, z: nextZ }, true);
      playFirstRegisteredAnimation(object.id, ["Jump", "Jumping"]);
    } else {
      body.setLinvel({ x: nextX, y: velocity.y, z: nextZ }, true);
    }

    const animation = attackPressed
      ? "Attack"
      : crouched
        ? "Crouch"
        : moving
          ? keys.run
            ? "Run"
            : "Walk"
          : "Idle";

    if (animation !== currentAnimation.current) {
      const aliases =
        animation === "Walk"
          ? ["Walk", "Walking", "Locomotion"]
          : animation === "Run"
            ? ["Run", "Running", "Sprint"]
            : animation === "Crouch"
              ? ["Crouch", "Crouching"]
              : ["Idle", "Idle_01", "Breathing"];
      if (playFirstRegisteredAnimation(object.id, aliases)) {
        currentAnimation.current = animation;
      }
    }

    if (moving) {
      const heading = Math.atan2(target.x, target.z);
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        heading,
      );
      body.setRotation(
        {
          x: q.x,
          y: q.y,
          z: q.z,
          w: q.w,
        },
        true,
      );
    }

    const pos = body.translation();
    camera.position.lerp(
      new THREE.Vector3(pos.x, pos.y + (crouched ? 1.1 : 1.8) + 2.8, pos.z + 5),
      1 - Math.exp(-8 * dt),
    );
    camera.lookAt(pos.x, pos.y + (crouched ? 0.8 : 1.2), pos.z);
  });

  return null;
}

function BuildingDoorGameplay({
  object,
}: {
  object: SpawnedObject;
}) {
  const [, getKeys] = useKeyboardControls();
  const [open, setOpen] = useState(false);
  const previousInteract = useRef(false);

  useFrame(() => {
    const keys = getKeys() as Record<string, boolean>;
    const pressed = Boolean(keys.interact) && !previousInteract.current;
    previousInteract.current = Boolean(keys.interact);
    if (pressed) {
      setOpen((value) => !value);
      gameplayEventBus.emit("onGameplayCommand", {
        command: "BuildingDoorToggled",
        payload: { entityId: object.id, open: !open },
      });
    }
  });

  return (
    <group rotation={[0, open ? -Math.PI / 2 : 0, 0]}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1.2, 2.1, 0.08]} />
        <meshPhysicalMaterial
          color="#4a3324"
          metalness={0.1}
          roughness={0.48}
          clearcoat={0.2}
        />
      </mesh>
    </group>
  );
}
