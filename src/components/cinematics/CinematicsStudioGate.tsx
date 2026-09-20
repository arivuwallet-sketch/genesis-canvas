import { useEffect, useRef } from "react";

export function CinematicsStudioGate({ active }: { active: boolean }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    void Promise.all([
      import("@theatre/studio"),
      import("@theatre/r3f/dist/extension"),
    ]).then(([studioModule, extensionModule]) => {
      if (cancelled) return;
      const studio = studioModule.default;
      if (!initialized.current) {
        studio.initialize();
        studio.extend(extensionModule.extension);
        initialized.current = true;
      }
      studio.ui.restore();
    }).catch((error) => {
      console.warn("[Cinematics] Theatre Studio unavailable", error);
    });

    return () => {
      cancelled = true;
      void import("@theatre/studio")
        .then((studioModule) => studioModule.default.ui.hide())
        .catch(() => undefined);
    };
  }, [active]);

  return null;
}
