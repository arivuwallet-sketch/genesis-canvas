# Extreme Core Upgrade

## Unified architecture

React/R3F -> WebGPU/WebGL2 + GPU compute + workers -> Protobuf -> Unity 6 DOTS/Burst or Unreal Engine 5 Mass/Smart Objects/Pixel Streaming 2/Remote Control

## WebGL/WebGPU

Three.js now provides WebGPURenderer as the next-generation renderer with WebGL2 fallback; forceWebGL is supported for testing. TSL/StorageBufferNode supports compute buffers and computeAsync, and the official examples demonstrate 300k-500k particle compute workloads. citeturn759021search2turn759021search5turn920773search7turn682948search1

Added modules include HybridRenderer.ts, GpuParticleSimulation.ts, GpuClothSimulation.ts, InstancedBatchManager.ts, GeometryAcceleration.worker.ts, AssetDecode.worker.ts, WebGpuPostEffects.ts, and RenderQualityController.ts.

The post-FX kernels are kept as render-graph boundaries. Full SSGI/TAA quality requires depth/normal/history resources and a tuned temporal accumulation strategy per hardware tier.

## Unity DOTS

Unity 6.3 documentation lists Entities 1.3.14 as released for Unity 6000.3. IJobEntity is the source-generated iteration pattern for component data and ECS jobs track component dependencies; Burst compiles jobs to optimized native code. citeturn910200search3turn984603search7turn984603search9turn910200search6

Added Unity modules cover ECS components, Burst simulation, NativeArray command staging, a small protobuf wire reader, a binary WebSocket receiver, and editor reflection/MCP exposure tools.

NativeWebSocket 2.0.4 currently supports Unity/WebGL and binary messages; use its UPM #upm-2 branch rather than copying raw source. citeturn721850search0turn721850search1

## Unreal Engine 5

MassEntity is the data-oriented ECS layer, while Smart Objects provide spatially indexed activities and Mass integration. Pixel Streaming 2 is the current WebRTC media path; Remote Control provides HTTP/WebSocket automation for exposed project properties/functions. citeturn778509search1turn778509search0turn759021search9turn673403search6

Added modules cover Mass traffic/crowd processing, Smart Object queries, bounded Nanite/Lumen/VSM runtime controls, and a standalone module build file.

Nanite tessellation is runtime-capable but documented as experimental; r.Nanite.AllowTessellation is a project/config setting and r.Nanite.Tessellation is dynamically toggleable. citeturn569190search0

Geometry Scripting works with UDynamicMesh and FDynamicMesh3 and supports both editor and runtime operations, with some functions remaining editor-only. citeturn778509search2turn778509search3

## Universal transport

The single schema is src/engine/universal/UniversalState.proto. It defines Transform, Rigidbody, PBR material, spatial audio, behavior state, EntityState, StateDelta, CommandEnvelope, and TransportFrame.

UniversalTransport.ts encodes/decodes binary Protobuf frames. UniversalTransportClient.ts provides reconnecting browser transport. server/universal-transport.cjs provides a local binary relay.

Protobuf was chosen for the transport because the browser has a maintained binary runtime while the same .proto schema can generate C++ and C# bindings. Protobuf documents C++ and C# reference APIs, and protobuf.js supports browser/Node decoding without requiring protoc at runtime. citeturn759021search10turn636036search0

## Code generation

Run: node scripts/generate-universal-protobuf.mjs

The script generates TypeScript bindings through protobufjs-cli and optionally C++/C# bindings when protoc is installed.

## Memory allocation policy

Browser: TypedArrays, transferable ArrayBuffers, storage buffers, batched instance writes, worker BVH, GPU compute on WebGPU, CPU worker fallback on WebGL2.

Unity: NativeArray/NativeList plus ECS component data in hot paths, IJobEntity/ISystem with Burst, ECB for structural changes, binary transport instead of JSON parsing in simulation loops.

Unreal: Mass fragments/processors for hot simulation, Smart Object queries on supported execution paths, network ingress marshalled into controlled game-thread/ECS execution, no arbitrary reflected calls.

## Fallback matrix

Browser renderer: WebGPU -> WebGL2
Browser simulation: GPU compute/WGSL -> CPU/worker
Spatial acceleration: worker BVH -> main-thread acceleration
Transport: Protobuf -> JSON debug mode
Unity simulation: DOTS/Burst -> classic MonoBehaviour adapter
Unreal crowd: MassEntity -> Actor/StateTree adapter
Unreal media: Pixel Streaming 2 -> local viewport fallback
Unreal remote control: authenticated custom bus -> Remote Control API

## Important scope boundary

The checked-in code establishes production-oriented interfaces, memory ownership, queueing, schemas, shader kernels, and engine adapters. It does not claim a complete shipping renderer or a verified 50,000-agent benchmark because those depend on the actual GPU, Unity project, Unreal project, assets, materials, and generated native bindings.