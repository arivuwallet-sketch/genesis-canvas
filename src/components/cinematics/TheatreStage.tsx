import { SheetProvider, editable } from "@theatre/r3f";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGameConfigStore } from "../../store/useGameConfigStore";
import { theatreSheet } from "../../lib/theatre";

function samplePath(
  points: Array<{ time: number; position: [number, number, number]; lookAt: [number, number, number] }>,
  time: number,
) {
  if (points.length === 0) {
    return { position: [0, 4, 10] as [number, number, number], lookAt: [0, 1, 0] as [number, number, number] };
  }
  if (time <= points[0]!.time) return { position: points[0]!.position, lookAt: points[0]!.lookAt };
  const last = points[points.length - 1]!;
  if (time >= last.time) return { position: last.position, lookAt: last.lookAt };

  for (let i = 1; i < points.length; i++) {
    const next = points[i]!;
    const previous = points[i - 1]!;
    if (time > next.time) continue;
    const span = Math.max(0.001, next.time - previous.time);
    const t = Math.max(0, Math.min(1, (time - previous.time) / span));
    return {
      position: [
        THREE.MathUtils.lerp(previous.position[0], next.position[0], t),
        THREE.MathUtils.lerp(previous.position[1], next.position[1], t),
        THREE.MathUtils.lerp(previous.position[2], next.position[2], t),
      ] as [number, number, number],
      lookAt: [
        THREE.MathUtils.lerp(previous.lookAt[0], next.lookAt[0], t),
        THREE.MathUtils.lerp(previous.lookAt[1], next.lookAt[1], t),
        THREE.MathUtils.lerp(previous.lookAt[2], next.lookAt[2], t),
      ] as [number, number, number],
    };
  }
  return last;
}

export function TheatreStage() {
  const open = useGameConfigStore((state) => state.cinematicsOpen);
  const cutscene = useGameConfigStore((state) => state.cutsceneData);
  const camera = useRef<THREE.PerspectiveCamera | null>(null);

  useFrame(() => {
    if (!open || !cutscene || !camera.current) return;
    const time = Math.max(0, Math.min(cutscene.duration, theatreSheet.sequence.position));
    const sample = samplePath(cutscene.cameraPath, time);
    camera.current.position.set(...sample.position);
    camera.current.lookAt(...sample.lookAt);
  });

  if (!open) return null;

  const initial = cutscene?.cameraPath[0] ?? {
    time: 0,
    position: [0, 4, 10] as [number, number, number],
    lookAt: [0, 1, 0] as [number, number, number],
  };

  return (
    <SheetProvider sheet={theatreSheet}>
      <editable.perspectiveCamera
        ref={camera}
        theatreKey="AI Cutscene Camera"
        makeDefault
        position={initial.position}
        fov={55}
      />
    </SheetProvider>
  );
}
