import { create } from "zustand";
import { GENRE_MATRIX, type MultiplayerMode } from "../data/genres";
import { useEditorStore } from "./useEditorStore";
import { useSceneStore } from "./useSceneStore";
import { useLogicStore } from "./useLogicStore";
import type { LogicEdge, LogicNode } from "./useLogicStore";

export type AgentTab =
  | "master"
  | "story"
  | "mechanics"
  | "assets";

export const AGENT_TABS: { id: AgentTab; label: string }[] = [
  { id: "master", label: "Master Prompt" },
  { id: "story", label: "Story & Scene Planner" },
  { id: "mechanics", label: "Mechanics & Logic Planner" },
  { id: "assets", label: "Asset Generation" },
];

export type StageStatus = "idle" | "running" | "done";

export interface PipelineStage {
  id: string;
  label: string;
  status: StageStatus;
  output: string[];
}

export interface CharacterBehavior {
  id: string;
  name: string;
  role: "Player" | "NPC";
  fightingStyle: string;
  movementSpeed: number;
  patrolPath: string;
  dialogueTree: string[];
  aggression: number;
}

export interface MenuWidget {
  id: string;
  title: string;
  /** Docked in the chat feed, or dropped onto the 3D viewport overlay. */
  placed: boolean;
  x: number;
  y: number;
}

interface GameConfigState {
  /* blueprint */
  primaryGenre: string;
  subGenre: string;
  multiplayerMode: MultiplayerMode;
  blueprintOpen: boolean;
  setPrimaryGenre: (genre: string) => void;
  setSubGenre: (sub: string) => void;
  setMultiplayerMode: (mode: MultiplayerMode) => void;
  setBlueprintOpen: (open: boolean) => void;

  /* world / play mode */
  isPlaying: boolean;
  timeOfDay: number;
  terrain: {
    roughness: number;
    mountainHeight: number;
    biomeColor: string;
  };
  setPlaying: (playing: boolean) => void;
  setTimeOfDay: (time: number) => void;
  setTerrain: (patch: Partial<GameConfigState["terrain"]>) => void;

  /* agents */
  activeTab: AgentTab;
  setActiveTab: (tab: AgentTab) => void;

  /* pipeline */
  pipelineRunning: boolean;
  pipelinePrompt: string | null;
  stages: PipelineStage[];
  runMasterPrompt: (prompt: string) => void;
  resetPipeline: () => void;

  /* generated menus */
  menus: MenuWidget[];
  addMenu: (title: string) => void;
  placeMenu: (id: string, x: number, y: number) => void;
  removeMenu: (id: string) => void;

