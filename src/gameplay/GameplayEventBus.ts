import type { SpawnIntent } from "../highlevel/MacroTypes";

export type GameplayEvents = {
  onPlayerHealthChange: { playerId: string; health: number; maxHealth: number; delta: number };
  onItemPickedUp: { playerId: string; itemId: string; quantity: number };
  onQuestStepComplete: { playerId: string; questId: string; stepId: string };
  onTriggerEntered: { entityId: string; triggerId: string };
  onDialogueTriggered: { npcId: string; treeId: string };
  onWaveSpawned: { enemyType: string; count: number; spawnPoint: string };
  onAbilityGranted: { entityId: string; ability: string };
  onGameplayCommand: { command: string; payload: unknown };
  onDirectorSpawnIntent: SpawnIntent;
};

type Listener<T> = (payload: T) => void;

export class GameplayEventBus {
  private listeners = new Map<keyof GameplayEvents, Set<Listener<any>>>();

  on<K extends keyof GameplayEvents>(event: K, listener: Listener<GameplayEvents[K]>) {
    const bucket = this.listeners.get(event) ?? new Set();
    bucket.add(listener);
    this.listeners.set(event, bucket);
    return () => this.off(event, listener);
  }

  off<K extends keyof GameplayEvents>(event: K, listener: Listener<GameplayEvents[K]>) {
    this.listeners.get(event)?.delete(listener);
  }

  emit<K extends keyof GameplayEvents>(event: K, payload: GameplayEvents[K]) {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  clear() {
    this.listeners.clear();
  }
}

export const gameplayEventBus = new GameplayEventBus();
