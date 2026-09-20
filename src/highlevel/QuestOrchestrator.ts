import type {
  MacroGoal,
  QuestGraph,
  QuestObjective,
  QuestObjectiveType,
  WorldState,
} from "./MacroTypes";

interface PlanningAction {
  name: string;
  cost: number;
  canRun: (state: Record<string, unknown>) => boolean;
  apply: (state: Record<string, unknown>) => void;
}

export function planMacroGoal(
  goal: MacroGoal,
  initialState: Record<string, unknown>,
  actions: PlanningAction[],
) {
  type Node = { state: Record<string, unknown>; plan: string[]; cost: number };

  const satisfies = (state: Record<string, unknown>) =>
    Object.entries(goal.desiredState).every(
      ([key, expected]) => state[key] === expected,
    );

  if (satisfies(initialState)) {
    return {
      goalId: goal.id,
      selectedActions: [],
      resultingState: { ...initialState },
    };
  }

  let frontier: Node[] = [{ state: { ...initialState }, plan: [], cost: 0 }];
  const visited = new Set<string>();

  for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
    const next: Node[] = [];

    for (const node of frontier) {
      for (const action of actions) {
        if (!action.canRun(node.state)) continue;

        const state = { ...node.state };
        action.apply(state);
        const plan = [...node.plan, action.name];
        const key = JSON.stringify(state);
        if (visited.has(key)) continue;
        visited.add(key);

        if (satisfies(state)) {
          return {
            goalId: goal.id,
            selectedActions: plan,
            resultingState: state,
          };
        }

        next.push({
          state,
          plan,
          cost: node.cost + action.cost,
        });
      }
    }

    next.sort((a, b) => a.cost - b.cost);
    frontier = next.slice(0, 32);
  }

  return {
    goalId: goal.id,
    selectedActions: [],
    resultingState: { ...initialState },
  };
}

