import {
  Bloom,
  DepthOfField,
  EffectComposer,
  SMAA,
  SSAO,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEditorStore } from "../store/useEditorStore";
import { playerPosition } from "../state/playerTransform";

/**
 * Cinematic post stack. Effects are gated by the Graphics Quality preset so
 * the frame budget stays under ~16 ms on weaker GPUs.
 *
 *  low    → SMAA + subtle bloom            (no SSAO, no DoF)
 *  medium → SMAA + bloom + SSAO
 *  ultra  → SMAA + bloom + SSAO + DoF
 */
export function Effects() {
  const quality = useEditorStore((s) => s.graphicsQuality);

  const ssao = quality !== "low";
  const dof = quality === "ultra";

  return (
    <EffectComposer
      key={quality}
      multisampling={0}
      enableNormalPass={ssao}
      depthBuffer
    >
      <Bloom
        intensity={quality === "low" ? 0.5 : 1.15}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.25}
        mipmapBlur
        radius={0.72}
      />
      {ssao ? (
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={quality === "ultra" ? 24 : 12}
          rings={4}
          radius={0.16}
          intensity={quality === "ultra" ? 22 : 14}
          luminanceInfluence={0.55}
          worldDistanceThreshold={24}
          worldDistanceFalloff={4}
          worldProximityThreshold={4}
          worldProximityFalloff={1}
        />
      ) : (
        <></>
      )}
      {dof ? (
        <DepthOfField
          target={playerPosition}
          focalLength={0.035}
          bokehScale={2.6}
          worldFocusRange={9}
        />
      ) : (
        <></>
      )}
      <SMAA />
    </EffectComposer>
  );
}
