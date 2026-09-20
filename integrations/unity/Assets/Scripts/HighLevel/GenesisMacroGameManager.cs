using System;
using UnityEngine;

namespace Genesis.HighLevel
{
    public sealed class GenesisMacroGameManager : MonoBehaviour
    {
        public static GenesisMacroGameManager Instance { get; private set; }

        [Serializable]
        public sealed class Rules
        {
            public float timeLimitMinutes = 20f;
            public int targetScore = 1000;
            public bool extractionRequired = true;
            public bool lossOnDeath = true;
            public bool artifactRequired = true;
        }

        public enum LoopStatus
        {
            Active,
            Won,
            Lost,
            Extracted
        }

        public Rules GameRules = new();
        public MacroWorldState World { get; private set; } = new();
        public MetaProgressionState Meta { get; private set; } = new();
        public LoopStatus Status { get; private set; } = LoopStatus.Active;
        public int Score { get; private set; }
        public bool PlayerAlive { get; private set; } = true;
        public bool ArtifactSecured { get; private set; }
        public bool Extracted { get; private set; }

        public event Action<LoopStatus> StatusChanged;
        public event Action<int> ScoreChanged;
        public event Action<MetaProgressionState> MetaChanged;

        private GenesisAIDirectorManager director;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
            World.timeLimitMinutes = GameRules.timeLimitMinutes;
            World.timeRemainingSeconds = GameRules.timeLimitMinutes * 60f;
        }

        private void Start()
        {
            director = GenesisAIDirectorManager.Instance;
        }

        private void Update()
        {
            float delta = Mathf.Min(Time.deltaTime, 0.25f);

            if (Status != LoopStatus.Active)
                return;

            World.timeRemainingSeconds = Mathf.Max(0f, World.timeRemainingSeconds - delta);
            director?.Tick(delta);

            EvaluateRules();
        }

        public void ConfigureRules(Rules rules)
        {
            GameRules = rules ?? new Rules();
            World.timeLimitMinutes = GameRules.timeLimitMinutes;
            World.timeRemainingSeconds = GameRules.timeLimitMinutes * 60f;
            Score = 0;
            Status = LoopStatus.Active;
            PlayerAlive = true;
            Extracted = false;
            ArtifactSecured = false;
            StatusChanged?.Invoke(Status);
        }

        public void AddScore(int delta)
        {
            Score = Mathf.Max(0, Score + delta);
            ScoreChanged?.Invoke(Score);
            EvaluateRules();
        }

        public void SetPlayerAlive(bool value)
        {
            PlayerAlive = value;
            EvaluateRules();
        }

        public void SetArtifactSecured(bool value)
        {
            ArtifactSecured = value;
        }

        public void SetExtracted(bool value)
        {
            Extracted = value;
            EvaluateRules();
        }

        public void CompleteExtraction(int currency, int xp)
        {
            Extracted = true;
            Meta.currency += Mathf.Max(0, currency);
            Meta.xp += Mathf.Max(0, xp);
            Meta.extractionStreak++;
            MetaChanged?.Invoke(Meta);
            EvaluateRules();
        }

        public void AwardPersistentLoot(string itemId, int quantity)
        {
            if (string.IsNullOrWhiteSpace(itemId) || quantity <= 0)
                return;

            if (!Meta.persistentInventory.ContainsKey(itemId))
                Meta.persistentInventory[itemId] = 0;

            Meta.persistentInventory[itemId] += quantity;
            MetaChanged?.Invoke(Meta);
        }

        private void EvaluateRules()
        {
            bool won =
                Extracted &&
                Score >= GameRules.targetScore &&
                (!GameRules.extractionRequired || Extracted) &&
                (!GameRules.artifactRequired || ArtifactSecured);

            bool lost =
                (GameRules.lossOnDeath && !PlayerAlive) ||
                (!won && World.timeRemainingSeconds <= 0f);

            LoopStatus next = won
                ? LoopStatus.Won
                : lost
                    ? LoopStatus.Lost
                    : Extracted
                        ? LoopStatus.Extracted
                        : LoopStatus.Active;

            if (next == Status)
                return;

            Status = next;
            StatusChanged?.Invoke(Status);
        }
    }
}
