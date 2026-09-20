import {
  Box,
  Camera,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderTree,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "../../store/useEditorStore";
import { useGameConfigStore } from "../../store/useGameConfigStore";
import {
  DIRECTIONAL_LIGHT_ID,
  GROUND_ID,
  MAIN_CAMERA_ID,
  SCENE_ROOT_ID,
  TEST_CUBE_ID,
  useSceneStore,
  type SceneNode,
} from "../../store/useSceneStore";

function IconForType({ type }: { type: SceneNode["type"] }) {
  if (type === "light") return <Lightbulb className="h-3.5 w-3.5" />;
  if (type === "camera") return <Video className="h-3.5 w-3.5" />;
  if (type === "group") return <FolderTree className="h-3.5 w-3.5" />;
  return <Box className="h-3.5 w-3.5" />;
}

function SceneRow({
  node,
  depth,
  hasChildren,
  expanded,
  selected,
  onSelect,
  onToggle,
  onVisibility,
  onRename,
  onDuplicate,
  onDelete,
}: {
  node: SceneNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onVisibility: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const [menu, setMenu] = useState(false);

  const finishRename = () => {
    const name = draft.trim();
    if (name) onRename(name);
    setDraft(name || node.name);
    setEditing(false);
  };

  return (
    <div
      className={`group flex h-8 items-center gap-1 rounded-md px-1.5 text-[11px] transition-colors ${selected ? "bg-primary/15 text-primary" : "text-foreground/75 hover:bg-secondary/60"}`}
      style={{ paddingLeft: 6 + depth * 14 }}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu((value) => !value);
      }}
    >
      <button
        type="button"
        disabled={!hasChildren}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="grid h-5 w-5 shrink-0 place-items-center text-muted-foreground disabled:opacity-0"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className={`shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}>
          <IconForType type={node.type} />
        </span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={finishRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") finishRename();
              if (e.key === "Escape") {
                setDraft(node.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded bg-background/80 px-1 py-0.5 text-[11px] outline-none ring-1 ring-primary/40"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{node.name}</span>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onVisibility();
        }}
        className="hidden rounded p-1 text-muted-foreground hover:text-primary group-hover:block"
        aria-label={node.visible ? "Hide object" : "Show object"}
      >
        {node.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-60" />}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenu((value) => !value);
        }}
        className="hidden rounded p-1 text-muted-foreground hover:text-primary group-hover:block"
        aria-label="Object actions"
      >
        <MoreHorizontal className="h-3 w-3" />
      </button>

      {menu && (
        <div className="absolute right-2 z-30 mt-20 w-36 rounded-lg border border-border/70 bg-card/95 p-1 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] hover:bg-secondary"
            onClick={() => {
              setDraft(node.name);
              setEditing(true);
              setMenu(false);
            }}
          >
            <Pencil className="h-3 w-3" /> Rename
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] hover:bg-secondary"
            onClick={() => {
              onDuplicate();
              setMenu(false);
            }}
          >
            <Copy className="h-3 w-3" /> Duplicate
          </button>
          <button
            type="button"
            disabled={node.id === SCENE_ROOT_ID}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-destructive hover:bg-secondary disabled:opacity-40"
            onClick={() => {
              onDelete();
              setMenu(false);
            }}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function SceneGraph() {
  const viewMode = useGameConfigStore((s) => s.viewMode);
  const isPlaying = useGameConfigStore((s) => s.isPlaying);
  const nodes = useSceneStore((s) => s.nodes);
  const selectedNodeId = useSceneStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useSceneStore((s) => s.setSelectedNodeId);
  const expandedIds = useSceneStore((s) => s.expandedIds);
  const toggleExpanded = useSceneStore((s) => s.toggleExpanded);
  const search = useSceneStore((s) => s.search);
  const setSearch = useSceneStore((s) => s.setSearch);
  const updateNode = useSceneStore((s) => s.updateNode);
  const removeNode = useSceneStore((s) => s.removeNode);
  const duplicateNode = useSceneStore((s) => s.duplicateNode);

  const selectedEditorId = useEditorStore((s) => s.selectedId);
  const setSelectedEditorId = useEditorStore((s) => s.setSelectedId);
  const spawnedObjects = useEditorStore((s) => s.spawnedObjects);
  const removeObject = useEditorStore((s) => s.removeObject);
  const spawnObject = useEditorStore((s) => s.spawnObject);

  // Generated editor entities mirror into the global scene graph.
  useEffect(() => {
    useSceneStore.getState().upsertObjectNodes(
      spawnedObjects.map((object) => ({
        id: object.id,
        name: object.name,
        position: object.position,
        visible: object.visible,
        locked: object.locked,
      })),
    );
  }, [spawnedObjects]);

  // Keep viewport selection and outliner selection synchronized.
  useEffect(() => {
    if (!selectedEditorId) {
      if (selectedNodeId?.startsWith("object:")) setSelectedNodeId(null);
      return;
    }
    const objectNodeId = `object:${selectedEditorId}`;
    if (nodes.some((node) => node.id === objectNodeId) && selectedNodeId !== objectNodeId) {
      setSelectedNodeId(objectNodeId);
    }
  }, [nodes, selectedEditorId, selectedNodeId, setSelectedNodeId]);

  const visibleNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return nodes;
    const matched = new Set(nodes.filter((node) => node.name.toLowerCase().includes(query)).map((node) => node.id));
    for (const node of nodes) {
      let parent = node.parentId;
      while (parent) {
        if (matched.has(parent)) break;
        const p = nodes.find((candidate) => candidate.id === parent);
        if (!p) break;
        matched.add(p.id);
        parent = p.parentId;
      }
    }
    return nodes.filter((node) => matched.has(node.id));
  }, [nodes, search]);

  const childMap = useMemo(() => {
    const map = new Map<string | null, SceneNode[]>();
    for (const node of visibleNodes) {
      const list = map.get(node.parentId) ?? [];
      list.push(node);
      map.set(node.parentId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [visibleNodes]);

  const select = (node: SceneNode) => {
    setSelectedNodeId(node.id);
    if (node.id.startsWith("object:")) {
      const editorId = node.id.slice("object:".length);
      setSelectedEditorId(editorId);
    } else {
      setSelectedEditorId(null);
    }
  };

  const isVisible = (node: SceneNode) => {
    if (!node.visible) return false;
    let parent = node.parentId;
    while (parent) {
      const p = nodes.find((candidate) => candidate.id === parent);
      if (!p) break;
      if (!p.visible) return false;
      parent = p.parentId;
    }
    return true;
  };

  const toggleVisibility = (node: SceneNode) => {
    const nextVisible = !node.visible;
    updateNode(node.id, { visible: nextVisible });
    if (node.id.startsWith("object:")) {
      useEditorStore.getState().updateObject(node.id.slice("object:".length), {
        visible: nextVisible,
      });
    }
  };

  const deleteNode = (node: SceneNode) => {
    if (node.id.startsWith("object:")) removeObject(node.id.slice("object:".length));
    removeNode(node.id);
    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
      setSelectedEditorId(null);
    }
  };

  const duplicate = (node: SceneNode) => {
    if (node.id.startsWith("object:")) {
      const object = spawnedObjects.find((item) => item.id === node.id.slice("object:".length));
      if (!object) return;
      const newId = spawnObject({
        ...object,
        id: undefined,
        name: `${object.name} Copy`,
        position: [object.position[0] + 1.5, object.position[1], object.position[2] + 1.5],
        visible: object.visible,
        locked: object.locked,
      });
      setSelectedEditorId(newId);
      return;
    }
    duplicateNode(node.id);
  };

  const renameNode = (node: SceneNode, name: string) => {
    updateNode(node.id, { name });
    if (node.id.startsWith("object:")) {
      const id = node.id.slice("object:".length);
      useEditorStore.getState().updateObject(id, { name });
    }
  };

  const renderTree = (parentId: string | null, depth = 0): React.ReactNode => {
    const children = childMap.get(parentId) ?? [];
    return children.flatMap((node) => {
      const hasChildren = (childMap.get(node.id) ?? []).length > 0;
      const row = (
        <div key={node.id} className="relative">
          <SceneRow
            node={node}
            depth={depth}
            hasChildren={hasChildren}
            expanded={expandedIds.includes(node.id)}
            selected={selectedNodeId === node.id || (node.id.startsWith("object:") && selectedEditorId === node.id.slice(7))}
            onSelect={() => select(node)}
            onToggle={() => toggleExpanded(node.id)}
            onVisibility={() => toggleVisibility(node)}
            onRename={(name) => renameNode(node, name)}
            onDuplicate={() => duplicate(node)}
            onDelete={() => deleteNode(node)}
          />
        </div>
      );
      return expandedIds.includes(node.id) || Boolean(search.trim()) ? [row, ...renderTree(node.id, depth + 1)] : [row];
    });
  };

  if (viewMode !== "scene" || isPlaying) return null;

  return (
    <aside className="pointer-events-auto absolute left-4 top-20 bottom-28 z-20 flex w-64 flex-col overflow-hidden rounded-2xl border border-primary/10 bg-card/65 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/80">Scene Graph</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{nodes.length} nodes</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:text-primary"
          title="Reset scene graph"
          onClick={() => useSceneStore.getState().reset()}
        >
          <FolderTree className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="border-b border-border/60 p-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/45 px-2.5 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter objects…"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{renderTree(null)}</div>
    </aside>
  );
}
