import { DEFAULT_POST_EFFECTS, type PostEffectSettings } from "./WebGpuPostEffects";

export interface RenderQualityState {
  tier: "fallback" | "balanced" | "extreme";
  effects: PostEffectSettings;
  targetFrameMs: number;
}

export class RenderQualityController {
  private state: RenderQualityState = {
    tier: "balanced",
    effects: { ...DEFAULT_POST_EFFECTS },
    targetFrameMs: 16.67,
  };

  getState() {
    return this.state;
  }

  update(frameMs: number, dt = 1 / 60) {
    const target = this.state.targetFrameMs;
    let tier = this.state.tier;

    if (frameMs > target * 1.35) tier = "fallback";
    else if (frameMs > target * 1.1) tier = "balanced";
    else if (frameMs < target * 0.82) tier = "extreme";

    const effects = { ...this.state.effects };

    if (tier === "fallback") {
      effects.ssgiRadius *= 0.92;
      effects.ssgiIntensity *= 0.95;
      effects.volumetricDensity *= 0.9;
      effects.taaFeedback = Math.min(0.96, effects.taaFeedback + 0.01);
    } else if (tier === "extreme") {
      effects.ssgiRadius = Math.min(3, effects.ssgiRadius * 1.04);
      effects.ssgiIntensity = Math.min(1.5, effects.ssgiIntensity * 1.02);
      effects.volumetricDensity = Math.min(0.04, effects.volumetricDensity * 1.03);
    }

    const clampedDt = Math.min(0.2, Math.max(0, dt));
    effects.exposure += (1 - effects.exposure) * Math.min(1, clampedDt * effects.autoExposureSpeed);

    this.state = { ...this.state, tier, effects };
  }
}
