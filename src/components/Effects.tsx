import {
  Bloom,
  ToneMapping,
  DepthOfField,
  EffectComposer,
  SMAA,
  SSAO,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
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
        intensity={quality === "low" ? 0.35 : 0.75}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.25}
        mipmapBlur
        radius={0.72}
      />
      {ssao ? (
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={quality === "ultra" ? 21 : 12}
          rings={4}
          radius={0.08}
          intensity={quality === "ultra" ? 12 : 8}
          luminanceInfluence={0.6}
          bias={0.03}
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
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
