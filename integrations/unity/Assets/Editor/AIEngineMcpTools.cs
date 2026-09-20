#if UNITY_EDITOR

using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Genesis.ExtremeCore.Editor
{
    public static class AIEngineMcpTools
    {
        private const string ExposureAttributeName = "GenesisAIExposeAttribute";

        [MenuItem("Genesis AI/Print Exposed Context")]
        private static void PrintExposedContext()
        {
            foreach (var gameObject in UnityEngine.Object.FindObjectsByType<GameObject>(
                FindObjectsInactive.Include,
                FindObjectsSortMode.None))
            {
                foreach (var component in gameObject.GetComponents<Component>())
                {
                    if (component == null) continue;

                    foreach (var method in component.GetType().GetMethods(
                        BindingFlags.Instance |
                        BindingFlags.Public))
                    {
                        if (method.GetCustomAttributes(false).Length == 0) continue;

                        bool exposed = false;
                        foreach (var attribute in method.GetCustomAttributes(false))
                        {
                            if (attribute.GetType().Name == ExposureAttributeName)
                            {
                                exposed = true;
                                break;
                            }
                        }

                        if (exposed)
                        {
                            Debug.Log(
                                $"[GenesisAI MCP] {gameObject.name}::{component.GetType().Name}.{method.Name}");
                        }
                    }
                }
            }
        }

        public static object InvokeExposed(
            UnityEngine.Object target,
            string methodName,
            IReadOnlyList<object> args)
        {
            if (target == null || string.IsNullOrWhiteSpace(methodName))
            {
                throw new ArgumentException("Target and methodName are required.");
            }

            var method = target.GetType().GetMethod(
                methodName,
                BindingFlags.Instance |
                BindingFlags.Public);

            if (method == null)
            {
                throw new MissingMethodException(target.GetType().FullName, methodName);
            }

            foreach (var attribute in method.GetCustomAttributes(false))
            {
                if (attribute.GetType().Name == ExposureAttributeName)
                {
                    return method.Invoke(target, args == null ? null : new List<object>(args).ToArray());
                }
            }

            throw new InvalidOperationException(
                $"Method {methodName} is not exposed to Genesis AI.");
        }
    }

    [AttributeUsage(AttributeTargets.Method)]
    public sealed class GenesisAIExposeAttribute : Attribute
    {
    }
}

#endif
