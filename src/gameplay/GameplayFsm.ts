export type GameplayStateName = "Idle" | "Patrol" | "Chase" | "Attack" | "Flee";

export interface GameplayFsmContext {
  now: number;
  distanceToPlayer: number;
  healthRatio: number;
  hasTarget: boolean;
  attackRange: number;
  chaseRange: number;
  fleeHealthRatio: number;
}

export interface GameplayStateDefinition {
  name: GameplayStateName;
  enter?: (context: GameplayFsmContext) => void;
  update?: (context: GameplayFsmContext, deltaSeconds: number) => void;
  exit?: (context: GameplayFsmContext) => void;
}

export class GameplayFsm {
  private state: GameplayStateName;
  private definitions: Map<GameplayStateName, GameplayStateDefinition>;
  private context: GameplayFsmContext;

  constructor(initial: GameplayStateName, definitions: GameplayStateDefinition[], context: GameplayFsmContext) {
    this.state = initial;
    this.definitions = new Map(definitions.map((definition) => [definition.name, definition]));
    this.context = context;
    this.definitions.get(initial)?.enter?.(context);
  }

  get current() {
    return this.state;
  }

  setContext(patch: Partial<GameplayFsmContext>) {
    this.context = { ...this.context, ...patch };
  }

  update(deltaSeconds: number) {
    const next = this.chooseNextState();
    if (next !== this.state) this.transition(next);
    this.definitions.get(this.state)?.update?.(this.context, deltaSeconds);
  }

  transition(next: GameplayStateName) {
    if (next === this.state) return;
    this.definitions.get(this.state)?.exit?.(this.context);
    this.state = next;
    this.definitions.get(this.state)?.enter?.(this.context);
  }

  private chooseNextState(): GameplayStateName {
    const c = this.context;

    if (c.healthRatio <= c.fleeHealthRatio) return "Flee";
    if (!c.hasTarget) return "Idle";
    if (c.distanceToPlayer <= c.attackRange) return "Attack";
    if (c.distanceToPlayer <= c.chaseRange) return "Chase";
    return "Patrol";
  }
}
