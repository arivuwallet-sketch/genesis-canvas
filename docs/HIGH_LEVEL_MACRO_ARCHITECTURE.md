# Genesis High-Level Macro Architecture

## Runtime layering

The engine now has a three-level contract:

`Low-level renderer/transport -> Mid-level gameplay -> High-level macro`

The macro layer does not spawn actors at coordinates or manipulate render primitives. It computes world intent and publishes bounded, abstract events.

## AI Director

Player stress is normalized into five components:

- Health stress: `1 - health / maxHealth`
- Ammo stress: `1 - ammo / maxAmmo`
- Recent-damage stress: `recentDamage / damageWindowSeconds`
- Combat-recency stress: `1 - timeSinceCombatSeconds / 24`
- Enemy-pressure stress: `enemiesNearby / 8`

The weighted sum is clamped to `[0,1]`:

`stress = clamp01(H*wH + A*wA + D*wD + R*wR + E*wE)`

The pacing oscillator uses a cycle split into:

- Build Up: first 42%
- Peak Action: next 28%
- Relief: final 30%

Intensity combines the oscillator with player stress. Spawn actions are rate-limited by a director cooldown.

The output is an abstract spawn intent such as:

`{ kind: "SpawnHorde", spawnPool: "director_high_threat_horde", budget: 7 }`

The director never chooses a concrete coordinate. A mid-level spawn service owns the mapping from `spawnPool` to physical spawn points, navigation volumes, encounter templates, and entity prefabs.

## R3F / WebGL

Core files:

- `src/highlevel/AIDirector.ts`
- `src/store/useMacroGameStore.ts`
- `src/components/MacroDirectorRuntime.tsx`
- `src/highlevel/QuestOrchestrator.ts`
- `src/highlevel/DialogueLoreMatrix.ts`
- `src/highlevel/DialogueGenerationService.ts`
- `src/highlevel/MacroGameLoop.ts`
- `src/highlevel/MacroSaveSerializer.ts`
- `src/highlevel/MacroSaveService.ts`
- `src/highlevel/MacroCommand.ts`
- `src/highlevel/MacroCommandExecutor.ts`

The runtime tick executes on a fixed macro cadence and avoids per-frame Zustand writes. Director events are emitted through the existing typed gameplay bus as `onDirectorSpawnIntent`.

The macro store owns:

- world state
- director state
- quest graphs
- completed objectives
- dialogue trees
- score and loop status
- extraction state
- persistent meta inventory
- technology unlocks

## GOAP / HTN boundary

`planMacroGoal()` is a bounded GOAP-style planner. It searches up to eight steps and keeps only the lowest-cost 32 frontier states.

Quest generation is separate from planning. This lets a quest generator create an objective graph while the planner determines macro actions required to establish faction/world facts.

Example:

`Bandit faction -> Capture Bridge`

can be represented as the desired macro fact `bridge_controlled=true`, while the planner selects high-level actions such as:

`secure_crossing -> defeat_guard -> capture_bridge`

without controlling NPC locomotion.

## Narrative layer

`DialogueLoreMatrix` stores recent world events and can produce a contextual tree. `DialogueGenerationService` sends current world state and recent quests to the structured LLM dialogue endpoint.

The endpoint is intentionally schema-constrained and returns:

- NPC/tree identifiers
- context tags
- referenced event IDs
- dialogue lines
- optional conditions

The LLM is instructed to reference only facts supplied by the runtime context.

## Macro loop

Game rules support:

- time limits
- score targets
- extraction-required loops
- artifact requirements
- death-based loss

A score target of `0` means the loop is objective-driven rather than score-gated. Extraction shooters therefore do not accidentally require an unrelated score threshold.

Extraction promotes run rewards into persistent meta progression.

## Persistence

WebGL save format:

`GNSM + gzip(payload)`

The payload contains:

- world state
- director snapshot + director runtime timers
- game-loop configuration
- rule set
- score/life/extraction/artifact state
- quest graphs
- completed objectives
- meta progression
- mid-level gameplay state
- ECS scene-state snapshot

Browser compression uses the platform Compression Streams API when available. Node uses gzip.

The Supabase route is an integration boundary and expects a server-side service key; production deployments should derive player identity from authenticated server credentials instead of accepting arbitrary client identity.

## Unity

The high-level Unity layer is under:

`integrations/unity/Assets/Scripts/HighLevel/`

Main services:

- `GenesisAIDirectorManager`
- `GenesisMacroGameManager`
- `GenesisQuestOrchestrator`
- `GenesisDialogueLoreMatrix`
- `GenesisMetaProgressionManager`
- `GenesisMacroSaveSerializer`
- `GenesisMacroCommandRouter`

The director raises `SpawnIntentRaised`, allowing a mid-level encounter/spawn service to resolve the appropriate spawn pool.

## Unreal Engine 5

The macro module is:

`integrations/unreal/GenesisMacro.uplugin`

Key services:

- `UGenesisAIDirectorSubsystem` — GameInstance lifetime
- `UGenesisMacroQuestSubsystem` — GameInstance lifetime
- `UGenesisMetaProgressionSubsystem` — GameInstance lifetime
- `AGenesisMacroGameMode` — authoritative server rules/ticking
- `AGenesisMacroGameState` — replicated score/timer/director status
- `UGenesisMacroCommandSubsystem` — JSON command entry point
- `FGenesisMacroSaveSerializer` — binary compressed save envelope

UE's current subsystem model explicitly supports GameInstance-lifetime subsystems, making that split suitable for persistent macro services. citeturn912259search0turn912259search7

The UE serializer uses `FCompression::CompressMemory` / `UncompressMemory` with an explicit header and raw-size field so decompression never depends on guessed output sizes. citeturn912259search1turn912259search3

## Unified macro command API

Schema:

`schemas/high-level-macro-commands.schema.json`

Supported high-level commands:

```json
{
  "commands": [
    {
      "command": "GenerateGameLoop",
      "payload": {
        "genre": "extraction_shooter",
        "pacing": "hardcore_punishing",
        "win_condition": "extract_with_artifact",
        "director_rules": [
          "scarce_ammo",
          "aggressive_flanking"
        ]
      }
    }
  ]
}
```

```json
{
  "commands": [
    {
      "command": "SetWorldState",
      "payload": {
        "faction_control": "goblins",
        "time_limit_mins": 20
      }
    }
  ]
}
```

AI commands are placed inside the existing executable `actions` envelope used by Genesis chat, so the current CommandParser can route macro and mid-level commands through the same security boundary.

## Expansion rule

New macro mechanics should follow:

`command -> validator -> macro service -> event/goal -> mid-level adapter -> presentation`

This keeps the AI Director, quest generator, meta progression and narrative systems independent from renderer details, actor coordinates, and platform-specific entity APIs.
