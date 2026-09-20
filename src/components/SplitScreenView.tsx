import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameConfigStore } from "../store/useGameConfigStore";
import { playerPosition } from "../state/playerTransform";
import { getGamepadInput, startGamepadPolling, stopGamepadPolling } from "../input/gamepadState";
import { useEffect } from "react";
import { useColyseusClient, type PlayerInputData } from "../hooks/useColyseusClient";

const SPLIT_COLORS = ["#b6f36a", "#6ad1f3", "#f3a76a", "#d06af3"];

interface SplitPlayerState {
  position: THREE.Vector3;
  yaw: number;
}

const localPlayers: SplitPlayerState[] = [
  { position: new THREE.Vector3(0, 1, 0), yaw: 0 },
  { position: new THREE.Vector3(-4, 1, 4), yaw: 0 },
  { position: new THREE.Vector3(4, 1, 4), yaw: 0 },
  { position: new THREE.Vector3(0, 1, 7), yaw: Math.PI },
];

function playerPositionFor(index: number) {
  if (index === 0) return new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
  return localPlayers[index].position;
}

function GamepadActors({ count }: { count: number }) {
  const actorRefs = useRef<Array<THREE.Group | null>>([]);

  useEffect(() => {
    if (count < 2) return;
    const stop = startGamepadPolling(count);
    return () => {
      stop();
      stopGamepadPolling();
    };
  }, [count]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (let player = 2; player <= count; player += 1) {
      const state = localPlayers[player - 1];
      const input = getGamepadInput(player);
      if (!input.connected) continue;

      const speed = input.sprint ? 5.5 : 3.2;
      state.position.x += input.moveX * speed * dt;
      state.position.z += input.moveY * speed * dt;
      state.position.x = THREE.MathUtils.clamp(state.position.x, -18, 18);
      state.position.z = THREE.MathUtils.clamp(state.position.z, -18, 18);

      if (Math.abs(input.moveX) + Math.abs(input.moveY) > 0.05) {
        state.yaw = Math.atan2(input.moveX, input.moveY);
      }
    }

    for (let player = 2; player <= count; player += 1) {
      const state = localPlayers[player - 1];
      actorRefs.current[player - 2]?.position.copy(state.position);
      actorRefs.current[player - 2]?.rotation.set(0, state.yaw, 0);
    }
  });

  return (
    <>
      {Array.from({ length: count - 1 }, (_, offset) => {
        const player = offset + 2;
        const state = localPlayers[player - 1];
        return (
          <group
            key={"split-player-" + player}
            ref={(group) => {
              actorRefs.current[player - 2] = group;
            }}
            position={state.position}>
            <mesh castShadow>
              <capsuleGeometry args={[0.3, 0.75, 6, 16]} />
              <meshStandardMaterial
                color={SPLIT_COLORS[player - 1]}
                emissive={SPLIT_COLORS[player - 1]}
                emissiveIntensity={0.28}
                roughness={0.45}
                metalness={0.25}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function sendGamepadInput(count: number, sendInput: (input: PlayerInputData) => boolean) {
  for (let player = 2; player <= count; player += 1) {
    const input = getGamepadInput(player);
    if (!input.connected) continue;
    sendInput({
      up: input.moveY < -0.12,
      down: input.moveY > 0.12,
      left: input.moveX < -0.12,
      right: input.moveX > 0.12,
      jump: input.jump,
      attack: input.attack,
      sprint: input.sprint,
      analogX: input.moveX,
      analogY: input.moveY,
    });
  }
}

export function SplitScreenSceneActors() {
  const multiplayerMode = useGameConfigStore((s) => s.multiplayerMode);
  const playerCount = useGameConfigStore((s) => s.localPlayerCount);
  const isPlaying = useGameConfigStore((s) => s.isPlaying);
  if (!isPlaying || multiplayerMode !== "split-screen") return null;
  return (
    <GamepadActors count={playerCount} />
  );
}

export function SplitScreenRenderer() {
  const multiplayerMode = useGameConfigStore((s) => s.multiplayerMode);
  const playerCount = useGameConfigStore((s) => s.localPlayerCount);
  const isPlaying = useGameConfigStore((s) => s.isPlaying);
  const { gl, scene } = useThree();
  const cameraRefs = useRef<Array<THREE.PerspectiveCamera | null>>([]);

  useFrame(() => {
    if (!isPlaying || multiplayerMode !== "split-screen") return;

    const count = Math.max(2, Math.min(4, playerCount));
    const drawWidth = gl.domElement.width;
    const drawHeight = gl.domElement.height;
    const columns = count <= 2 ? count : 2;
    const rows = Math.ceil(count / columns);
    const cellWidth = drawWidth / columns;
    const cellHeight = drawHeight / rows;

    gl.autoClear = false;
    gl.setScissorTest(false);
    gl.setClearColor("#080a08", 1);
    gl.clear(true, true, true);
    gl.setScissorTest(true);

    for (let index = 0; index < count; index += 1) {
      const camera = cameraRefs.current[index];
      if (!camera) continue;

      const col = index % columns;
      const row = Math.floor(index / columns);
      const viewportWidth = cellWidth;
      const playerPos = playerPositionFor(index);
      camera.position.set(
        playerPos.x,
        playerPos.y + 3.8,
        playerPos.z + 5.8,
      );
      camera.lookAt(playerPos.x, playerPos.y + 0.8, playerPos.z);
      camera.aspect = viewportWidth / cellHeight;
      camera.updateProjectionMatrix();

      const x = col * cellWidth;
      const y = drawHeight - (row + 1) * cellHeight;

      gl.setViewport(x, y, viewportWidth, cellHeight);
      gl.setScissor(x, y, viewportWidth, cellHeight);
      gl.render(scene, camera);
    }

    gl.setScissorTest(false);
    gl.setViewport(0, 0, drawWidth, drawHeight);
  }, 1);

  if (!isPlaying || multiplayerMode !== "split-screen") return null;

  return (
    <>
      {Array.from({ length: playerCount }, (_, index) => (
        <perspectiveCamera
          key={"split-camera-" + index}
          ref={(camera) => {
            cameraRefs.current[index] = camera;
          }}
          fov={55}
          near={0.1}
          far={500}
        />
      ))}
    </>
  );
}

export function SplitScreenInputBridge() {
  const multiplayerMode = useGameConfigStore((s) => s.multiplayerMode);
  const playerCount = useGameConfigStore((s) => s.localPlayerCount);
  const isPlaying = useGameConfigStore((s) => s.isPlaying);
  const { sendPlayerInput } = useColyseusClient();

  useEffect(() => {
    if (!isPlaying || multiplayerMode !== "split-screen" || playerCount < 2) return;

    const tick = window.setInterval(() => {
      sendGamepadInput(playerCount, sendPlayerInput);
    }, 50);

    return () => window.clearInterval(tick);
  }, [isPlaying, multiplayerMode, playerCount, sendPlayerInput]);

  return null;
}
