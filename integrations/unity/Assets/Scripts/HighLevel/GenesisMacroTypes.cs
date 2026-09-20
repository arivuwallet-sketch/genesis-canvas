using System;
using System.Collections.Generic;

namespace Genesis.HighLevel
{
    public enum DirectorPhase
    {
        BuildUp,
        PeakAction,
        Relief
    }

    public enum SpawnIntentKind
    {
        SpawnHorde,
        SpawnSafeRoom,
        SpawnSupplies
    }

    public enum QuestObjectiveType
    {
        Fetch,
        Escort,
        Assassinate,
        Defend
    }

    [Serializable]
    public struct PlayerStressTelemetry
    {
        public float health;
        public float maxHealth;
        public float ammo;
        public float maxAmmo;
        public float recentDamage;
        public float damageWindowSeconds;
        public float timeSinceCombatSeconds;
        public int enemiesNearby;
    }

    [Serializable]
    public struct DirectorSnapshot
    {
        public float stressScore;
        public DirectorPhase phase;
        public float phaseProgress;
        public float intensity;
        public float actionCooldownSeconds;
    }

    [Serializable]
    public struct SpawnIntent
    {
        public SpawnIntentKind kind;
        public string spawnPool;
        public int budget;
        public string reason;
    }

    [Serializable]
    public sealed class MacroWorldState
    {
        public string factionControl = "neutral";
        public float timeLimitMinutes = 20f;
        public float timeRemainingSeconds = 1200f;
        public string currentLocation = "start_zone";
        public float alertLevel = 0.2f;
        public Dictionary<string, bool> worldFlags = new();
    }

    [Serializable]
    public sealed class QuestObjectiveState
    {
        public string id;
        public QuestObjectiveType type;
        public string title;
        public string targetTag;
        public string locationTag;
        public bool optional;
        public List<string> prerequisites = new();
        public int reward;
    }

    [Serializable]
    public sealed class QuestGraphState
    {
        public string questId;
        public string title;
        public string rootObjectiveId;
        public List<QuestObjectiveState> objectives = new();
        public string generatedLocation;
        public string faction;
        public int difficulty;
    }

    [Serializable]
    public sealed class DialogueTreeState
    {
        public string treeId;
        public string npcId;
        public List<string> contextTags = new();
        public List<string> eventsReferenced = new();
        public List<DialogueLineState> lines = new();
    }

    [Serializable]
    public sealed class DialogueLineState
    {
        public string speaker;
        public string text;
        public string conditionKey;
        public string conditionValue;
    }

    [Serializable]
    public sealed class MetaProgressionState
    {
        public int xp;
        public int currency;
        public int extractionStreak;
        public List<string> unlockedTech = new();
        public Dictionary<string, int> persistentInventory = new();
        public Dictionary<string, float> permanentModifiers = new();
    }
}
