import { Film } from "lucide-react";
import { useGameConfigStore } from "../../store/useGameConfigStore";

export function CinematicsToggle() {
  const open = useGameConfigStore((state) => state.cinematicsOpen);
  const setOpen = useGameConfigStore((state) => state.setCinematicsOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={"glass-panel rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors " + (open ? "text-primary" : "text-muted-foreground hover:text-primary")}
    >
      <span className="flex items-center gap-1.5">
        <Film className="h-3.5 w-3.5" />
        Cinematics
      </span>
    </button>
  );
}
