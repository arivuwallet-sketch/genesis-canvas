import type { AnimationAction } from "three";

const actionsByEntity = new Map<string, Record<string, AnimationAction>>();

export function registerAnimationActions(
  entityId: string,
  actions: Record<string, AnimationAction | null | undefined>,
) {
  const normalized: Record<string, AnimationAction> = {};
  for (const [name, action] of Object.entries(actions)) {
    if (action) normalized[name] = action;
  }
  actionsByEntity.set(entityId, normalized);
}

export function unregisterAnimationActions(entityId: string) {
  actionsByEntity.delete(entityId);
}

export function playRegisteredAnimation(
  entityId: string,
  animationName: string,
  blendTime = 0.2,
) {
  const actions = actionsByEntity.get(entityId);
  if (!actions) return false;
  const action = actions[animationName] ?? Object.entries(actions).find(
    ([name]) => name.toLowerCase() === animationName.toLowerCase(),
  )?.[1];
  if (!action) return false;
  action.reset().fadeIn(Math.max(0, blendTime)).play();
  return true;
}
