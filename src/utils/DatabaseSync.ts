import { useAudioStore } from "../store/useAudioStore";
import { useEditorStore } from "../store/useEditorStore";
import { useGameConfigStore, type CutsceneData } from "../store/useGameConfigStore";
import { useGraphicsStore } from "../store/useGraphicsStore";
import { useLogicStore } from "../store/useLogicStore";
import { useSceneStore } from "../store/useSceneStore";
import { useVfxStore } from "../store/useVfxStore";

const STORAGE_KEY = "genesis-canvas:project:v1";
const MAX_IMPORT_BYTES = 12 * 1024 * 1024;

export interface ProjectSnapshot {
  version: 1;
  savedAt: string;
  editor: {
    chatInput: string;
    lastPrompt: string | null;
    log: ReturnType<typeof useEditorStore.getState>["log"];
    spawnedObjects: ReturnType<typeof useEditorStore.getState>["spawnedObjects"];
    selectedId: string | null;
    transformMode: ReturnType<typeof useEditorStore.getState>["transformMode"];
    webgpuEnabled: boolean;
    rendererLabel: string;
    cameraMode: ReturnType<typeof useEditorStore.getState>["cameraMode"];
    playerEnabled: boolean;
    loadingProgress: number;
    graphicsQuality: ReturnType<typeof useEditorStore.getState>["graphicsQuality"];
    network: ReturnType<typeof useEditorStore.getState>["network"];
    showPerf: boolean;
  };
  scene: {
    nodes: ReturnType<typeof useSceneStore.getState>["nodes"];
    selectedNodeId: string | null;
    expandedIds: string[];
    search: string;
    networkEntities: ReturnType<typeof useSceneStore.getState>["networkEntities"];
  };
  logic: {
    nodes: ReturnType<typeof useLogicStore.getState>["nodes"];
    edges: ReturnType<typeof useLogicStore.getState>["edges"];
    logicOpen: boolean;
    selectedNodeId: string | null;
  };
  game: {
    primaryGenre: string;
    subGenre: string;
    multiplayerMode: ReturnType<typeof useGameConfigStore.getState>["multiplayerMode"];
    blueprintOpen: boolean;
    localPlayerCount: 2 | 3 | 4;
    multiplayerMenuOpen: boolean;
    isPlaying: boolean;
    timeOfDay: number;
    terrain: ReturnType<typeof useGameConfigStore.getState>["terrain"];
    viewMode: ReturnType<typeof useGameConfigStore.getState>["viewMode"];
    activeTab: ReturnType<typeof useGameConfigStore.getState>["activeTab"];
    pipelineRunning: boolean;
    pipelinePrompt: string | null;
    stages: ReturnType<typeof useGameConfigStore.getState>["stages"];
    menus: ReturnType<typeof useGameConfigStore.getState>["menus"];
    characterPanelOpen: boolean;
    characters: ReturnType<typeof useGameConfigStore.getState>["characters"];
    cinematicsOpen: boolean;
    cutsceneData: CutsceneData | null;
  };
  vfx: {
    emitters: ReturnType<typeof useVfxStore.getState>["emitters"];
    decals: ReturnType<typeof useVfxStore.getState>["decals"];
  };
  audio: {
    sources: ReturnType<typeof useAudioStore.getState>["sources"];
    zones: ReturnType<typeof useAudioStore.getState>["zones"];
    enabled: boolean;
  };
  graphics: {
    resolution: number;
    displayMode: ReturnType<typeof useGraphicsStore.getState>["displayMode"];
    upscaling: ReturnType<typeof useGraphicsStore.getState>["upscaling"];
    vSync: boolean;
    refreshRate: number;
    fov: number;
    drawDistance: number;
    textureQuality: ReturnType<typeof useGraphicsStore.getState>["textureQuality"];
    modelQuality: ReturnType<typeof useGraphicsStore.getState>["modelQuality"];
    anisotropicFiltering: number;
    shadowQuality: ReturnType<typeof useGraphicsStore.getState>["shadowQuality"];
    shadowsEnabled: boolean;
    rayTracing: boolean;
    volumetricFog: boolean;
    antiAliasing: ReturnType<typeof useGraphicsStore.getState>["antiAliasing"];
    ambientOcclusion: boolean;
    motionBlur: boolean;
    depthOfField: boolean;
    bloom: boolean;
    bloomIntensity: number;
  };
}

