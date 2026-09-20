const clamp01 = (value) => Math.min(1, Math.max(0, value));

const DEFAULT_CONFIG = {
  healthWeight: 0.34,
  ammoWeight: 0.18,
  damageWeight: 0.20,
  recencyWeight: 0.12,
  enemyPressureWeight: 0.16,
  criticalStress: 0.82,
  hordeThreshold: 0.34,
  reliefThreshold: 0.68,
  cycleSeconds: 54,
  minPhaseSeconds: 8,
  actionCooldownSeconds: 10,
};

export class MacroDirector {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.elapsed = 0;
    this.phaseAge = 0;
    this.phase = "BuildUp";
    this.cooldown = 0;
  }

  calculateStress(t) {
    const c = this.config;
    const health = 1 - clamp01(t.health / Math.max(1, t.maxHealth));
    const ammo = 1 - clamp01(t.ammo / Math.max(1, t.maxAmmo));
    const damage = clamp01(t.recentDamage / Math.max(1, t.damageWindowSeconds));
    const recency = 1 - clamp01(t.timeSinceCombatSeconds / 24);
    const enemies = clamp01(t.enemiesNearby / 8);

    return clamp01(
      health * c.healthWeight +
      ammo * c.ammoWeight +
      damage * c.damageWeight +
      recency * c.recencyWeight +
      enemies * c.enemyPressureWeight,
    );
  }

  update(deltaSeconds, telemetry) {
    const delta = Math.min(0.25, Math.max(0, deltaSeconds));
    this.elapsed += delta;
    this.phaseAge += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);

    if (this.phaseAge >= this.config.minPhaseSeconds) {
      const cycle = ((this.elapsed % this.config.cycleSeconds) + this.config.cycleSeconds) %
        this.config.cycleSeconds;
      const normalized = cycle / this.config.cycleSeconds;
      const next = normalized < 0.42
        ? "BuildUp"
        : normalized < 0.70
          ? "PeakAction"
          : "Relief";
      if (next !== this.phase) {
        this.phase = next;
        this.phaseAge = 0;
      }
    }

    const stress = this.calculateStress(telemetry);
    const cycle = ((this.elapsed % this.config.cycleSeconds) + this.config.cycleSeconds) %
      this.config.cycleSeconds;
    const phaseProgress = cycle / this.config.cycleSeconds;
    const sineTension = (Math.sin(phaseProgress * Math.PI * 2 - Math.PI / 2) + 1) * 0.5;

    const intensity = clamp01(
      this.phase === "PeakAction"
        ? Math.max(sineTension, stress)
        : this.phase === "Relief"
          ? stress * 0.55
          : Math.max(stress * 0.8, sineTension * 0.75),
    );

    const snapshot = {
      stressScore: stress,
      phase: this.phase,
      phaseProgress,
      intensity,
      actionCooldownSeconds: this.cooldown,
    };

    let intent = null;
    if (this.cooldown <= 0) {
      if (stress >= this.config.criticalStress) {
        intent = {
          kind: "SpawnSafeRoom",
          spawnPool: "director_relief_safe_room",
          budget: 1,
          reason: "CriticalStress",
        };
      } else if (stress <= this.config.hordeThreshold) {
        intent = {
          kind: "SpawnHorde",
          spawnPool: "director_high_threat_horde",
          budget: Math.max(1, Math.round(3 + intensity * 8)),
          reason: "LowStress",
        };
      } else if (
        this.phase === "Relief" &&
        stress < this.config.reliefThreshold
      ) {
        intent = {
          kind: "SpawnSupplies",
          spawnPool: "director_relief_supplies",
          budget: 1,
          reason: "Relief",
        };
      }

      if (intent) this.cooldown = this.config.actionCooldownSeconds;
    }

    return { snapshot: { ...snapshot, actionCooldownSeconds: this.cooldown }, intent };
  }
}
