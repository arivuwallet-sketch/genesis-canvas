using System;
using System.Collections.Generic;
using UnityEngine;

namespace Genesis.HighLevel
{
    public sealed class GenesisQuestOrchestrator : MonoBehaviour
    {
        [Serializable]
        public sealed class MacroGoal
        {
            public string id;
            public string actor;
            public string description;
            public int priority;
            public List<string> desiredFacts = new();
        }

        public readonly List<QuestGraphState> ActiveQuests = new();
        public readonly List<string> CompletedObjectives = new();

        public MacroGoal CreateFactionGoal(
            string faction,
            string goal,
            int priority = 50)
        {
            return new MacroGoal
            {
                id = Guid.NewGuid().ToString("N"),
                actor = faction,
                description = goal,
                priority = priority
            };
        }

        public QuestGraphState GenerateQuest(
            MacroWorldState world,
            int seed)
        {
            string faction = string.IsNullOrWhiteSpace(world.factionControl)
                ? "neutral"
                : world.factionControl;

            int difficulty = Mathf.Clamp(
                Mathf.RoundToInt(world.alertLevel * 8f + 2f),
                1,
                10);

            int count = world.timeLimitMinutes >= 30f ? 4 : 3;
            QuestObjectiveType[] types =
            {
                QuestObjectiveType.Fetch,
                QuestObjectiveType.Escort,
                QuestObjectiveType.Assassinate,
                QuestObjectiveType.Defend
            };

            string[] locations =
            {
                "bridge",
                "vault",
                "supply_cache",
                "watchtower",
                "convoy"
            };

            var quest = new QuestGraphState
            {
                questId = $"quest_{seed}_{world.currentLocation}",
                title = $"{faction} operation: {world.currentLocation}",
                generatedLocation = world.currentLocation,
                faction = faction,
                difficulty = difficulty
            };

            for (int i = 0; i < count; ++i)
            {
                var type = types[Math.Abs(seed + i * 3) % types.Length];
                string suffix = locations[Math.Abs(seed + i) % locations.Length];
                string id = $"objective_{seed}_{i}";

                string title = type switch
                {
                    QuestObjectiveType.Fetch => $"Recover the {suffix}",
                    QuestObjectiveType.Escort => $"Escort the {suffix}",
                    QuestObjectiveType.Assassinate => $"Eliminate the {faction} commander",
                    _ => $"Defend the {suffix}"
                };

                quest.objectives.Add(new QuestObjectiveState
                {
                    id = id,
                    type = type,
                    title = title,
                    targetTag = type == QuestObjectiveType.Assassinate
                        ? $"{faction}:commander"
                        : suffix,
                    locationTag = world.currentLocation,
                    optional = i == count - 1 && difficulty < 7,
                    reward = 100 * difficulty + i * 50,
                    prerequisites = i == 0
                        ? new List<string>()
                        : new List<string> { $"objective_{seed}_{i - 1}" }
                });
            }

            if (quest.objectives.Count > 0)
                quest.rootObjectiveId = quest.objectives[0].id;

            ActiveQuests.Add(quest);
            return quest;
        }

        public bool CompleteObjective(string objectiveId)
        {
            if (string.IsNullOrWhiteSpace(objectiveId) ||
                CompletedObjectives.Contains(objectiveId))
                return false;

            CompletedObjectives.Add(objectiveId);
            return true;
        }

        public List<string> PlanGoal(
            MacroGoal goal,
            IReadOnlyDictionary<string, bool> initialFacts)
        {
            var facts = new Dictionary<string, bool>(initialFacts);
            var plan = new List<string>();

            foreach (var fact in goal.desiredFacts)
            {
                if (facts.TryGetValue(fact, out bool satisfied) && satisfied)
                    continue;

                plan.Add($"Establish {fact}");
                facts[fact] = true;
            }

            return plan;
        }
    }
}
