using System;
using UnityEngine;

namespace Genesis.HighLevel
{
    public sealed class GenesisAIDirectorManager : MonoBehaviour
    {
        public static GenesisAIDirectorManager Instance { get; private set; }

        [Header("Stress Weights")]
        [SerializeField] private float healthWeight = 0.34f;
        [SerializeField] private float ammoWeight = 0.18f;
        [SerializeField] private float damageWeight = 0.20f;
        [SerializeField] private float recencyWeight = 0.12f;
        [SerializeField] private float enemyPressureWeight = 0.16f;

        [Header("Pacing")]
        [SerializeField] private float cycleSeconds = 54f;
        [SerializeField] private float minPhaseSeconds = 8f;
        [SerializeField] private float criticalStress = 0.82f;
        [SerializeField] private float hordeThreshold = 0.34f;
        [SerializeField] private float reliefThreshold = 0.68f;
        [SerializeField] private float actionCooldownSeconds = 10f;

        public PlayerStressTelemetry Telemetry { get; private set; }
        public DirectorSnapshot Snapshot { get; private set; }
        public event Action<DirectorSnapshot> DirectorUpdated;
        public event Action<SpawnIntent> SpawnIntentRaised;

        private float elapsed;
        private float phaseAge;
        private float cooldown;
        private DirectorPhase phase = DirectorPhase.BuildUp;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            Telemetry = new PlayerStressTelemetry
            {
                health = 100,
                maxHealth = 100,
                ammo = 100,
                maxAmmo = 100,
                damageWindowSeconds = 10,
                timeSinceCombatSeconds = 30
            };
        }

        public void SetTelemetry(PlayerStressTelemetry telemetry)
        {
            Telemetry = telemetry;
        }

        public void Tick(float deltaSeconds)
        {
            var delta = Mathf.Clamp(deltaSeconds, 0f, 0.25f);
            elapsed += delta;
            phaseAge += delta;
            cooldown = Mathf.Max(0f, cooldown - delta);

            float stress = CalculateStress(Telemetry);
            DirectorPhase nextPhase = CalculatePhase(elapsed, phaseAge);

            if (nextPhase != phase)
            {
                phase = nextPhase;
                phaseAge = 0f;
            }

            float cycleT = Mathf.Repeat(elapsed, cycleSeconds) / Mathf.Max(0.01f, cycleSeconds);
            float sineTension = (Mathf.Sin(cycleT * Mathf.PI * 2f - Mathf.PI / 2f) + 1f) * 0.5f;

            float intensity = phase switch
            {
                DirectorPhase.PeakAction => Mathf.Max(sineTension, stress),
                DirectorPhase.Relief => stress * 0.55f,
                _ => Mathf.Max(stress * 0.8f, sineTension * 0.75f)
            };

            Snapshot = new DirectorSnapshot
            {
                stressScore = stress,
                phase = phase,
                phaseProgress = cycleT,
                intensity = Mathf.Clamp01(intensity),
                actionCooldownSeconds = cooldown
            };

            DirectorUpdated?.Invoke(Snapshot);

            if (cooldown <= 0f && TryChooseIntent(Snapshot, out var intent))
            {
                cooldown = actionCooldownSeconds;
                SpawnIntentRaised?.Invoke(intent);
            }
        }

        public float CalculateStress(PlayerStressTelemetry telemetry)
        {
            float healthStress = 1f - Mathf.Clamp01(telemetry.health / Mathf.Max(1f, telemetry.maxHealth));
            float ammoStress = 1f - Mathf.Clamp01(telemetry.ammo / Mathf.Max(1f, telemetry.maxAmmo));
            float damageStress = Mathf.Clamp01(
                telemetry.recentDamage / Mathf.Max(1f, telemetry.damageWindowSeconds));
            float recencyStress = 1f - Mathf.Clamp01(telemetry.timeSinceCombatSeconds / 24f);
            float pressureStress = Mathf.Clamp01(telemetry.enemiesNearby / 8f);

            return Mathf.Clamp01(
                healthStress * healthWeight +
                ammoStress * ammoWeight +
                damageStress * damageWeight +
                recencyStress * recencyWeight +
                pressureStress * enemyPressureWeight);
        }

        private DirectorPhase CalculatePhase(float time, float currentPhaseAge)
        {
            if (currentPhaseAge < minPhaseSeconds)
                return phase;

            float normalized = Mathf.Repeat(time, cycleSeconds) / Mathf.Max(0.01f, cycleSeconds);

            if (normalized < 0.42f) return DirectorPhase.BuildUp;
            if (normalized < 0.70f) return DirectorPhase.PeakAction;
            return DirectorPhase.Relief;
        }

        private bool TryChooseIntent(DirectorSnapshot snapshot, out SpawnIntent intent)
        {
            if (snapshot.stressScore >= criticalStress)
            {
                intent = new SpawnIntent
                {
                    kind = SpawnIntentKind.SpawnSafeRoom,
                    spawnPool = "director_relief_safe_room",
                    budget = 1,
                    reason = "CriticalStress"
                };
                return true;
            }

            if (snapshot.stressScore <= hordeThreshold)
            {
                intent = new SpawnIntent
                {
                    kind = SpawnIntentKind.SpawnHorde,
                    spawnPool = "director_high_threat_horde",
                    budget = Mathf.Max(1, Mathf.RoundToInt(3f + snapshot.intensity * 8f)),
                    reason = "LowStress"
                };
                return true;
            }

            if (snapshot.phase == DirectorPhase.Relief &&
                snapshot.stressScore > hordeThreshold &&
                snapshot.stressScore < reliefThreshold)
            {
                intent = new SpawnIntent
                {
                    kind = SpawnIntentKind.SpawnSupplies,
                    spawnPool = "director_relief_supplies",
                    budget = 1,
                    reason = "Relief"
                };
                return true;
            }

            intent = default;
            return false;
        }
    }
}
