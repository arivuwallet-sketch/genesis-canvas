using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;

public sealed class CommandInterpreter : MonoBehaviour
{
    [Serializable]
    private sealed class UnityCommandBatch
    {
        public UnityCommand[] commands;
    }

    [Serializable]
    private sealed class UnityCommand
    {
        public string action;
        public string target_id;
        public string prefab_name;
        public UnityCommandParameters parameters;
    }

    [Serializable]
    private sealed class UnityCommandParameters
    {
        public float[] position;
        public float[] rotation;
        public float[] scale;
        public string color;
        public string weather;
        public string material;
        public bool enabled;
        public float intensity;
    }

    [Serializable]
    private sealed class BridgeEvent
    {
        public string action;
        public string target_id;
        public string message;
    }

    private readonly Queue<UnityCommand> pendingCommands = new();
    private readonly Dictionary<string, GameObject> runtimeObjects = new();

    private Coroutine processingCoroutine;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void DispatchReactUnityEvent(string eventName, string payload);
#endif

    /// <summary>
    /// Entry point used by react-unity-webgl's sendMessage().
    /// The method only parses and queues work; command execution happens over frames.
    /// </summary>
    public void ExecuteCommands(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            NotifyError("Empty Unity command payload.");
            return;
        }

        UnityCommandBatch batch;
        try
        {
            batch = JsonUtility.FromJson<UnityCommandBatch>(json);
        }
        catch (Exception exception)
        {
            NotifyError($"Invalid Unity command JSON: {exception.Message}");
            return;
        }

        if (batch?.commands == null)
        {
            NotifyError("Unity command payload contains no commands.");
            return;
        }

        foreach (var command in batch.commands)
        {
            if (command != null)
            {
                pendingCommands.Enqueue(command);
            }
        }

