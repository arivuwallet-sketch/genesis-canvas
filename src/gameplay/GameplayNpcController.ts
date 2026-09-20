import { gameplayEventBus } from "./GameplayEventBus";
import {
  GameplayFsm,
  type GameplayFsmContext,
  type GameplayStateDefinition,
} from "./GameplayFsm";

export interface GameplayNpcControllerOptions {
  initialState?: "Idle" | "Patrol" | "Chase" | "Attack" | "Flee";
  attackRange?: number;
  chaseRange?: number;
  fleeHealthRatio?: number;
  onStateChanged?: (context: GameplayFsmContext, state: string) => void;
}

export class GameplayNpcController {
  private readonly fsm: GameplayFsm;
  private readonly context: GameplayFsmContext;
  private readonly onStateChanged?: GameplayNpcControllerOptions["onStateChanged"];

  constructor(options: GameplayNpcControllerOptions = {}) {
    this.context = {
      now: performance.now() / 1000,
      distanceToPlayer: Number.POSITIVE_INFINITY,
      healthRatio: 1,
      hasTarget: false,
      attackRange: options.attackRange ?? 2,
      chaseRange: options.chaseRange ?? 12,
      fleeHealthRatio: options.fleeHealthRatio ?? 0.2,
    };

    const states: GameplayStateDefinition[] = [
      { name: "Idle" },
      { name: "Patrol" },
      { name: "Chase" },
      { name: "Attack" },
      { name: "Flee" },
    ];

    this.fsm = new GameplayFsm(
      options.initialState ?? "Idle",
      states,
      this.context,
    );
    this.onStateChanged = options.onStateChanged;
  }

  update(deltaSeconds: number, patch: Partial<GameplayFsmContext> = {}) {
    this.context.now += Math.max(0, deltaSeconds);
    this.fsm.setContext({ ...patch, now: this.context.now });

    const before = this.fsm.current;
    this.fsm.update(deltaSeconds);
    const after = this.fsm.current;

    if (before !== after) {
      gameplayEventBus.emit("onGameplayCommand", {
        command: "NPCStateChanged",
        payload: { state: after },
      });
      this.onStateChanged?.(this.context, after);
    }
  }

  get state() {
    return this.fsm.current;
  }
}
