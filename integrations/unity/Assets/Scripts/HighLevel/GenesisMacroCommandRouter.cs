using System;
using UnityEngine;

namespace Genesis.HighLevel
{
    public sealed class GenesisMacroCommandRouter : MonoBehaviour
    {
        [Serializable]
        private sealed class Envelope
        {
            public Command[] commands;
        }

        [Serializable]
        private sealed class Command
        {
            public string command;
            public Payload payload;
        }

        [Serializable]
        private sealed class Payload
        {
            public string genre;
            public string pacing;
            public string win_condition;
            public string[] director_rules;
            public string faction_control;
            public float time_limit_mins;
            public string current_location;
            public float alert_level;
        }

        public bool ExecuteJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return false;

            Envelope envelope;

            try
            {
                envelope = JsonUtility.FromJson<Envelope>(json);
            }
            catch (Exception error)
            {
                Debug.LogError($"[GenesisMacro] Invalid command JSON: {error.Message}");
                return false;
            }

            if (envelope?.commands == null || envelope.commands.Length > 16)
                return false;

            bool executed = false;

            foreach (var command in envelope.commands)
            {
                if (command?.payload == null)
                    continue;

                switch (command.command)
                {
                    case "GenerateGameLoop":
                    {
                        var game = GenesisMacroGameManager.Instance;
                        if (game == null)
                            break;

                        var rules = new GenesisMacroGameManager.Rules
                        {
                            timeLimitMinutes = InferTimeLimit(command.payload.genre),
                            targetScore = command.payload.genre.IndexOf("shooter", StringComparison.OrdinalIgnoreCase) >= 0
                                ? 1000
                                : 500,
                            extractionRequired =
                                command.payload.genre.IndexOf("extraction", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                command.payload.win_condition.IndexOf("extract", StringComparison.OrdinalIgnoreCase) >= 0,
                            lossOnDeath = true,
                            artifactRequired =
                                command.payload.win_condition.IndexOf("artifact", StringComparison.OrdinalIgnoreCase) >= 0
                        };

                        game.ConfigureRules(rules);
                        executed = true;
                        break;
                    }

                    case "SetWorldState":
                    {
                        var game = GenesisMacroGameManager.Instance;
                        if (game == null)
                            break;

                        var world = new MacroWorldState
                        {
                            factionControl = command.payload.faction_control,
                            timeLimitMinutes = Mathf.Clamp(command.payload.time_limit_mins, 1f, 180f),
                            timeRemainingSeconds = Mathf.Clamp(command.payload.time_limit_mins, 1f, 180f) * 60f,
                            currentLocation = string.IsNullOrWhiteSpace(command.payload.current_location)
                                ? "start_zone"
                                : command.payload.current_location,
                            alertLevel = Mathf.Clamp01(command.payload.alert_level)
                        };

                        // World is intentionally updated through the macro manager boundary.
                        game.SetWorldState(world);
                        executed = true;
                        break;
                    }
                }
            }

            return executed;
        }

        private static float InferTimeLimit(string genre)
        {
            return genre.IndexOf("extraction", StringComparison.OrdinalIgnoreCase) >= 0
                ? 20f
                : 30f;
        }
    }
}
