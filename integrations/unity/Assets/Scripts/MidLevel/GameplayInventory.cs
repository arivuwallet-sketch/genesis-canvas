using System;
using System.Collections.Generic;
using UnityEngine;

namespace Genesis.MidLevel
{
    public enum EquipmentSlot
    {
        Head,
        Chest,
        Legs,
        MainHand,
        OffHand,
        Accessory
    }

    [Serializable]
    public struct StatModifierData
    {
        public string stat;
        public float value;
    }

    [CreateAssetMenu(menuName = "Genesis Gameplay/Items/Item Definition")]
    public sealed class ItemDefinition : ScriptableObject
    {
        public string itemId;
        public string displayName;
        public Sprite icon;
        [Min(1)] public int maxStack = 99;
        public bool equippable;
        public EquipmentSlot equipmentSlot;
        public List<StatModifierData> statModifiers = new();
    }

    [Serializable]
    public struct InventoryStack
    {
        public ItemDefinition item;
        [Min(1)] public int quantity;
    }

    [Serializable]
    public struct EquipmentEntry
    {
        public EquipmentSlot slot;
        public ItemDefinition item;
    }

    [CreateAssetMenu(menuName = "Genesis Gameplay/Items/Item Database")]
    public sealed class ItemDatabase : ScriptableObject
    {
        [SerializeField] private List<ItemDefinition> items = new();

        public ItemDefinition Find(string id)
        {
            return items.Find(item => item != null &&
                string.Equals(item.itemId, id, StringComparison.OrdinalIgnoreCase));
        }
    }

    public sealed class GameplayInventory : MonoBehaviour
    {
        [SerializeField] private List<InventoryStack> stacks = new();
        [SerializeField] private List<EquipmentEntry> equipment = new();

        public IReadOnlyList<InventoryStack> Stacks => stacks;
        public IReadOnlyList<EquipmentEntry> Equipment => equipment;

        public bool Add(ItemDefinition item, int quantity)
        {
            if (item == null || quantity <= 0) return false;

            int remaining = quantity;
            for (int i = 0; i < stacks.Count && remaining > 0; ++i)
            {
                if (stacks[i].item != item || stacks[i].quantity >= item.maxStack)
                    continue;

                var stack = stacks[i];
                int add = Mathf.Min(remaining, item.maxStack - stack.quantity);
                stack.quantity += add;
                stacks[i] = stack;
                remaining -= add;
            }

            while (remaining > 0)
            {
                int amount = Mathf.Min(remaining, item.maxStack);
                stacks.Add(new InventoryStack { item = item, quantity = amount });
                remaining -= amount;
            }

            return true;
        }

        public bool Equip(ItemDefinition item)
        {
            if (item == null || !item.equippable) return false;

            for (int i = equipment.Count - 1; i >= 0; --i)
            {
                if (equipment[i].slot == item.equipmentSlot)
                    equipment.RemoveAt(i);
            }

            equipment.Add(new EquipmentEntry {
                slot = item.equipmentSlot,
                item = item
            });

            return true;
        }
    }
}
