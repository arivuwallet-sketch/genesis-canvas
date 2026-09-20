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

export function planMacroGoal(goal: MacroGoal, initialState: Record<string, unknown>, actions: PlanningAction[]) {
  const state = { ...initialState };
  const selected: string[] = [];

  const ordered = [...actions].sort(
    (a, b) => a.cost - b.cost,
  );

  for (const action of ordered) {
    if (!action.canRun(state)) continue;
    action.apply(state);
    selected.push(action.name);

    const satisfied = Object.entries(goal.desiredState).every(
      ([key, expected]) => state[key] === expected,
    );

    if (satisfied) break;
  }

  return { goalId: goal.id, selectedActions: selected, resultingState: state };
}

const types: QuestObjectiveType[] = [
  "Fetch",
  "Escort",
  "Assassinate",
  "Defend",
];

const pick = <T>(values: T[], index: number) => values[index % values.length]!;

export function generateDynamicQuest(
  world: WorldState,
  seed = 1,
): QuestGraph {
  const difficulty = Math.max(
    1,
    Math.min(10, Math.round(world.alertLevel * 8 + 2)),
  );
  const faction = world.factionControl || "neutral";
  const count = world.timeLimitMinutes >= 30 ? 4 : 3;

  const objectives: QuestObjective[] = Array.from({ length: count }, (_, index) => {
    const type = pick(types, seed + index * 3);
    const suffix = pick(
      ["bridge", "vault", "supply_cache", "watchtower", "convoy"],
      seed + index,
    );

    return {
      id: `objective_${seed}_${index}`,
      type,
      title:
        type === "Fetch"
          ? `Recover the ${suffix}`
          : type === "Escort"
            ? `Escort the ${suffix}`
            : type === "Assassinate"
              ? `Eliminate the ${faction} commander`
              : `Defend the ${suffix}`,
      targetTag: type === "Assassinate" ? `${faction}:commander` : suffix,
      locationTag: world.currentLocation || "unknown",
      optional: index === count - 1 && difficulty < 7,
      prerequisites: index === 0 ? [] : [`objective_${seed}_${index - 1}`],
      reward: 100 * difficulty + index * 50,
    };
  });

  return {
    questId: `quest_${seed}_${world.currentLocation || "world"}`,
    title: `${faction} operation: ${world.currentLocation || "unknown"}`,
    objectives,
    rootObjectiveId: objectives[0]!.id,
    metadata: {
      generatedFromLocation: world.currentLocation || "unknown",
      faction,
      difficulty,
    },
  };
}