        if (processingCoroutine == null)
        {
            processingCoroutine = StartCoroutine(ProcessCommandQueue());
        }
    }

    private IEnumerator ProcessCommandQueue()
    {
        while (pendingCommands.Count > 0)
        {
            var command = pendingCommands.Dequeue();

            try
            {
                ExecuteCommand(command);
            }
            catch (Exception exception)
            {
                NotifyError(
                    $"Action '{command.action}' failed: {exception.Message}",
                    command.action,
                    command.target_id);
            }

            // Yield after every command so a large AI batch never monopolizes a frame.
            yield return null;
        }

        processingCoroutine = null;
    }

    private void ExecuteCommand(UnityCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.action))
        {
            NotifyError("Command action is missing.");
            return;
        }

        switch (command.action)
        {
            case "instantiate":
                ExecuteInstantiate(command);
                break;

            case "destroy":
                ExecuteDestroy(command);
                break;

            case "transform":
                ExecuteTransform(command);
                break;

            case "change_weather":
                ExecuteWeather(command);
                break;

            case "apply_material":
                ExecuteMaterial(command);
                break;

            default:
                NotifyError(
                    $"Unsupported Unity action '{command.action}'.",
                    command.action,
                    command.target_id);
                break;
        }
    }

    private void ExecuteInstantiate(UnityCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.prefab_name))
        {
            NotifyError("instantiate requires prefab_name.", command.action);
            return;
        }

        var prefab = Resources.Load<GameObject>(command.prefab_name);
        if (prefab == null)
        {
            NotifyError(
                $"Prefab '{command.prefab_name}' was not found under a Resources folder.",
                command.action,
                command.target_id);
            return;
        }

        var parameters = command.parameters ?? new UnityCommandParameters();
        var instance = Instantiate(
            prefab,
            ToVector3(parameters.position, Vector3.zero),
            ToQuaternion(parameters.rotation, Quaternion.identity));

        instance.transform.localScale = ToVector3(parameters.scale, instance.transform.localScale);

        var runtimeId = string.IsNullOrWhiteSpace(command.target_id)
            ? $"unity-{Guid.NewGuid():N}"
            : command.target_id;

        RegisterRuntimeObject(runtimeId, instance);
        ApplyVisualParameters(instance, parameters);

        NotifyCompleted(
            command.action,
            runtimeId,
            $"Spawned '{command.prefab_name}' as '{runtimeId}'.");
    }

    private void ExecuteDestroy(UnityCommand command)
    {
        var target = ResolveTarget(command.target_id);
        if (target == null)
        {
            NotifyError(
                $"Target '{command.target_id}' was not found.",
                command.action,
                command.target_id);
            return;
        }

        var targetId = command.target_id;
        if (!string.IsNullOrWhiteSpace(targetId))
        {
            runtimeObjects.Remove(targetId);
        }

        Destroy(target);

        NotifyCompleted(
            command.action,
            targetId,
            $"Destroyed '{targetId ?? target.name}'.");
    }

    private void ExecuteTransform(UnityCommand command)
    {
        var target = ResolveTarget(command.target_id);
        if (target == null)
        {
            NotifyError(
                $"Target '{command.target_id}' was not found.",
                command.action,
                command.target_id);
            return;
        }

        var parameters = command.parameters ?? new UnityCommandParameters();

        if (parameters.position != null)
        {
            target.transform.position = ToVector3(parameters.position, target.transform.position);
        }

        if (parameters.rotation != null)
        {
            target.transform.rotation = ToQuaternion(parameters.rotation, target.transform.rotation);
        }

        if (parameters.scale != null)
        {
            target.transform.localScale = ToVector3(parameters.scale, target.transform.localScale);
        }

        NotifyCompleted(
            command.action,
            command.target_id,
            $"Transformed '{command.target_id}'.");
    }

    private void ExecuteWeather(UnityCommand command)
    {
        var parameters = command.parameters ?? new UnityCommandParameters();
        var weather = (parameters.weather ?? "clear").ToLowerInvariant();
        var intensity = Mathf.Clamp(parameters.intensity > 0f ? parameters.intensity : 1f, 0f, 4f);

        switch (weather)
        {
            case "rain":
            case "storm":
                RenderSettings.fog = true;
                RenderSettings.fogDensity = 0.015f * intensity;
                SetNamedObjectActive("RainSystem", true);
                break;

            case "fog":
                RenderSettings.fog = true;
                RenderSettings.fogDensity = 0.03f * intensity;
                SetNamedObjectActive("RainSystem", false);
                break;

            case "snow":
                RenderSettings.fog = true;
                RenderSettings.fogDensity = 0.01f * intensity;
                SetNamedObjectActive("RainSystem", false);
                SetNamedObjectActive("SnowSystem", true);
                break;

            case "clear":
                RenderSettings.fog = false;
                SetNamedObjectActive("RainSystem", false);
                SetNamedObjectActive("SnowSystem", false);
                break;

            default:
                NotifyError($"Unsupported weather '{weather}'.", command.action);
                return;
        }

        if (!string.IsNullOrWhiteSpace(parameters.material))
        {
            var skybox = Resources.Load<Material>(parameters.material);
            if (skybox != null)
            {
                RenderSettings.skybox = skybox;
                DynamicGI.UpdateEnvironment();
            }
        }

        NotifyCompleted(
            command.action,
            null,
            $"Weather changed to '{weather}'.");
    }

    private void ExecuteMaterial(UnityCommand command)
    {
        var target = ResolveTarget(command.target_id);
        if (target == null)
        {
            NotifyError(
                $"Target '{command.target_id}' was not found.",
                command.action,
                command.target_id);
            return;
        }

        var renderer = target.GetComponentInChildren<Renderer>();
        if (renderer == null)
        {
            NotifyError(
                $"Target '{command.target_id}' has no Renderer.",
                command.action,
                command.target_id);
            return;
        }

        var parameters = command.parameters ?? new UnityCommandParameters();
        var material = renderer.material;

        if (!string.IsNullOrWhiteSpace(parameters.color) &&
            ColorUtility.TryParseHtmlString(parameters.color, out var color))
        {
            material.color = color;
        }

        if (!string.IsNullOrWhiteSpace(parameters.material))
        {
            var replacement = Resources.Load<Material>(parameters.material);
            if (replacement != null)
            {
                renderer.material = replacement;
            }
        }

        if (parameters.intensity > 0f)
        {
            material.SetFloat("_Glossiness", Mathf.Clamp01(parameters.intensity));
        }

        NotifyCompleted(
            command.action,
            command.target_id,
            $"Material updated for '{command.target_id}'.");
    }

    private void ApplyVisualParameters(GameObject target, UnityCommandParameters parameters)
    {
        if (parameters == null)
        {
            return;
        }

        var renderer = target.GetComponentInChildren<Renderer>();
        if (renderer == null)
        {
            return;
        }

        var material = renderer.material;

        if (!string.IsNullOrWhiteSpace(parameters.color) &&
            ColorUtility.TryParseHtmlString(parameters.color, out var color))
        {
            material.color = color;
        }

        if (!string.IsNullOrWhiteSpace(parameters.material))
        {
            var replacement = Resources.Load<Material>(parameters.material);
            if (replacement != null)
            {
                renderer.material = replacement;
            }
        }
    }

    private GameObject ResolveTarget(string targetId)
    {
        if (string.IsNullOrWhiteSpace(targetId))
        {
            return null;
        }

        if (runtimeObjects.TryGetValue(targetId, out var runtimeObject) && runtimeObject != null)
        {
            return runtimeObject;
        }

        var byName = GameObject.Find(targetId);
        if (byName != null)
        {
            runtimeObjects[targetId] = byName;
        }

        return byName;
    }

    private void RegisterRuntimeObject(string runtimeId, GameObject instance)
    {
        if (runtimeObjects.TryGetValue(runtimeId, out var previous) && previous != null)
        {
            Destroy(previous);
        }

        runtimeObjects[runtimeId] = instance;

        var identity = instance.GetComponent<UnityRuntimeIdentity>();
        if (identity == null)
        {
            identity = instance.AddComponent<UnityRuntimeIdentity>();
        }

        identity.runtimeId = runtimeId;
        instance.name = runtimeId;
    }

    private static Vector3 ToVector3(float[] values, Vector3 fallback)
    {
        if (values == null || values.Length < 3)
        {
            return fallback;
        }

        return new Vector3(values[0], values[1], values[2]);
    }

    private static Quaternion ToQuaternion(float[] euler, Quaternion fallback)
    {
        if (euler == null || euler.Length < 3)
        {
            return fallback;
        }

        return Quaternion.Euler(euler[0], euler[1], euler[2]);
    }

    private static void SetNamedObjectActive(string objectName, bool active)
    {
        var target = GameObject.Find(objectName);
        if (target != null)
        {
            target.SetActive(active);
        }
    }

    private void NotifyCompleted(string action, string targetId = null, string message = null)
    {
        var payload = JsonUtility.ToJson(new BridgeEvent
        {
            action = action,
            target_id = targetId,
            message = message ?? "Command completed.",
        });

#if UNITY_WEBGL && !UNITY_EDITOR
        DispatchReactUnityEvent("UnityCommandCompleted", payload);
#else
        Debug.Log($"[UnityCommandCompleted] {payload}");
#endif
    }

    private void NotifyError(string message, string action = null, string targetId = null)
    {
        var payload = JsonUtility.ToJson(new BridgeEvent
        {
            action = action,
            target_id = targetId,
            message = message,
        });

#if UNITY_WEBGL && !UNITY_EDITOR
        DispatchReactUnityEvent("UnityCommandError", payload);
#else
        Debug.LogError($"[UnityCommandError] {payload}");
#endif
    }
}

public sealed class UnityRuntimeIdentity : MonoBehaviour
{
    public string runtimeId;
}
