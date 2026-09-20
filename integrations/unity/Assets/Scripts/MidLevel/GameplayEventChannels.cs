using System;
using UnityEngine;
using UnityEngine.Events;

namespace Genesis.MidLevel
{
    [CreateAssetMenu(menuName = "Genesis Gameplay/Events/Game Event")]
    public sealed class GameEvent : ScriptableObject
    {
        private readonly System.Collections.Generic.List<GameEventListener> listeners = new();

        public void Raise()
        {
            for (int i = listeners.Count - 1; i >= 0; --i)
            {
                if (listeners[i] == null)
                {
                    listeners.RemoveAt(i);
                    continue;
                }

                listeners[i].OnEventRaised();
            }
        }

        public void Register(GameEventListener listener)
        {
            if (listener != null && !listeners.Contains(listener))
                listeners.Add(listener);
        }

        public void Unregister(GameEventListener listener)
        {
            listeners.Remove(listener);
        }
    }

    [CreateAssetMenu(menuName = "Genesis Gameplay/Events/Float Event")]
    public sealed class FloatEvent : ScriptableObject
    {
        private readonly System.Collections.Generic.List<FloatEventListener> listeners = new();

        public void Raise(float value)
        {
            for (int i = listeners.Count - 1; i >= 0; --i)
            {
                if (listeners[i] == null)
                {
                    listeners.RemoveAt(i);
                    continue;
                }

                listeners[i].OnEventRaised(value);
            }
        }

        public void Register(FloatEventListener listener)
        {
            if (listener != null && !listeners.Contains(listener))
                listeners.Add(listener);
        }

        public void Unregister(FloatEventListener listener)
        {
            listeners.Remove(listener);
        }
    }

    public sealed class GameEventListener : MonoBehaviour
    {
        [SerializeField] private GameEvent gameEvent;
        [SerializeField] private UnityEvent response;

        private void OnEnable() => gameEvent?.Register(this);
        private void OnDisable() => gameEvent?.Unregister(this);
        public void OnEventRaised() => response?.Invoke();
    }

    public sealed class FloatEventListener : MonoBehaviour
    {
        [SerializeField] private FloatEvent gameEvent;
        [SerializeField] private UnityEvent<float> response;

        private void OnEnable() => gameEvent?.Register(this);
        private void OnDisable() => gameEvent?.Unregister(this);
        public void OnEventRaised(float value) => response?.Invoke(value);
    }

    [CreateAssetMenu(menuName = "Genesis Gameplay/Variables/Float")]
    public sealed class FloatVariable : ScriptableObject
    {
        [SerializeField] private float initialValue;
        [NonSerialized] private float runtimeValue;

        public float Value => runtimeValue;

        private void OnEnable() => runtimeValue = initialValue;

        public void SetValue(float value) => runtimeValue = value;
        public void ApplyDelta(float delta) => runtimeValue += delta;
        public void ResetValue() => runtimeValue = initialValue;
    }
}
