import { Environment, Sky } from "@react-three/drei";
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
      p.setZ(i, (broad * 0.65 + detail) * mountainHeight);
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
      <Environment preset="park" environmentIntensity={timeOfDay > 7 && timeOfDay < 19 ? 0.75 : 0.35} />
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