export interface StoredProjectEnvelope {
  version: 1;
  encoding: "gzip+base64" | "json";
  data: string;
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

async function gzipText(text: string): Promise<string> {
  if (typeof CompressionStream === "undefined") return text;
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(new TextEncoder().encode(text));
  await writer.close();
  return bytesToBase64(new Uint8Array(await new Response(stream.readable).arrayBuffer()));
}

async function gunzipText(value: string): Promise<string> {
  if (typeof DecompressionStream === "undefined") return value;
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(base64ToBytes(value));
  await writer.close();
  return new TextDecoder().decode(await new Response(stream.readable).arrayBuffer());
}

export function createProjectSnapshot(): ProjectSnapshot {
  const editor = useEditorStore.getState();
  const scene = useSceneStore.getState();
  const logic = useLogicStore.getState();
  const game = useGameConfigStore.getState();
  const vfx = useVfxStore.getState();
  const audio = useAudioStore.getState();
  const graphics = useGraphicsStore.getState();

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    editor: {
      chatInput: editor.chatInput,
      lastPrompt: editor.lastPrompt,
      log: editor.log,
      spawnedObjects: editor.spawnedObjects,
      selectedId: editor.selectedId,
      transformMode: editor.transformMode,
      webgpuEnabled: editor.webgpuEnabled,
      rendererLabel: editor.rendererLabel,
      cameraMode: editor.cameraMode,
      playerEnabled: editor.playerEnabled,
      loadingProgress: editor.loadingProgress,
      graphicsQuality: editor.graphicsQuality,
      network: editor.network,
      showPerf: editor.showPerf,
    },
    scene: {
      nodes: scene.nodes,
      selectedNodeId: scene.selectedNodeId,
      expandedIds: scene.expandedIds,
      search: scene.search,
      networkEntities: scene.networkEntities,
    },
    logic: {
      nodes: logic.nodes,
      edges: logic.edges,
      logicOpen: logic.logicOpen,
      selectedNodeId: logic.selectedNodeId,
    },
    game: {
      primaryGenre: game.primaryGenre,
      subGenre: game.subGenre,
      multiplayerMode: game.multiplayerMode,
      blueprintOpen: game.blueprintOpen,
      localPlayerCount: game.localPlayerCount,
      multiplayerMenuOpen: game.multiplayerMenuOpen,
      isPlaying: game.isPlaying,
      timeOfDay: game.timeOfDay,
      terrain: game.terrain,
      viewMode: game.viewMode,
      activeTab: game.activeTab,
      pipelineRunning: false,
      pipelinePrompt: game.pipelinePrompt,
      stages: game.stages,
      menus: game.menus,
      characterPanelOpen: game.characterPanelOpen,
      characters: game.characters,
      cinematicsOpen: game.cinematicsOpen,
      cutsceneData: game.cutsceneData,
    },
    vfx: {
      emitters: vfx.emitters,
      decals: vfx.decals,
    },
    audio: {
      sources: audio.sources,
      zones: audio.zones,
      enabled: audio.enabled,
    },
    graphics: {
      resolution: graphics.resolution,
      displayMode: graphics.displayMode,
      upscaling: graphics.upscaling,
      vSync: graphics.vSync,
      refreshRate: graphics.refreshRate,
      fov: graphics.fov,
      drawDistance: graphics.drawDistance,
      textureQuality: graphics.textureQuality,
      modelQuality: graphics.modelQuality,
      anisotropicFiltering: graphics.anisotropicFiltering,
      shadowQuality: graphics.shadowQuality,
      shadowsEnabled: graphics.shadowsEnabled,
      rayTracing: graphics.rayTracing,
      volumetricFog: graphics.volumetricFog,
      antiAliasing: graphics.antiAliasing,
      ambientOcclusion: graphics.ambientOcclusion,
      motionBlur: graphics.motionBlur,
      depthOfField: graphics.depthOfField,
      bloom: graphics.bloom,
      bloomIntensity: graphics.bloomIntensity,
    },
  };
}

export async function encodeProject(snapshot = createProjectSnapshot()): Promise<StoredProjectEnvelope> {
  const json = JSON.stringify(snapshot);
  const compressed = await gzipText(json);
  return {
    version: 1,
    encoding: typeof CompressionStream === "undefined" ? "json" : "gzip+base64",
    data: compressed,
  };
}

