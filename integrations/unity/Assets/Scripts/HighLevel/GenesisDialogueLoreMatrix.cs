using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Genesis.HighLevel
{
    public sealed class GenesisDialogueLoreMatrix : MonoBehaviour
    {
        [Serializable]
        public sealed class LoreEvent
        {
            public string id;
            public float timestamp;
            public List<string> tags = new();
            [TextArea] public string summary;
        }

        private readonly List<LoreEvent> events = new();

        public void Record(LoreEvent loreEvent)
        {
            if (loreEvent == null)
                return;

            events.Add(loreEvent);
            if (events.Count > 256)
                events.RemoveAt(0);
        }

        public DialogueTreeState BuildTemplateTree(
            string npcId,
            string treeId,
            string speaker,
            string currentContext)
        {
            var relevant = events
                .Where(e =>
                    e.summary.IndexOf(currentContext, StringComparison.OrdinalIgnoreCase) >= 0 ||
                    e.tags.Contains(currentContext))
                .TakeLast(6)
                .ToList();

            var tree = new DialogueTreeState
            {
                treeId = treeId,
                npcId = npcId,
                contextTags = events.SelectMany(e => e.tags)
                    .Append(currentContext)
                    .Distinct()
                    .TakeLast(32)
                    .ToList()
            };

            foreach (var eventData in relevant)
            {
                tree.eventsReferenced.Add(eventData.id);
                tree.lines.Add(new DialogueLineState
                {
                    speaker = speaker,
                    text = eventData.summary
                });
            }

            if (tree.lines.Count == 0)
            {
                tree.lines.Add(new DialogueLineState
                {
                    speaker = speaker,
                    text = $"Tell me what happened at {currentContext}."
                });
            }

            return tree;
        }
    }
}
