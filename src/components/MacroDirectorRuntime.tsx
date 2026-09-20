import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { gameplayEventBus } from "../gameplay/GameplayEventBus";
import { useGameplayStore } from "../store/useGameplayStore";
import { useMacroGameStore } from "../store/useMacroGameStore";
import { useGameConfigStore } from "../store/useGameConfigStore";

export function MacroDirectorRuntime() {
  const elapsed = useRef(0);
  const recentDamage = useRef(0);
  const lastCombat = useRef(30);
  const worldClockAccumulator = useRef(0);
  const loopAccumulator = useRef(0);

  useEffect(() => {
    const unhealth = gameplayEventBus.on("onPlayerHealthChange", (event) => {
      if (event.delta < 0) recentDamage.current += Math.abs(event.delta);
      const state = useMacroGameStore.getState();
      state.updateTelemetry({
        health: event.health,
        maxHealth: event.maxHealth,
        recentDamage: recentDamage.current,
      });
      lastCombat.current = 0;
    });

    const onCommand = gameplayEventBus.on("onGameplayCommand", ({ command }) => {
      if (/combat|attack|wave/i.test(command)) lastCombat.current = 0;
    });

    return () => {
      unhealth();
      onCommand();
    };
  }, []);

  useFrame((_, deltaSeconds) => {
    const isPlaying = useGameConfigStore.getState().isPlaying;
    if (!isPlaying) return;

    const delta = Math.min(0.25, Math.max(0, deltaSeconds));
    elapsed.current += delta;
    lastCombat.current += delta;
    recentDamage.current *= Math.exp(-delta / 6);

    const macro = useMacroGameStore.getState();
    const gameplayPlayer = useGameplayStore.getState().players["player_1"];

    macro.updateTelemetry({
      ...(gameplayPlayer
        ? {
            health: gameplayPlayer.health,
            maxHealth: gameplayPlayer.maxHealth,
          }
        : {}),
      recentDamage: recentDamage.current,
      timeSinceCombatSeconds: lastCombat.current,
    });

    worldClockAccumulator.current += delta;
    loopAccumulator.current += delta;

    if (loopAccumulator.current >= 0.25) {
      const loopDelta = loopAccumulator.current;
      loopAccumulator.current = 0;
      macro.tickDirector(loopDelta);
      if (macro.world.timeRemainingSeconds > 0) {
        macro.tickGameLoop(loopDelta);
      }
    }

    if (worldClockAccumulator.current >= 0.25) {
      worldClockAccumulator.current = 0;
      macro.setWorldState({
        timeRemainingSeconds: Math.max(
          0,
          macro.world.timeLimitMinutes * 60 - elapsed.current,
        ),
      });
    }


  });

  return null;
}
