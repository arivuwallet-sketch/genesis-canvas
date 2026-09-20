import { useMacroGameStore } from "../store/useMacroGameStore";
import type { DialogueTree } from "./MacroTypes";

export async function generateDialogueTree(
  npcId: string,
  treeId: string,
  context: string,
): Promise<DialogueTree> {
  const response = await fetch("/api/ai/dialogue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      npcId,
      treeId,
      context,
      world: useMacroGameStore.getState().world,
      recentQuests: useMacroGameStore.getState().quests.slice(-4),
    }),
  });

  if (!response.ok) {
    throw new Error("Dialogue generation failed (" + response.status + ").");
  }

  const value = (await response.json()) as unknown;
  if (!value || typeof value !== "object") {
    throw new Error("Dialogue generator returned invalid JSON.");
  }

  const tree = value as Partial<DialogueTree>;
  if (
    typeof tree.treeId !== "string" ||
    typeof tree.npcId !== "string" ||
    !Array.isArray(tree.lines)
  ) {
    throw new Error("Dialogue generator returned an invalid dialogue tree.");
  }

  const normalized: DialogueTree = {
    treeId: tree.treeId,
    npcId: tree.npcId,
    contextTags: Array.isArray(tree.contextTags)
      ? tree.contextTags.filter((tag): tag is string => typeof tag === "string").slice(0, 32)
      : [],
    eventsReferenced: Array.isArray(tree.eventsReferenced)
      ? tree.eventsReferenced.filter((id): id is string => typeof id === "string").slice(0, 32)
      : [],
    lines: tree.lines
      .filter(
        (line): line is { speaker: string; text: string; condition?: { key: string; value: string } } =>
          !!line &&
          typeof line === "object" &&
          typeof line.speaker === "string" &&
          typeof line.text === "string",
      )
      .slice(0, 64),
  };

  useMacroGameStore.getState().setDialogueTree(normalized);
  return normalized;
}
