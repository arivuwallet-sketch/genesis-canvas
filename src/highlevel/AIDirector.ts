import type {
  DirectorConfig,
  DirectorPhase,
  DirectorSnapshot,
  PlayerStressTelemetry,
  SpawnIntent,
} from "./MacroTypes";

export const DEFAULT_DIRECTOR_CONFIG: DirectorConfig = {
  healthWeight: 0.34,
  ammoWeight: 0.18,
  damageWeight: 0.2,
  recencyWeight: 0.12,
  enemyPressureWeight: 0.16,
  maxStress: 1,
  criticalStress: 0.82,
  hordeThreshold: 0.34,
  reliefThreshold: 0.68,
  cycleSeconds: 54,
  minPhaseSeconds: 8,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function calculatePlayerStress(
  telemetry: PlayerStressTelemetry,
  config: DirectorConfig = DEFAULT_DIRECTOR_CONFIG,
): number {
  const healthStress =
    1 -
    clamp01(telemetry.health / Math.max(1, telemetry.maxHealth));
  const ammoStress =
    1 -
    clamp01(telemetry.ammo / Math.max(1, telemetry.maxAmmo));
  const damageStress = clamp01(
    telemetry.recentDamage / Math.max(1, telemetry.damageWindowSeconds),
  );
  const combatRecencyStress = 1 - clamp01(telemetry.timeSinceCombatSeconds / 24);
  const enemyPressure = clamp01(telemetry.enemiesNearby / 8);

  return clamp01(
    healthStress * config.healthWeight +
      ammoStress * config.ammoWeight +
      damageStress * config.damageWeight +
      combatRecencyStress * config.recencyWeight +
      enemyPressure * config.enemyPressureWeight,
  );
}

export function getPacingPhase(
  cycleTimeSeconds: number,
  currentPhase: DirectorPhase,
  phaseAgeSeconds: number,
  config: DirectorConfig = DEFAULT_DIRECTOR_CONFIG,
): DirectorPhase {
  const t = ((cycleTimeSeconds % config.cycleSeconds) + config.cycleSeconds) % config.cycleSeconds;
  const phase = t / config.cycleSeconds;

  if (phase < 0.42) return phaseAgeSeconds >= config.minPhaseSeconds ? "BuildUp" : currentPhase;
  if (phase < 0.7) return phaseAgeSeconds >= config.minPhaseSeconds ? "PeakAction" : currentPhase;
  return phaseAgeSeconds >= config.minPhaseSeconds ? "Relief" : currentPhase;
}

export function calculateDirectorSnapshot(
  elapsedSeconds: number,
  phaseAgeSeconds: number,
  telemetry: PlayerStressTelemetry,
  previousPhase: DirectorPhase = "BuildUp",
  config: DirectorConfig = DEFAULT_DIRECTOR_CONFIG,
): DirectorSnapshot {
  const stressScore = calculatePlayerStress(telemetry, config);
  const phase = getPacingPhase(elapsedSeconds, previousPhase, phaseAgeSeconds, config);
  const cycle =
    ((elapsedSeconds % config.cycleSeconds) + config.cycleSeconds) %
    config.cycleSeconds;
  const phaseProgress = cycle / config.cycleSeconds;

  const sineTension = (Math.sin((phaseProgress * Math.PI * 2) - Math.PI / 2) + 1) / 2;
  const intensity = clamp01(
    phase === "PeakAction"
      ? Math.max(sineTension, stressScore)
      : phase === "Relief"
        ? stressScore * 0.55
        : Math.max(stressScore * 0.8, sineTension * 0.75),
  );

  return {
    stressScore,
    phase,
    phaseProgress,
    intensity,
    actionCooldownSeconds: Math.max(0, config.minPhaseSeconds - phaseAgeSeconds),
  };
}

export function chooseSpawnIntent(
  snapshot: DirectorSnapshot,
): SpawnIntent | null {
  if (snapshot.stressScore >= DEFAULT_DIRECTOR_CONFIG.criticalStress) {
    return {
      kind: "SpawnSafeRoom",
      spawnPool: "director_relief_safe_room",
      budget: 1,
      reason: "CriticalStress",
    };
  }

  if (
    snapshot.phase === "Relief" &&
    snapshot.stressScore <= DEFAULT_DIRECTOR_CONFIG.hordeThreshold
  ) {
    return {
      kind: "SpawnHorde",
      spawnPool: "director_high_threat_horde",
      budget: Math.max(1, Math.round(3 + snapshot.intensity * 8)),
      reason: "LowStress",
    };
  }

  if (
    snapshot.phase === "Relief" &&
    snapshot.stressScore > DEFAULT_DIRECTOR_CONFIG.hordeThreshold &&
    snapshot.stressScore < snapshot.stressScore
  ) {
    return {
      kind: "SpawnSupplies",
      spawnPool: "director_relief_supplies",
      budget: 1,
      reason: "Relief",
    };
  }

  return null;
}

export class AIDirectorEngine {
  private elapsedSeconds = 0;
  private phaseAgeSeconds = 0;
  private phase: DirectorPhase = "BuildUp";
  private snapshot: DirectorSnapshot = {
    stressScore: 0,
    phase: "BuildUp",
    phaseProgress: 0,
    intensity: 0,
    actionCooldownSeconds: 0,
  };

  constructor(private readonly config: DirectorConfig = DEFAULT_DIRECTOR_CONFIG) {}

  update(deltaSeconds: number, telemetry: PlayerStressTelemetry): DirectorSnapshot {
    const delta = Math.max(0, Math.min(deltaSeconds, 0.25));
    this.elapsedSeconds += delta;

    const previous = this.phase;
    this.snapshot = calculateDirectorSnapshot(
      this.elapsedSeconds,
      this.phaseAgeSeconds,
      telemetry,
      this.phase,
      this.config,
    );

    if (this.snapshot.phase !== previous) {
      this.phase = this.snapshot.phase;
      this.phaseAgeSeconds = 0;
      this.snapshot = calculateDirectorSnapshot(
        this.elapsedSeconds,
        this.phaseAgeSeconds,
        telemetry,
        this.phase,
        this.config,
      );
    } else {
      this.phaseAgeSeconds += delta;
    }

    return this.snapshot;
  }
}
