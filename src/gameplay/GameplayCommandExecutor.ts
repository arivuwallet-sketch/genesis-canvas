import { gameplayEventBus } from "./GameplayEventBus";
import { useGameplayStore } from "../store/useGameplayStore";
import { parseGameplayCommandBatch, type UnifiedGameplayCommand } from "./UnifiedGameplayCommand";

export interface GameplayCommandResult {
  ok: boolean;
  message: string;
}

export function executeGameplayCommands(input: unknown): GameplayCommandResult {
  let commands: UnifiedGameplayCommand[];
  try {
    commands = parseGameplayCommandBatch(input);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Invalid gameplay command.",
    };
  }

  const messages = commands.map((command) => {
    const state = useGameplayStore.getState();

    switch (command.command) {
      case "GrantAbility":
        state.grantAbility(command.payload.entity_id, command.payload.ability);
        return `Granted ${command.payload.ability} to ${command.payload.entity_id}.`;

      case "TriggerDialogue":
        state.triggerDialogue(command.payload.npc_id, command.payload.tree_id);
        return `Triggered dialogue ${command.payload.tree_id} for ${command.payload.npc_id}.`;

      case "SpawnWave":
        state.spawnWave(
          command.payload.enemy_type,
          command.payload.count,
          command.payload.spawn_point,
        );
        return `Spawned wave of ${command.payload.count} ${command.payload.enemy_type} enemies at ${command.payload.spawn_point}.`;

      case "ModifyAttribute":
        state.modifyAttribute(
          command.payload.target,
          command.payload.attribute,
          command.payload.delta,
        );
        return `Modified ${command.payload.attribute} on ${command.payload.target} by ${command.payload.delta}.`;
    }
  });

  gameplayEventBus.emit("onGameplayCommand", {
    command: commands.length === 1 ? commands[0]!.command : "Batch",
    payload: commands,
  });

  return { ok: true, message: messages.join(" ") };
}
