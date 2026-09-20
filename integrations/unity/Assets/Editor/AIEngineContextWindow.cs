#if UNITY_EDITOR

using System;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Genesis.ExtremeCore.Editor
{
    public sealed class AIEngineContextWindow : EditorWindow
    {
        private Vector2 _scroll;
        private string _search = string.Empty;
        private UnityEngine.Object _selectedObject;

        [MenuItem("Genesis AI/Engine Context")]
        public static void Open()
        {
            GetWindow<AIEngineContextWindow>("Genesis AI Engine Context");
        }

        private void OnGUI()
        {
            EditorGUILayout.LabelField(
                "AI Engine Context",
                EditorStyles.boldLabel);

            EditorGUILayout.HelpBox(
                "Reflection is constrained to public fields/properties marked for AI exposure. " +
                "Do not expose arbitrary methods or editor-only destructive APIs.",
                MessageType.Info);

            _search = EditorGUILayout.TextField("Search", _search);
            _selectedObject = EditorGUILayout.ObjectField(
                "Target",
                _selectedObject,
                typeof(UnityEngine.Object),
                true);

            if (_selectedObject == null)
            {
                return;
            }

            _scroll = EditorGUILayout.BeginScrollView(_scroll);

            var type = _selectedObject.GetType();
            foreach (var component in type.GetComponents())
            {
                DrawComponent(component);
            }

            EditorGUILayout.EndScrollView();
        }

        private void DrawComponent(Component component)
        {
            var type = component.GetType();
            if (!string.IsNullOrWhiteSpace(_search) &&
                !type.Name.Contains(_search, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            EditorGUILayout.BeginVertical(EditorStyles.helpBox);
            EditorGUILayout.LabelField(type.FullName, EditorStyles.boldLabel);

            foreach (var field in type.GetFields(
                BindingFlags.Instance |
                BindingFlags.Public |
                BindingFlags.NonPublic))
            {
                if (field.IsPublic || field.GetCustomAttribute<SerializeField>() != null)
                {
                    object value = field.GetValue(component);
                    EditorGUILayout.LabelField(field.Name, value?.ToString() ?? "null");
                }
            }

            EditorGUILayout.EndVertical();
        }
    }
}

#endif
