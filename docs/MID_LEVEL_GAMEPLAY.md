# Mid-Level Gameplay Framework

## Design

One gameplay vocabulary maps to three runtime implementations:

`AI/human intent -> high-level command -> gameplay event/state -> platform adapter`

The low-level graphics and transport layers remain separate. Mid-level systems operate on abilities, dialogue, waves, attributes, controllers, AI states, input contexts, inventory, and HUD state.

## R3F / TypeScript

- `GameplayEventBus.ts`: typed decoupled event bus for health, pickup, quest, triggers, dialogue, waves, and abilities.
- `useGameplayStore.ts`: high-level runtime state for players, abilities, attributes, inventory, dialogue and enemy waves.
- `GameplayFsm.ts`: five-state NPC FSM: Idle, Patrol, Chase, Attack, Flee.
- `GameplayNpcController.ts`: update-time adapter around the FSM.
- `GameplayCharacterController.tsx`: standardized first/third-person controller using the existing Ecctrl/Rapier stack. Ecctrl exposes grounded state, slope telemetry, air control, and a Rapier rigid-body handle.
- `GameplayHud.tsx`: DOM HUD outside the R3F canvas; only gameplay selectors re-render it.

Ecctrl documents `isOnGround`, `slopeAngle`, `actualSlopeAngle`, `airDragFactor`, `slopeMaxAngle`, `groundDetection`, and the movement API used by the wrapper. citeturn709326search0

## Unity

`GameplayEventChannels.cs` supplies ScriptableObject event channels and a FloatVariable for runtime values.

`RuntimeSet.cs` supplies a typed ScriptableObject runtime set.

`GameplayInputManager.cs` expects three Input Action Maps: Locomotion, Combat and UI. Context switching enables/disables maps without changing gameplay code.

`GameplayCharacterMotor.cs` supports a standard CharacterController and an optional NavMeshAgent mode.

`GameplayAnimatorBridge.cs` maps movement/grounded/vertical velocity to Mecanim parameters and input events to triggers.

`GameplayInventory.cs` supplies ItemDefinition, ItemDatabase, stack management, equipment slots, and stat modifiers.

Unity documents InputActionAsset as an asset containing action maps/control schemes and allows action maps to be enabled/disabled individually. citeturn993913search0

Unity documents ScriptableObject as the asset type for centralized data independent of GameObjects, which is the basis for the event-channel/runtime-set design. citeturn993913search1

Unity AI Navigation 2.0.9 is released for Unity 6000.0 and supports runtime/editor NavMesh building, dynamic obstacles, and links. citeturn420106search0

## Unreal Engine 5

`GenesisGameplay` is a separate UE module so gameplay code is not coupled to the Extreme Core graphics/transport module.

GAS:

- `UGenesisAttributeSet`: Health, MaxHealth, Stamina, MaxStamina, Mana, MaxMana.
- `AGenesisAbilityCharacter`: `UAbilitySystemComponent`, attribute set, ability granting and activation.
- `UGenesisAbility_DoubleJump` and `UGenesisAbility_Interact` provide extensible GameplayAbility examples.
- Native gameplay tags are defined centrally.
- `UGenesisAbilitySet` provides a data-driven primary asset for granting abilities.

Epic documents `UAbilitySystemComponent` as the bridge between an Actor and GAS, and `UAttributeSet` as the native container for gameplay attributes. Gameplay Effects are the normal mechanism for modifying attributes at runtime. citeturn781631search0turn781631search1turn781631search6

AI:

- `UBTTask_GenesisMoveToTarget` for Behavior Tree movement.
- `UBTDecorator_GenesisHasTarget` for Blackboard target checks.
- `AGenesisPerceptionAgent` with `UAIPerceptionComponent` sight configuration.

Input:

- `UGenesisInputRouter` switches Locomotion, Driving and Menu `UInputMappingContext`s and exposes BlueprintAssignable delegates.

Epic documents Input Actions as logical player actions and Input Mapping Contexts as contextual collections that can be added/removed/prioritized at runtime. citeturn316237search1turn316237search4turn316237search7

UI/data:

- `UGenesisGameplayDataAsset` (`UPrimaryDataAsset`) for gameplay identity, abilities and HUD/menu classes.
- `UGenesisCommonHud` (`UCommonUserWidget`) as the native CommonUI HUD base.

Epic documents `UCommonUserWidget` as the CommonUI base widget and its UI action binding APIs. citeturn316237search0turn316237search5

CommonUI + Enhanced Input support is currently documented by Epic as limited/experimental; use it intentionally and keep core gameplay input independent from UI routing. citeturn316237search6

## Unified high-level command API

Supported commands:

```json
{"commands":[{"command":"GrantAbility","payload":{"entity_id":"player_1","ability":"double_jump"}}]}
```

```json
{"commands":[{"command":"TriggerDialogue","payload":{"npc_id":"merchant_01","tree_id":"greeting_quest_01"}}]}
```

```json
{"commands":[{"command":"SpawnWave","payload":{"enemy_type":"goblin_archer","count":5,"spawn_point":"gate_alpha"}}]}
```

```json
{"commands":[{"command":"ModifyAttribute","payload":{"target":"player_1","attribute":"health","delta":-25}}]}
```

`UnifiedGameplayCommand.ts` validates and bounds command payloads. `GameplayCommandExecutor.ts` maps them to the R3F gameplay store/event bus. `CommandParser.ts` recognizes these commands before falling through to low-level scene commands.

## Extension rule

New mechanics should add a new domain adapter, not modify the engine renderer or transport. Example:

`NewCommand -> command validator -> gameplay service -> event -> platform adapter -> presentation`

This keeps AI prompts, human designers, R3F, Unity, and UE5 sharing the same gameplay semantics while platform-specific implementation remains isolated.