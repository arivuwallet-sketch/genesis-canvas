import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Grid } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { PhysicsWorld } from "./PhysicsWorld";
import { PlayerKeyboardProvider } from "./player/PlayerController";
import { useEditorStore } from "../store/useEditorStore";
import { Effects } from "./Effects";
import { SelectionGizmo } from "./SelectionGizmo";
import { RemotePlayers } from "./network/RemotePlayers";
import { DiagnosticsProbe } from "./hud/Diagnostics";

export function Viewport() {
  const showPerf = useEditorStore((s) => s.showPerf);
  const playerEnabled = useEditorStore((s) => s.playerEnabled);
  const webgpuEnabled = useEditorStore((s) => s.webgpuEnabled);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const setRendererLabel = useEditorStore((s) => s.setRendererLabel);

  /**
   * WebGPU renderer with an automatic WebGL2 fallback: if `three/webgpu`
   * fails to import or the adapter request fails, we silently construct the
   * classic WebGLRenderer instead so older devices keep rendering.
   */
  const glFactory = useMemo(() => {
    if (!webgpuEnabled) return undefined;
    return async (props: Record<string, unknown>) => {
      try {
        if (typeof navigator === "undefined" || !("gpu" in navigator))
          throw new Error("navigator.gpu unavailable");
        const mod = (await import("three/webgpu")) as unknown as {
          WebGPURenderer: new (p: unknown) => THREE.WebGLRenderer & {
            init: () => Promise<void>;
          };
        };
        const renderer = new mod.WebGPURenderer({ ...props, antialias: true });
        await renderer.init();
        setRendererLabel("WebGPU");
        return renderer as unknown as THREE.WebGLRenderer;
      } catch (error) {
        console.warn("[Viewport] WebGPU unavailable, falling back to WebGL2", error);
        setRendererLabel("WebGL2 (fallback)");
        return new THREE.WebGLRenderer({
          ...(props as THREE.WebGLRendererParameters),
          antialias: true,
        });
      }
    };
  }, [webgpuEnabled, setRendererLabel]);

  return (
    <Canvas
      key={webgpuEnabled ? "webgpu" : "webgl"}
      shadows
      dpr={[1, 2]}
      camera={{ position: [9, 7, 12], fov: 50 }}
      onPointerMissed={() => setSelectedId(null)}
      {...(glFactory ? { gl: glFactory } : { gl: { antialias: true } })}
    >
      <color attach="background" args={["#080a08"]} />
      <fog attach="fog" args={["#080a08", 30, 90]} />

      {showPerf && <Perf position="top-left" />}

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Suspense fallback={null}>
        <Environment>
          <Lightformer intensity={5} position={[0, 8, 0]} scale={[16, 16, 1]} />
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
      </Suspense>

      <Suspense fallback={null}>
        <PlayerKeyboardProvider>
          <PhysicsWorld />
        </PlayerKeyboardProvider>
      </Suspense>

      <Suspense fallback={null}>
        <RemotePlayers />
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

      <DiagnosticsProbe />
      {/* The pmndrs post stack is WebGL-only; WebGPU renders unprocessed. */}
      {!webgpuEnabled && <Effects />}

      {!playerEnabled && <SelectionGizmo />}

      {!playerEnabled && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 1, 0]}
        />
      )}
    </Canvas>
  );
}
