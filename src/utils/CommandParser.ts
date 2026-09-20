/**
 * CommandParser — translates AI JSON payloads into Zustand world updates.
 *
 * SECURITY: this module NEVER evaluates code. `eval`, `new Function` and any
 * other dynamic execution path are deliberately absent. Only strict
 * `JSON.parse` output is accepted, and every field is whitelisted, coerced and
 * clamped before it can touch the scene graph.
 */
import {
  useEditorStore,
  type PhysicsProps,
  type PrimitiveGeometry,
  type SpawnedObject,
} from "../store/useEditorStore";
import { MODEL_CATALOG, matchCatalog, type CatalogEntry } from "../data/modelCatalog";
import { useGameConfigStore, type CutsceneData } from "../store/useGameConfigStore";
import { useVfxStore, type DecalType, type ParticlePreset } from "../store/useVfxStore";
import { requestNetworkedBoss } from "../hooks/useColyseusClient";
import { spawnEcsBatch, updateEcsEntity, removeEcsEntity, clearEcs, ecsEntityFromRenderObject } from "../ecs/EcsCommandBus";

const GEOMETRIES: PrimitiveGeometry[] = [