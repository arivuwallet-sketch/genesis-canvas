# Phase 14 — The Cognitive Core Pipeline

## Architecture

`User prompt -> spatial memory materialization -> Orchestrator LLM -> CommandParser -> ECS Command Bus -> renderer/physics -> delayed Visual QA -> correction commands`

### 1. Spatial Memory Sync

`src/workers/SceneStateSerializer.ts` runs on a 1000 ms interval. It reads the ECS store plus scene-graph/network fallbacks and keeps a previous encoded entity map.

Each compact entity row is:

`[id, category, x, y, z, scaleX, scaleY, scaleZ, boundsX, boundsY, boundsZ, bodyType, mass, friction, restitution, gravityScale]`

Only new, changed, and removed rows are produced on each tick:

- `added`: entities first seen by the serializer
- `updated`: entities whose compact row changed
- `removed`: IDs that disappeared

The serializer does not stringify a full snapshot every second. The current in-memory map is updated incrementally. `getLatestSceneStateJson()` materializes the current compact state only when an Orchestrator request is made, which preserves the delta-compression performance goal while still giving the LLM the complete current scene.

`SceneMemoryBootstrap` starts/stops the serializer at the root route level, outside the R3F canvas, so memory ticks do not cause 3D component renders.

### 2. Spatial Memory Injection

`useAiCommand` now prepends the current compact spatial state to the Orchestrator context:

`SPATIAL MEMORY (latest compact scene state) -> Recent conversation -> Current render-world summary`

`useAgentStream` also prepends the same current state before sending a Master Prompt to the external agent pipeline.

This keeps the runtime prompt aware of current entity IDs, positions, scales/bounds, and physics state.

### 3. ECS Command Bus

`src/store/useEcsStore.ts` provides component-oriented runtime records:

- `TransformArray` equivalent: position, rotation, scale per entity
- `BoundsArray` equivalent: compact bounding sizes
- `PhysicsArray` equivalent: body type, mass, friction, restitution, gravity scale
- `BoidFlightLogicArray` equivalent: enabled flag and flocking parameters

`src/ecs/EcsCommandBus.ts` batches ECS writes with `upsertEntities()` so commands such as spawning 100 birds produce one Zustand ECS transaction instead of 100 independent ECS updates.

The current R3F editor keeps `useEditorStore.spawnedObjects` as a compatibility/render mirror. This lets the existing renderer continue working while the ECS layer becomes the execution-oriented source of component data.

Bird/boid-style entity names automatically receive a `boidFlightLogic` component. The renderer can consume that component later without changing the LLM contract.

### 4. Visual QA Loop

`src/utils/captureViewportBase64.ts` captures the active WebGL canvas with `canvas.toDataURL()` and stays DOM-only so it is never invoked during SSR.

`src/utils/visualQa.ts` schedules a 2-second settle delay after a major scene command, captures the frame, and asynchronously calls `/api/ai/visual-qa`. The UI does not await the vision request.

The Vision API returns:

`{ needsCorrection, reason, corrections[] }`

The correction actions use the existing safe `CommandParser` vocabulary, so any QA correction still passes through the normal allowlist/coercion path instead of directly mutating the scene.

`src/routes/api/ai/visual-qa.ts` keeps the vision API key server-side and uses a strict structured-output schema. Current OpenAI models support image input through the Responses API; the vision model is configurable through `OPENAI_VISION_MODEL` and defaults to `gpt-5.6`. citeturn437206search0

### 5. Major-command lifecycle

1. User submits a prompt.
2. Spatial memory is materialized into compact JSON.
3. Orchestrator receives the prompt plus spatial memory.
4. AI actions pass through `CommandParser`.
5. Spawn/update/remove/clear operations update the ECS bus.
6. The existing renderer receives its compatibility mirror.
7. A major successful command schedules Visual QA after 2 seconds.
8. Vision inspects the captured frame.
9. If correction is required, the correction batch re-enters `CommandParser` asynchronously.

### Performance notes

- 1-second serializer cadence.
- Delta comparison uses encoded compact rows rather than deep object comparisons.
- Prompt-time full-state materialization happens only when the AI is actually invoked.
- ECS batch writes avoid per-entity store transactions for large spawns.
- Visual QA is fire-and-forget from the user interaction path.
- Visual QA is capped to a small correction batch and never gets direct code execution privileges.
- Numeric/action coercion remains centralized in `CommandParser`.

### Production hardening

1. Use exact mesh bounds from runtime geometry for `BoundsArray` instead of scale-derived estimates.
2. Move the ECS storage itself to TypedArrays or a dedicated worker when entity counts become very large.
3. Enable `preserveDrawingBuffer` only in a dedicated visual-QA capture configuration if a target browser clears the WebGL drawing buffer before `toDataURL()`.
4. Add server-side image-size limits and request timeouts to the Vision API endpoint.
5. Add a durable scene-memory revision ID if multiple browser clients need shared cognitive state.
6. Persist QA findings so repeated corrections can be correlated with the original prompt and command batch.