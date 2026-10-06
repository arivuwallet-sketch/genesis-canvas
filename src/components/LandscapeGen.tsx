import { Environment, Lightformer, Sky } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { useGameConfigStore } from "../store/useGameConfigStore";

export function LandscapeGen() {
  const timeOfDay = useGameConfigStore((state) => state.timeOfDay);
  const roughness = useGameConfigStore((state) => state.terrain.roughness);
  const mountainHeight = useGameConfigStore((state) => state.terrain.mountainHeight);
  const biomeColor = useGameConfigStore((state) => state.terrain.biomeColor);

  const sun = useMemo(() => {
    const radians = ((timeOfDay - 6) / 24) * Math.PI * 2;
    const elevation = Math.sin(radians);
    const horizontal = Math.cos(radians);
    return {
      position: [horizontal * 30, Math.max(3, elevation * 34), 18 * Math.sin(radians + 0.8)] as [number, number, number],
      intensity: THREE.MathUtils.lerp(0.18, 2.2, Math.max(0, elevation)),
      color: new THREE.Color().setHSL(
        THREE.MathUtils.lerp(0.06, 0.12, Math.max(0, elevation)),
        0.45,
        THREE.MathUtils.lerp(0.35, 0.68, Math.max(0, elevation)),
      ),
    };
  }, [timeOfDay]);

  const geometry = useMemo(() => {
    const size = 70;
    const segments = 96;
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    const p = g.attributes.position;
    const denom = Math.max(0.15, roughness);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const broad = Math.sin(x * 0.12 * denom) * Math.cos(y * 0.1 * denom);
      const detail =
        Math.sin(x * 0.37 + y * 0.19) * 0.32 +
        Math.cos(x * 0.23 - y * 0.41) * 0.18;
      // Keep the central build/play area flat; hills rise only beyond it.
      const edge = THREE.MathUtils.smoothstep(Math.hypot(x, y), 21, 34);
      p.setZ(i, (broad * 0.65 + detail) * mountainHeight * edge - (1 - edge) * 0.05);
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [mountainHeight, roughness]);

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={sun.position}
        turbidity={timeOfDay > 7 && timeOfDay < 19 ? 7 : 12}
        rayleigh={timeOfDay > 7 && timeOfDay < 19 ? 2 : 0.7}
      />
      {/* Local studio lighting — a CDN preset hangs the whole scene when its fetch fails. */}
      <Environment environmentIntensity={timeOfDay > 7 && timeOfDay < 19 ? 0.9 : 0.4}>
        <Lightformer intensity={2.5} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer intensity={1.2} color="#cfe3ff" position={[-8, 2, -2]} rotation-y={Math.PI / 2} scale={[24, 3, 1]} />
        <Lightformer intensity={1} color="#ffe2c2" position={[8, 2, 2]} rotation-y={-Math.PI / 2} scale={[24, 3, 1]} />
      </Environment>
      <directionalLight
        position={sun.position}
        intensity={sun.intensity}
        color={sun.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <ambientLight intensity={timeOfDay > 7 && timeOfDay < 19 ? 0.48 : 0.12} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} geometry={geometry} receiveShadow>
        <meshStandardMaterial color={biomeColor} roughness={0.96} metalness={0.02} />
      </mesh>
    </>
  );
}
