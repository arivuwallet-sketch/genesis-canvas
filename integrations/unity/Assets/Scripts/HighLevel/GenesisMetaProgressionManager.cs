using System.Collections.Generic;
using UnityEngine;

namespace Genesis.HighLevel
{
    public sealed class GenesisMetaProgressionManager : MonoBehaviour
    {
        public static GenesisMetaProgressionManager Instance { get; private set; }

        public MetaProgressionState State { get; private set; } = new();

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void AddCurrency(int amount) =>
            State.currency = Mathf.Max(0, State.currency + amount);

        public void AddXp(int amount) =>
            State.xp = Mathf.Max(0, State.xp + amount);

        public void UnlockTech(string techId)
        {
            if (string.IsNullOrWhiteSpace(techId) || State.unlockedTech.Contains(techId))
                return;

            State.unlockedTech.Add(techId);
        }

        public void AddPersistentItem(string itemId, int amount)
        {
            if (string.IsNullOrWhiteSpace(itemId) || amount <= 0)
                return;

            if (!State.persistentInventory.ContainsKey(itemId))
                State.persistentInventory[itemId] = 0;

            State.persistentInventory[itemId] += amount;
        }

        public void AddPermanentModifier(string stat, float value)
        {
            if (string.IsNullOrWhiteSpace(stat))
                return;

            if (!State.permanentModifiers.ContainsKey(stat))
                State.permanentModifiers[stat] = 0f;

            State.permanentModifiers[stat] += value;
        }

        public void ResetRunOnlyState()
        {
            // Persistent state intentionally survives. Run inventory remains in the active
            // mid-level inventory system and is only promoted here after extraction.
        }
    }
}