  /* character configurator */
  characterPanelOpen: boolean;
  setCharacterPanelOpen: (open: boolean) => void;
  characters: CharacterBehavior[];
  addCharacter: (c: Omit<CharacterBehavior, "id">) => void;
  updateCharacter: (id: string, patch: Partial<CharacterBehavior>) => void;
  removeCharacter: (id: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const STAGE_TEMPLATE: { id: string; label: string }[] = [
  { id: "story", label: "Generating story & scene beats" },
  { id: "mechanics", label: "Designing mechanics & logic" },
  { id: "assets", label: "Spawning assets into the scene" },
];

interface GenreProfile {
  story: string[];
  mechanics: string[];
  assets: string[];
  spawn: () => void;
  character: Omit<CharacterBehavior, "id">;
}

function spawnPrimitive(
  name: string,
  geometry: "box" | "sphere" | "cylinder" | "cone" | "torus" | "capsule",
  color: string,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  useEditorStore.getState().spawnObject({
    name,
    kind: "primitive",
    geometry,
    color,
    position,
    scale,
  });
}

/** Genre-specific dummy output for the mocked multi-agent run. */
function profileFor(genre: string, sub: string, mode: MultiplayerMode): GenreProfile {
  const tag = `${genre} · ${sub} · ${mode}`;

  if (genre === "Racing") {
    return {
      story: [`${tag}: rival circuit rises through 6 city districts`, "Act 1: qualifier night race"],
      mechanics: [
        "Vehicle physics node: 4-wheel raycast suspension",
        "Drift scoring + boost charge curve",
        "Rubber-band AI difficulty band: 0.15",
      ],
      assets: ["Chassis proxy", "Checkpoint gate", "Track barrier"],
      spawn: () => {
        spawnPrimitive("Vehicle chassis", "box", "#ff5f4d", [0, 3, -2], [2, 0.6, 4]);
        spawnPrimitive("Checkpoint gate", "torus", "#4dd2ff", [0, 3, -12], [3, 3, 3]);
      },
      character: {
        name: "Rival Driver",
        role: "NPC",
        fightingStyle: "Aggressive blocking line",
        movementSpeed: 48,
        patrolPath: "Racing line → apex markers loop",
        dialogueTree: ["Taunt on overtake", "Concede on lap 3"],
        aggression: 0.8,
      },
    };
  }

  if (genre === "Platformer") {
    return {
      story: [`${tag}: floating ruins split by a broken sky bridge`, "Act 1: learn the double jump"],
      mechanics: [
        "Jump logic: apex height 2.4m, coyote time 120ms",
        "Double jump + wall slide gating",
        "Moving platform kinematic node",
      ],
      assets: ["Launch pad", "Floating platform", "Collectible orb"],
      spawn: () => {
        spawnPrimitive("Floating platform", "box", "#b6f36a", [3, 2, -4], [3, 0.4, 3]);
        spawnPrimitive("Collectible orb", "sphere", "#ffd84d", [3, 4, -4], [0.4, 0.4, 0.4]);
      },
      character: {
        name: "Patrol Bot",
        role: "NPC",
        fightingStyle: "Contact damage hopper",
        movementSpeed: 4,
        patrolPath: "Ledge A ↔ Ledge B ping-pong",
        dialogueTree: ["(none)"],
        aggression: 0.3,
      },
    };
  }

  if (genre === "Horror") {
    return {
      story: [`${tag}: a drowned research station, power failing`, "Act 1: hide, do not fight"],
      mechanics: [
        "Stalker AI: sound cone + last-known-position search",
        "Sanity drain in darkness: 1.2/s",
        "Locker hide state with breath-hold input",
      ],
      assets: ["Flickering lamp", "Hiding locker", "Stalker proxy"],
      spawn: () => {
        spawnPrimitive("Hiding locker", "box", "#3a4a3a", [-4, 2, -3], [1, 2, 1]);
        spawnPrimitive("Stalker proxy", "capsule", "#8b1f1f", [4, 3, -6], [1, 1, 1]);
      },
      character: {
        name: "The Stalker",
        role: "NPC",
        fightingStyle: "Ambush grapple",
        movementSpeed: 6,
        patrolPath: "Deck 2 corridor loop → vent shortcuts",
        dialogueTree: ["Breathing cue", "Scream on detect"],
        aggression: 0.95,
      },
    };
  }

  if (genre === "Strategy") {
    return {
      story: [`${tag}: three houses contest a collapsing valley`, "Act 1: hold the river crossing"],
      mechanics: [
        "Unit board: 8 slots, synergy tiers 2/4/6",
        "Economy curve: +5 gold/round, interest cap 25",
        "Auto-battle resolve tick: 100ms",
      ],
      assets: ["Command tile", "Unit token", "Objective spire"],
      spawn: () => {
        spawnPrimitive("Objective spire", "cone", "#7ad7ff", [0, 3, -6], [1.5, 3, 1.5]);
        spawnPrimitive("Unit token", "cylinder", "#b6f36a", [-2, 2, -4], [0.8, 0.3, 0.8]);
      },
      character: {
        name: "Vanguard Unit",
        role: "NPC",
        fightingStyle: "Front-line shield wall",
        movementSpeed: 3,
        patrolPath: "Hold lane center, fall back at 30% HP",
        dialogueTree: ["Orders acknowledged", "Line breaking!"],
        aggression: 0.6,
      },
    };
  }

  if (genre === "Shooter") {
    return {
      story: [`${tag}: a compromised orbital relay`, "Act 1: breach the maintenance ring"],
      mechanics: [
        "Weapon node: recoil pattern + 0.08 spread bloom",
        "Cover-seeking AI utility scores",
        "Loadout slots: primary / sidearm / gadget",
      ],
      assets: ["Cover crate", "Ammo cache", "Enemy proxy"],
      spawn: () => {
        spawnPrimitive("Cover crate", "box", "#6f7d8c", [-3, 2, -5], [1.5, 1.2, 1.5]);
        spawnPrimitive("Enemy proxy", "capsule", "#ff7a4d", [3, 3, -8], [1, 1, 1]);
      },
      character: {
        name: "Relay Guard",
        role: "NPC",
        fightingStyle: "Suppress and flank",
        movementSpeed: 5.5,
        patrolPath: "Ring corridor waypoints 1-6",
        dialogueTree: ["Contact!", "Falling back", "Reloading"],
        aggression: 0.7,
      },
    };
  }

  return {
    story: [`${tag}: a hand-authored opening set piece`, "Act 1: establish the stakes"],
    mechanics: [
      "Core loop: explore → engage → upgrade",
      "Stamina node: 100 pool, 12/s regen",
      "Difficulty curve seeded from sub-genre",
    ],
    assets: ["Hero proxy", "Interactive prop", "Landmark"],
    spawn: () => {
      spawnPrimitive("Hero proxy", "capsule", "#b6f36a", [0, 3, -3], [1, 1, 1]);
      spawnPrimitive("Landmark", "torus", "#7ad7ff", [4, 3, -7], [1.6, 1.6, 1.6]);
    },
    character: {
      name: "Protagonist",
      role: "Player",
      fightingStyle: "Balanced melee / ranged",
      movementSpeed: 7,
      patrolPath: "Player controlled",
      dialogueTree: ["Greeting", "Quest accept", "Farewell"],
      aggression: 0.5,
    },
  };
}

const freshStages = (): PipelineStage[] =>
  STAGE_TEMPLATE.map((s) => ({ ...s, status: "idle" as StageStatus, output: [] }));

const timers: ReturnType<typeof setTimeout>[] = [];
const clearTimers = () => {
  while (timers.length) clearTimeout(timers.pop()!);
};

export const useGameConfigStore = create<GameConfigState>((set, get) => ({
  primaryGenre: GENRE_MATRIX[0]?.genre ?? "Action",
  subGenre: GENRE_MATRIX[0]?.subGenres[0] ?? "Hack and Slash",
  multiplayerMode: "Singleplayer",
  blueprintOpen: false,

  isPlaying: false,
  timeOfDay: 14,
  terrain: {
    roughness: 0.85,
    mountainHeight: 3.2,
    biomeColor: "#66745a",
  },
  setPlaying: (isPlaying) => set({ isPlaying }),
  setTimeOfDay: (time) => set({ timeOfDay: Math.max(0, Math.min(24, time)) }),
  setTerrain: (patch) =>
    set((state) => ({
      terrain: {
        ...state.terrain,
        ...patch,
        roughness:
          patch.roughness === undefined
            ? state.terrain.roughness
            : Math.max(0.1, Math.min(2, patch.roughness)),
        mountainHeight:
          patch.mountainHeight === undefined
            ? state.terrain.mountainHeight
            : Math.max(0, Math.min(15, patch.mountainHeight)),
      },
    })),
  setPrimaryGenre: (genre) => {
    const group = GENRE_MATRIX.find((g) => g.genre === genre);
    set({ primaryGenre: genre, subGenre: group?.subGenres[0] ?? "" });
  },
  setSubGenre: (sub) => set({ subGenre: sub }),
  setMultiplayerMode: (mode) => set({ multiplayerMode: mode }),
  setBlueprintOpen: (open) => set({ blueprintOpen: open }),

  activeTab: "master",
  setActiveTab: (tab) => set({ activeTab: tab }),

  pipelineRunning: false,
  pipelinePrompt: null,
  stages: freshStages(),

  resetPipeline: () => {
    clearTimers();
    set({ pipelineRunning: false, pipelinePrompt: null, stages: freshStages() });
  },

  runMasterPrompt: (prompt) => {
    if (get().pipelineRunning) return;
    clearTimers();

    const { primaryGenre, subGenre, multiplayerMode } = get();
    const profile = profileFor(primaryGenre, subGenre, multiplayerMode);
    const outputs: Record<string, string[]> = {
      story: profile.story,
      mechanics: profile.mechanics,
      assets: profile.assets,
    };

    set({ pipelineRunning: true, pipelinePrompt: prompt, stages: freshStages() });

    const editor = useEditorStore.getState();
    editor.pushLog(`Master prompt dispatched to the agent pipeline · ${primaryGenre} / ${subGenre}`, "system");

    const setStage = (id: string, status: StageStatus, output: string[] = []) =>
      set((s) => ({
        stages: s.stages.map((st) => (st.id === id ? { ...st, status, output } : st)),
      }));

    const schedule = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    STAGE_TEMPLATE.forEach((stage, i) => {
      schedule(() => setStage(stage.id, "running"), i * 2200);
      schedule(
        () => {
          setStage(stage.id, "done", outputs[stage.id] ?? []);
          if (stage.id === "mechanics") {
            const nodes: LogicNode[] = [
              {
                id: "event-start",
                type: "event",
                position: { x: 80, y: 120 },
                data: { kind: "event", label: "On Start", detail: `Initialize ${subGenre}` },
              },
              {
                id: "condition-mode",
                type: "condition",
                position: { x: 410, y: 120 },
                data: { kind: "condition", label: "Check Game State", detail: multiplayerMode },
              },
              {
                id: "action-spawn",
                type: "action",
                position: { x: 760, y: 120 },
                data: {
                  kind: "action",
                  label: genre === "Racing" ? "Spawn Vehicle" : genre === "Platformer" ? "Enable Jump" : "Spawn Player",
                  detail: outputs.mechanics[0] ?? "Initialize core loop",
                },
              },
              {
                id: "action-loop",
                type: "action",
                position: { x: 1090, y: 120 },
                data: {
                  kind: "action",
                  label: "Start Gameplay Loop",
                  detail: outputs.mechanics[1] ?? "Begin simulation",
                },
              },
            ];
            const edges: LogicEdge[] = [
              { id: "logic-start-mode", source: "event-start", target: "condition-mode", animated: true },
              { id: "logic-mode-action", source: "condition-mode", target: "action-spawn", animated: true },
              { id: "logic-action-loop", source: "action-spawn", target: "action-loop", animated: true },
            ];
            useLogicStore.getState().setGraph(nodes, edges);
          }
          if (stage.id === "assets") {
            profile.spawn();
            get().addCharacter(profile.character);
            useSceneStore.getState().upsertObjectNodes(
              useEditorStore.getState().spawnedObjects.map((object) => ({
                id: object.id,
                name: object.name,
                position: object.position,
              })),
            );
            set({ pipelineRunning: false, characterPanelOpen: true });
            useEditorStore
              .getState()
              .pushLog(
                `Pipeline complete — scene graph updated for a ${multiplayerMode} ${subGenre} build.`,
                "system",
              );
          }
        },
        i * 2200 + 1800,
      );
    });

    if (/\b(main )?menu\b/i.test(prompt)) {
      schedule(() => {
        get().addMenu(`${primaryGenre} Main Menu`);
        useEditorStore
          .getState()
          .pushLog(`${primaryGenre} Main Menu generated — drag it from the chat feed onto the viewport.`, "system");
      }, STAGE_TEMPLATE.length * 2200);
    }
  },

  menus: [],
  addMenu: (title) =>
    set((s) => ({
      menus: [...s.menus, { id: uid(), title, placed: false, x: 80, y: 140 }],
    })),
  placeMenu: (id, x, y) =>
    set((s) => ({
      menus: s.menus.map((m) => (m.id === id ? { ...m, placed: true, x, y } : m)),
    })),
  removeMenu: (id) => set((s) => ({ menus: s.menus.filter((m) => m.id !== id) })),

  characterPanelOpen: false,
  setCharacterPanelOpen: (open) => set({ characterPanelOpen: open }),
  characters: [],
  addCharacter: (c) => set((s) => ({ characters: [...s.characters, { ...c, id: uid() }] })),
  updateCharacter: (id, patch) =>
    set((s) => ({
      characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  removeCharacter: (id) => set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),
}));
