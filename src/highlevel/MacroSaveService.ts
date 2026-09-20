import { getLatestSceneStateJson } from "../workers/SceneStateSerializer";
import { useGameplayStore } from "../store/useGameplayStore";
import { useMacroGameStore } from "../store/useMacroGameStore";
import {
  deserializeMacroSave,
  serializeMacroSave,
} from "./MacroSaveSerializer";
import type { MacroSaveEnvelope } from "./MacroTypes";

export async function createMacroSave(playerId: string): Promise<Uint8Array> {
  const macro = useMacroGameStore.getState();
  const gameplay = useGameplayStore.getState();

  return serializeMacroSave({
    playerId,
    world: macro.world,
    director: macro.director,
    directorRuntime: macro.getDirectorRuntimeState(),
    quests: macro.quests,
    completedQuestObjectives: macro.completedQuestObjectives,
    meta: macro.meta,
    gameLoopConfig: macro.gameLoopConfig,
    rules: macro.rules,
    score: macro.score,
    playerAlive: macro.playerAlive,
    extracted: macro.extracted,
    artifactSecured: macro.artifactSecured,
    loop: macro.loop,
    gameplayState: {
      players: gameplay.players,
      activeDialogue: gameplay.activeDialogue,
      activeWaves: gameplay.activeWaves,
      questSteps: gameplay.questSteps,
      ecsSceneState: getLatestSceneStateJson(),
    },
  });
}

export async function restoreMacroSave(bytes: Uint8Array): Promise<MacroSaveEnvelope> {
  const save = await deserializeMacroSave(bytes);
  const macro = useMacroGameStore.getState();

  macro.restoreMacroSnapshot(save);
  return save;
}

export async function saveMacroToCloud(
  playerId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const bytes = await createMacroSave(playerId);
    const base64 = bytesToBase64(bytes);

    const response = await fetch("/api/save/macro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        payloadBase64: base64,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        message: body.slice(0, 240) || "Macro cloud save failed.",
      };
    }

    return { ok: true, message: "Macro state saved to cloud." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Macro cloud save failed.",
    };
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(bytes.length, i + chunk)),
    );
  }

  return btoa(binary);
}
