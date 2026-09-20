# Extreme Core — Unreal Engine 5.8+

## Native capabilities

- MassEntity data-oriented fragments/processors.
- Smart Object spatial queries and reservations.
- Runtime Nanite tessellation control.
- Lumen hardware ray tracing/reflection controls.
- Virtual Shadow Map SMRT ray-count controls.
- Geometry Scripting through Dynamic Mesh adapters.
- Remote Control for exposed editor/runtime properties.
- Pixel Streaming 2 for WebRTC frame/audio delivery.

MassEntity uses fragments and archetypes for data-oriented calculations; Smart Objects provide a spatially partitioned interaction database. citeturn778509search1turn778509search0

## Pixel Streaming 2

Enable Pixel Streaming 2. Current UE5.8 documentation exposes PixelStreaming2, PixelStreaming2Input and related runtime modules. Pixel Streaming streams rendered frames and audio to WebRTC-compatible browsers and supports keyboard, mouse, touch, gamepad/XR and custom HTML UI input. citeturn673403search7turn759021search6

Keep AI command transport logically separate from the media stream. Correlate commands to a Pixel Streaming peer using an authenticated session/correlation ID.

## Remote Control

The built-in Remote Control API exposes HTTP and WebSocket control surfaces for remote clients. The current UE5.8 WebSocket reference documents port 30020 by default and a configurable Project Settings port. citeturn673403search6turn673403search12

Use explicit UFUNCTION/UPROPERTY exposure rather than arbitrary reflection.

## Nanite

Nanite tessellation is runtime-capable but documented as experimental. Epic documents r.Nanite.AllowTessellation=1 as a project/config requirement and r.Nanite.Tessellation=1 as the dynamic runtime switch. Displacement magnitude also affects culling bounds and performance. citeturn569190search0

## Lumen and VSM

Hardware ray-traced Lumen requires supported platform/RHI/GPU settings. The runtime adapter exposes bounded high-level controls rather than internal renderer state. citeturn778509search9

VSM is tightly integrated with Nanite/Lumen workflows; tune ray counts conservatively and monitor page allocation/caching. citeturn759021search1

## Geometry Scripting

Enable Geometry Script for Dynamic Mesh generation/editing. Geometry Scripting operates on UDynamicMesh and FDynamicMesh3; some functions are editor-only, so the AI layer must use an allowlisted runtime adapter. citeturn778509search2turn778509search3

## Module list

GenesisExtremeCore.Build.cs references the engine modules/plugins used by this integration. Verify the exact module composition in the installed UE5 minor release before packaging.

Suggested plugin/module set:

MassEntity, MassGameplay, MassAIBehavior, SmartObjects, MassSmartObjects, RemoteControl, WebRemoteControl, PixelStreaming2, PixelStreaming2Input, GeometryScriptingCore.

## Threading and memory

- Mass processors own hot simulation data.
- Smart Object queries stay on the supported query path because the Smart Object subsystem is not fully thread-safe. MassSmartObject provides an asynchronous-oriented path. citeturn619628search0
- WebSocket/Remote Control ingress must validate and authenticate before submitting work to the game-thread/ECS execution path.
- Pixel Streaming is a media transport, not an authoritative simulation transport.
- Network commands should be small, bounded, and idempotent where practical.