export async function decodeProject(value: unknown): Promise<ProjectSnapshot> {
  if (!value || typeof value !== "object") throw new Error("Project payload is not an object.");
  const envelope = value as Partial<StoredProjectEnvelope>;
  if (envelope.version !== 1 || typeof envelope.data !== "string") throw new Error("Unsupported project payload.");
  if (envelope.data.length > MAX_IMPORT_BYTES * 2) throw new Error("Project payload is too large.");
  const json = envelope.encoding === "gzip+base64" ? await gunzipText(envelope.data) : envelope.data;
  const parsed = JSON.parse(json) as ProjectSnapshot;
  if (parsed.version !== 1 || !parsed.editor || !parsed.scene || !parsed.logic || !parsed.game) {
    throw new Error("Invalid Genesis project file.");
  }
  return parsed;
}

export async function saveProject(): Promise<StoredProjectEnvelope> {
  const envelope = await encodeProject();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}

export async function loadProject(): Promise<ProjectSnapshot | null> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return decodeProject(JSON.parse(raw));
}

export function downloadProject(envelope: StoredProjectEnvelope, filename = "genesis-project.json") {
  const blob = new Blob([JSON.stringify(envelope)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readProjectFile(file: File): Promise<ProjectSnapshot> {
  return decodeProject(JSON.parse(await file.text()));
}

export function restoreProject(snapshot: ProjectSnapshot) {
  useEditorStore.setState({
    chatInput: snapshot.editor.chatInput,
    lastPrompt: snapshot.editor.lastPrompt,
    log: snapshot.editor.log,
    spawnedObjects: snapshot.editor.spawnedObjects,
    selectedId: snapshot.editor.selectedId,
    transformMode: snapshot.editor.transformMode,
    webgpuEnabled: snapshot.editor.webgpuEnabled,
    rendererLabel: snapshot.editor.rendererLabel,
    cameraMode: snapshot.editor.cameraMode,
    playerEnabled: snapshot.editor.playerEnabled,
    loadingProgress: snapshot.editor.loadingProgress,
    graphicsQuality: snapshot.editor.graphicsQuality,
    network: snapshot.editor.network,
    showPerf: snapshot.editor.showPerf,
    aiThinking: false,
    streamText: "",
    isLoading: false,
  });
  useSceneStore.setState({
    nodes: snapshot.scene.nodes,
    selectedNodeId: snapshot.scene.selectedNodeId,
    expandedIds: snapshot.scene.expandedIds,
    search: snapshot.scene.search,
    networkEntities: snapshot.scene.networkEntities,
  });
  useLogicStore.setState({
    nodes: snapshot.logic.nodes,
    edges: snapshot.logic.edges,
    logicOpen: snapshot.logic.logicOpen,
    selectedNodeId: snapshot.logic.selectedNodeId,
  });
  useGameConfigStore.setState({
    primaryGenre: snapshot.game.primaryGenre,
    subGenre: snapshot.game.subGenre,
    multiplayerMode: snapshot.game.multiplayerMode,
    blueprintOpen: snapshot.game.blueprintOpen,
    localPlayerCount: snapshot.game.localPlayerCount,
    multiplayerMenuOpen: snapshot.game.multiplayerMenuOpen,
    isPlaying: snapshot.game.isPlaying,
    timeOfDay: snapshot.game.timeOfDay,
    terrain: snapshot.game.terrain,
    viewMode: snapshot.game.viewMode,
    activeTab: snapshot.game.activeTab,
    pipelineRunning: false,
    pipelinePrompt: snapshot.game.pipelinePrompt,
    stages: snapshot.game.stages,
    menus: snapshot.game.menus,
    characterPanelOpen: snapshot.game.characterPanelOpen,
    characters: snapshot.game.characters,
    cinematicsOpen: snapshot.game.cinematicsOpen,
    cutsceneData: snapshot.game.cutsceneData,
  });
  useVfxStore.setState({
    emitters: snapshot.vfx.emitters,
    decals: snapshot.vfx.decals,
  });
  useAudioStore.setState({
    sources: snapshot.audio.sources,
    zones: snapshot.audio.zones,
    enabled: snapshot.audio.enabled,
  });
  useGraphicsStore.setState(snapshot.graphics);
}

export async function saveProjectToFile(filename = "genesis-project.json") {
  const envelope = await encodeProject();
  downloadProject(envelope, filename);
  return envelope;
}

/** Future Supabase REST-compatible save signature. */
export async function saveProjectToSupabase(
  payload: StoredProjectEnvelope,
  endpoint?: string,
  accessToken?: string,
): Promise<{ ok: boolean; message: string }> {
  if (!endpoint) return { ok: false, message: "Supabase endpoint not configured yet." };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { ok: false, message: "Supabase save failed (" + response.status + ")." };
  return { ok: true, message: "Project saved to Supabase." };
}
