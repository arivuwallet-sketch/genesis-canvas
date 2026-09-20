import { useEffect } from "react";
import {
  getGamepadInput,
  startGamepadPolling,
  stopGamepadPolling,
  type GamepadPlayerInput,
} from "../input/gamepadState";

export type { GamepadPlayerInput } from "../input/gamepadState";

export function useGamepadInput(enabled: boolean, playerCount: number) {
  useEffect(() => {
    if (!enabled || playerCount < 2 || typeof navigator === "undefined") return;
    return startGamepadPolling(playerCount);
  }, [enabled, playerCount]);

  return { getGamepadInput };
}

export { stopGamepadPolling };
