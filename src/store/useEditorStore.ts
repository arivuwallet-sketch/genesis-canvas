import { create } from "zustand";

interface EditorState {
  chatInput: string;
  setChatInput: (value: string) => void;
  lastPrompt: string | null;
  submitPrompt: () => void;
  showPerf: boolean;
  togglePerf: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  chatInput: "",
  setChatInput: (value) => set({ chatInput: value }),
  lastPrompt: null,
  submitPrompt: () => {
    const value = get().chatInput.trim();
    if (!value) return;
    set({ lastPrompt: value, chatInput: "" });
  },
  showPerf: false,
  togglePerf: () => set((s) => ({ showPerf: !s.showPerf })),
}));
