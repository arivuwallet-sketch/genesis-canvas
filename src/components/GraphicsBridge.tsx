import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  useGraphicsStore,
  UPSCALE_FACTOR,
  SHADOW_MAP_SIZE,
} from "../store/useGraphicsStore";

/**
 * Lives inside the <Canvas> and pushes graphics-store values into the live
 * renderer: camera fov/far, render scale (dpr), shadow map resolution,
 * anisotropic filtering and volumetric-ish fog density.
 */
export function GraphicsBridge() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const setDpr = useThree((s) => s.setDpr);

  const fov = useGraphicsStore((s) => s.fov);
  const drawDistance = useGraphicsStore((s) => s.drawDistance);
  const resolution = useGraphicsStore((s) => s.resolution);
  const upscaling = useGraphicsStore((s) => s.upscaling);
  const shadowQuality = useGraphicsStore((s) => s.shadowQuality);
  const shadowsEnabled = useGraphicsStore((s) => s.shadowsEnabled);
  const anisotropicFiltering = useGraphicsStore((s) => s.anisotropicFiltering);
  const volumetricFog = useGraphicsStore((s) => s.volumetricFog);
  const rayTracing = useGraphicsStore((s) => s.rayTracing);

  /* camera */
  useEffect(() => {
    if (!camera.isPerspectiveCamera) return;
    camera.fov = fov;
    camera.far = drawDistance;
    camera.updateProjectionMatrix();
  }, [camera, fov, drawDistance]);

  /* render scale / upscaling */
  useEffect(() => {
    const base = Math.min(window.devicePixelRatio || 1, 2);
    setDpr(Math.max(0.4, base * resolution * UPSCALE_FACTOR[upscaling]));
  }, [setDpr, resolution, upscaling]);

  /* shadows */
  useEffect(() => {
    gl.shadowMap.enabled = shadowsEnabled;
    const size = SHADOW_MAP_SIZE[shadowQuality];
    scene.traverse((obj) => {
      const light = obj as THREE.DirectionalLight;
      if (light.isDirectionalLight && light.shadow) {
        light.castShadow = shadowsEnabled;
        light.shadow.mapSize.set(size, size);
        light.shadow.map?.dispose();
        light.shadow.map = null as unknown as THREE.WebGLRenderTarget;
        light.shadow.needsUpdate = true;
      }
    });
    gl.shadowMap.needsUpdate = true;
  }, [gl, scene, shadowQuality, shadowsEnabled]);

  /* anisotropic filtering + reflection strength ("ray tracing" approximation) */
  useEffect(() => {
    const max = gl.capabilities?.getMaxAnisotropy?.() ?? 1;
    const aniso = Math.min(anisotropicFiltering, max);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std?.map) {
          std.map.anisotropy = aniso;
          std.map.needsUpdate = true;
        }
        if (std && "envMapIntensity" in std) {
          std.envMapIntensity = rayTracing ? 2.2 : 1;
          std.needsUpdate = true;
        }
      }
    });
  }, [gl, scene, anisotropicFiltering, rayTracing]);

  /* volumetric-ish atmospheric fog */
  useEffect(() => {
    scene.fog = volumetricFog
      ? new THREE.FogExp2("#080a08", 0.018)
      : new THREE.Fog("#080a08", 40, Math.max(60, drawDistance * 0.5));
  }, [scene, volumetricFog, drawDistance]);

  return null;
}
