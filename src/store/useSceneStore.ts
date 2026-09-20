import { create } from "zustand";

export type SceneNodeType = "mesh" | "light" | "camera" | "group";

export type NetworkEntityType = "player" | "boss" | "npc" | "object";

export interface NetworkEntity {
  id: string;
  name: string;
  type: NetworkEntityType;
  position: [number, number, number];
  rotationY: number;
  color: string;
  updatedAt: number;
}

export interface SceneNode {
  id: string;
  name: string;
  type: SceneNodeType;
  visible: boolean;
  locked: boolean;
  parentId: string | null;
  position: [number, number, number];
}

export const SCENE_ROOT_ID = "3f7c2d1a-1d5a-4c55-9e23-9c6b2f6b8d01";
export const MAIN_CAMERA_ID = "c4e8c5c7-3ab7-4f45-8b17-1f4d4f6b1001";
export const DIRECTIONAL_LIGHT_ID = "c4e8c5c7-3ab7-4f45-8b17-1f4d4f6b1002";
export const GROUND_ID = "c4e8c5c7-3ab7-4f45-8b17-1f4d4f6b1003";
export const TEST_CUBE_ID = "c4e8c5c7-3ab7-4f45-8b17-1f4d4f6b1004";

const DEFAULT_NODES: SceneNode[] = [
  {
    id: SCENE_ROOT_ID,
    name: "World",
    type: "group",
    visible: true,
    locked: false,
    parentId: null,
    position: [0, 0, 0],
  },
  {
    id: MAIN_CAMERA_ID,
    name: "Main Camera",
    type: "camera",
    visible: true,
    locked: false,
    parentId: SCENE_ROOT_ID,
    position: [9, 7, 12],
  },
  {
    id: DIRECTIONAL_LIGHT_ID,
    name: "Directional Light",
    type: "light",
    visible: true,
    locked: false,
    parentId: SCENE_ROOT_ID,
    position: [10, 16, 8],
  },
  {
    id: GROUND_ID,
    name: "Ground",
    type: "mesh",
    visible: true,
    locked: false,
    parentId: SCENE_ROOT_ID,
    position: [0, -0.25, 0],
  },
  {
    id: TEST_CUBE_ID,
    name: "Test Cube",
    type: "mesh",
    visible: true,
    locked: false,
    parentId: SCENE_ROOT_ID,
    position: [0, 6, 0],
  },
];

const uid = () => {
  const g = globalThis.crypto?.randomUUID?.();
  return g ?? `scene-${Math.random().toString(36).slice(2, 12)}`;
};

interface SceneState {
  nodes: SceneNode[];
  selectedNodeId: string | null;
  expandedIds: string[];
  search: string;
  networkEntities: NetworkEntity[];
  setSelectedNodeId: (id: string | null) => void;
  setSearch: (value: string) => void;
  toggleExpanded: (id: string) => void;
  addNode: (node: Omit<SceneNode, "id"> & { id?: string }) => string;
  updateNode: (id: string, patch: Partial<SceneNode>) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => string | null;
  upsertObjectNodes: (
    objects: Array<{
      id: string;
      name: string;
      position: [number, number, number];
    }>,
  ) => void;
  upsertNetworkEntity: (entity: NetworkEntity) => void;
  removeNetworkEntity: (id: string) => void;
  clearNetworkEntities: () => void;
  reset: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  nodes: DEFAULT_NODES,
  selectedNodeId: null,
  expandedIds: [SCENE_ROOT_ID],
  search: "",
  networkEntities: [],

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSearch: (search) => set({ search }),
  toggleExpanded: (id) =>
    set((state) => ({
      expandedIds: state.expandedIds.includes(id)
        ? state.expandedIds.filter((value) => value !== id)
        : [...state.expandedIds, id],
    })),
  addNode: (node) => {
    const id = node.id ?? uid();
    set((state) => ({ nodes: [...state.nodes, { ...node, id }] }));
    return id;
  },
  updateNode: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...patch, id: node.id } : node,
      ),
    })),
  removeNode: (id) => {
    if (id === SCENE_ROOT_ID) return;
    set((state) => {
      const descendants = new Set<string>();
      const collect = (parentId: string) => {
        for (const node of state.nodes) {
          if (node.parentId === parentId) {
            descendants.add(node.id);
            collect(node.id);
          }
        }
      };
      collect(id);
      descendants.add(id);
      return {
        nodes: state.nodes.filter((node) => !descendants.has(node.id)),
        selectedNodeId:
          state.selectedNodeId && descendants.has(state.selectedNodeId)
            ? null
            : state.selectedNodeId,
      };
    });
  },
  duplicateNode: (id) => {
    const node = get().nodes.find((item) => item.id === id);
    if (!node) return null;
    const newId = uid();
    set((state) => ({
      nodes: [
        ...state.nodes,
        {
          ...node,
          id: newId,
          name: `${node.name} Copy`,
          position: [node.position[0] + 1.5, node.position[1], node.position[2] + 1.5],
        },
      ],
      selectedNodeId: newId,
    }));
    return newId;
  },
  upsertObjectNodes: (objects) =>
    set((state) => {
      const objectIds = new Set(objects.map((object) => object.id));
      const nonObjectNodes = state.nodes.filter(
        (node) =>
          !node.id.startsWith("object:") || objectIds.has(node.id.slice("object:".length)),
      );
      const existing = new Map(nonObjectNodes.map((node) => [node.id, node]));
      const objectNodes = objects.map((object) => {
        const id = `object:${object.id}`;
        const previous = existing.get(id);
        return {
          id,
          name: object.name,
          type: "mesh" as const,
          visible: object.visible ?? previous?.visible ?? true,
          locked: object.locked ?? previous?.locked ?? false,
          parentId: SCENE_ROOT_ID,
          position: object.position,
        };
      });
      return { nodes: [...nonObjectNodes, ...objectNodes] };
    }),
  upsertNetworkEntity: (entity) =>
    set((state) => {
      const index = state.networkEntities.findIndex((item) => item.id === entity.id);
      if (index < 0) return { networkEntities: [...state.networkEntities, entity] };
      const next = state.networkEntities.slice();
      next[index] = entity;
      return { networkEntities: next };
    }),
  removeNetworkEntity: (id) =>
    set((state) => ({
      networkEntities: state.networkEntities.filter((item) => item.id !== id),
    })),
  clearNetworkEntities: () => set({ networkEntities: [] }),
  reset: () => set({
    nodes: DEFAULT_NODES,
    selectedNodeId: null,
    expandedIds: [SCENE_ROOT_ID],
    search: "",
    networkEntities: [],
  }),
}));
