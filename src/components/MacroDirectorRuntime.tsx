import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { gameplayEventBus } from "../gameplay/GameplayEventBus";
import { useGameplayStore } from "../store/useGameplayStore";
import { useMacroGameStore } from "../store/useMacroGameStore";

export function MacroDirectorRuntime() {
  const elapsed = useRef(0);
  const recentDamage = useRef(0);
  const lastCombat = useRef(30);

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

    macro.tickDirector(delta);
    macro.setWorldState({
      timeRemainingSeconds: Math.max(
        0,
        macro.world.timeLimitMinutes * 60 - elapsed.current,
      ),
    });
  });

  return null;
}
