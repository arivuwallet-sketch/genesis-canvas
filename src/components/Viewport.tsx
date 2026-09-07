import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Grid } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Suspense } from "react";
import { PhysicsWorld } from "./PhysicsWorld";
import { useEditorStore } from "../store/useEditorStore";

export function Viewport() {
  const showPerf = useEditorStore((s) => s.showPerf);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [9, 7, 12], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#080a08"]} />
      <fog attach="fog" args={["#080a08", 30, 90]} />

      {showPerf && <Perf position="top-left" />}

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Suspense fallback={null}>
        <Environment>
          <Lightformer intensity={2} position={[0, 8, 0]} scale={[12, 12, 1]} />
          <Lightformer
            intensity={1.2}
            color="#b6f36a"
            position={[-8, 3, -2]}
            rotation-y={Math.PI / 2}
            scale={[20, 3, 1]}
          />
          <Lightformer
            intensity={0.8}
            color="#5f8fa8"
            position={[8, 2, 4]}
            rotation-y={-Math.PI / 2}
            scale={[20, 3, 1]}
          />
        </Environment>

        <PhysicsWorld />
      </Suspense>

      <Grid
        position={[0, 0.01, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#1f2a1c"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#7ee34a"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid
      />
      <axesHelper args={[4]} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
