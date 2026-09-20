import { FileText, FolderOpen, Save } from "lucide-react";
import { useRef, useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import {
  downloadProject,
  loadProject,
  readProjectFile,
  restoreProject,
  saveProject,
} from "../utils/DatabaseSync";

export function FileMenu() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const log = (text: string, kind: "system" | "error" = "system") =>
    useEditorStore.getState().pushLog(text, kind);

  const save = async () => {
    try {
      const envelope = await saveProject();
      downloadProject(envelope);
      log("Project saved to local storage and exported as genesis-project.json.");
      setOpen(false);
    } catch (error) {
      log("Project save failed: " + String(error), "error");
    }
  };

  const load = async () => {
    try {
      const snapshot = await loadProject();
      if (!snapshot) {
        log("No local Genesis project was saved yet.");
        return;
      }
      restoreProject(snapshot);
      log("Project restored from local storage.");
      setOpen(false);
    } catch (error) {
      log("Project load failed: " + String(error), "error");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={"glass-panel rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors " + (open ? "text-primary" : "text-muted-foreground hover:text-primary")}
      >
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          File
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border/70 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => void save()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-foreground/85 hover:bg-secondary"
          >
            <Save className="h-3.5 w-3.5 text-primary" />
            Save Project
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-foreground/85 hover:bg-secondary"
          >
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
            Load Project
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-foreground/85 hover:bg-secondary"
          >
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
            Import JSON…
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              void readProjectFile(file)
                .then((snapshot) => {
                  restoreProject(snapshot);
                  log("Project imported from " + file.name + ".");
                  setOpen(false);
                })
                .catch((error) => log("Project import failed: " + String(error), "error"));
            }}
          />
        </div>
      )}
    </div>
  );
}
