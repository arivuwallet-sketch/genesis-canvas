import {
  Bloom,
  ToneMapping,
  DepthOfField,
  EffectComposer,
  FXAA,
  SMAA,
  SSAO,
  TiltShift2,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useEditorStore } from "../store/useEditorStore";
import { useGraphicsStore } from "../store/useGraphicsStore";
import { playerPosition } from "../state/playerTransform";

/**
 * Post stack driven by the graphics settings menu. Every effect is mounted
 * conditionally so disabled passes cost nothing, and the legacy quality
 * preset still tunes sample counts for the frame budget.
 */
export function Effects() {
  const quality = useEditorStore((s) => s.graphicsQuality);
  const bloom = useGraphicsStore((s) => s.bloom);
  const bloomIntensity = useGraphicsStore((s) => s.bloomIntensity);
  const ssao = useGraphicsStore((s) => s.ambientOcclusion);
  const dof = useGraphicsStore((s) => s.depthOfField);
  const motionBlur = useGraphicsStore((s) => s.motionBlur);
  const aa = useGraphicsStore((s) => s.antiAliasing);

  const key = `${quality}-${bloom}-${ssao}-${dof}-${motionBlur}-${aa}`;

  return (
    <EffectComposer key={key} multisampling={0} enableNormalPass={ssao}>
      {bloom ? (
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.25}
          mipmapBlur
          radius={0.72}
        />
      ) : (
        <></>
      )}
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
      {motionBlur ? <TiltShift2 blur={0.12} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {aa === "smaa" ? <SMAA /> : aa === "fxaa" ? <FXAA /> : <></>}
    </EffectComposer>
  );
}
