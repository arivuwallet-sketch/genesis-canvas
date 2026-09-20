export interface GamepadPlayerInput {
  connected: boolean;
  moveX: number;
  moveY: number;
  jump: boolean;
  attack: boolean;
  sprint: boolean;
}

const slots = new Map<number, GamepadPlayerInput>();
let rafId: number | null = null;

export function getGamepadInput(playerNumber: number): GamepadPlayerInput {
  return (
    slots.get(playerNumber) ?? {
      connected: false,
      moveX: 0,
      moveY: 0,
      jump: false,
      attack: false,
      sprint: false,
    }
  );
}

function readGamepads(playerCount: number) {
  const pads = Array.from(navigator.getGamepads?.() ?? [])
    .filter((pad): pad is Gamepad => Boolean(pad && pad.connected))
    .sort((a, b) => a.index - b.index);

  for (let player = 2; player <= playerCount; player += 1) {
    const pad = pads[player - 2];
    if (!pad) {
      slots.set(player, getGamepadInput(player));
      slots.set(player, {
        ...getGamepadInput(player),
        connected: false,
      });
      continue;
    }

    const deadzone = (value: number) =>
      Math.abs(value) < 0.12 ? 0 : Math.max(-1, Math.min(1, value));

    slots.set(player, {
      connected: true,
      moveX: deadzone(pad.axes[0] ?? 0),
      moveY: deadzone(pad.axes[1] ?? 0),
      jump: Boolean(pad.buttons[0]?.pressed),
      attack: Boolean(pad.buttons[1]?.pressed),
      sprint: Boolean(pad.buttons[7]?.pressed ?? pad.buttons[6]?.pressed),
    });
  }
}

export function startGamepadPolling(playerCount: number) {
  stopGamepadPolling();

  const tick = () => {
    if (typeof navigator !== "undefined") readGamepads(playerCount);
    rafId = requestAnimationFrame(tick);
  };

  tick();

  const onConnect = () => readGamepads(playerCount);
  const onDisconnect = () => readGamepads(playerCount);
  window.addEventListener("gamepadconnected", onConnect);
  window.addEventListener("gamepaddisconnected", onDisconnect);

  return () => {
    window.removeEventListener("gamepadconnected", onConnect);
    window.removeEventListener("gamepaddisconnected", onDisconnect);
    stopGamepadPolling();
  };
}

export function stopGamepadPolling() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}
