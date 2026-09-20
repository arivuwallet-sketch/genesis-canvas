using System.Collections.Generic;
using UnityEngine;

namespace Genesis.MidLevel
{
    public abstract class RuntimeSet<T> : ScriptableObject
        where T : Object
    {
        protected readonly List<T> items = new();

        public IReadOnlyList<T> Items => items;

        public void Register(T item)
        {
            if (item != null && !items.Contains(item))
                items.Add(item);
        }

        public void Unregister(T item)
        {
            items.Remove(item);
        }

        public void Clear() => items.Clear();
    }

    [CreateAssetMenu(menuName = "Genesis Gameplay/Runtime Sets/Actor Set")]
    public sealed class ActorRuntimeSet : RuntimeSet<GameObject>
    {
    }

    public sealed class RuntimeSetMember : MonoBehaviour
    {
        [SerializeField] private ActorRuntimeSet runtimeSet;

        private void OnEnable() => runtimeSet?.Register(gameObject);
        private void OnDisable() => runtimeSet?.Unregister(gameObject);
    }
}
