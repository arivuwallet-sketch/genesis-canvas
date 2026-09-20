# Genesis AI ↔ Unreal Engine 5 WebSocket Integration

This folder is a drop-in UE5 C++ integration for the existing Genesis React application.

## Architecture

`React chat → /api/llm/ue5-commands → structured JSON → ws://localhost:3002 → AAICommandReceiver → UE5 runtime`

The UE receiver uses Epic's `WebSocketServer` runtime module. UE's API exposes an `IWebSocketServer` that listens on a port and dispatches message handlers on the game thread, so the receiver validates/parses incoming JSON and then executes a bounded number of queued commands per frame.

This custom port is deliberately separate from the built-in Remote Control WebSocket endpoint. Current UE5 documentation lists Remote Control's default WebSocket port as 30020; it can be changed in Project Settings.

## Files

Copy the following into a C++ Unreal project:

```
YourProject/
  Source/
    GenesisAI/
      GenesisAI.Build.cs
      Public/
        AICommandReceiver.h
      Private/
        AICommandReceiver.cpp
```

The module depends on `Core`, `CoreUObject`, `Engine`, `Json`, `JsonUtilities`, and `WebSocketServer`.

## 1. Create/attach the C++ module

For an existing UE5 C++ project, copy the `integrations/unreal/Source/GenesisAI` directory under the project's `Source` directory.

If the project does not yet have a C++ module named `GenesisAI`, add it to your project's module list using the standard Unreal C++ project/module workflow, regenerate project files, and compile from the editor/IDE.

The module contains:

- `AAICommandReceiver`: a runtime Actor and WebSocket server.
- `GenesisAI.Build.cs`: module dependencies.

## 2. Add the receiver Actor

In the UE editor:

1. Open the level that should accept AI commands.
2. Add an Empty Actor.
3. Name it `AICommandReceiver`.
4. Set its class to `AAICommandReceiver`.
5. Keep **WebSocket Port = 3002** unless another process already uses it.
6. Set **Max Commands Per Frame = 4** for a conservative starting point.

The receiver starts its WebSocket server in `BeginPlay` and stops it in `EndPlay`.

## 3. Configure the sun for SetTimeOfDay

Select the directional light used as the scene sun.

Add the Actor Tag:

`AI_Sun`

The default C++ receiver maps a 0–24 time value to the sun actor rotation and light intensity.

Example:

```json
{
  "command": "SetTimeOfDay",
  "asset_path": null,
  "target_id": null,
  "parameters": {
    "location": null,
    "rotation": null,
    "scale": null,
    "color": null,
    "material": null,
    "value": 0,
    "time_of_day": 20
  }
}
```

For Ultra Dynamic Sky or another environment controller, keep `AAICommandReceiver` as the network/validation layer and replace `ExecuteSetTimeOfDay` with a project-specific adapter that calls your environment controller's public API.

## 4. Prepare spawnable assets

`SpawnActor` accepts an Unreal class reference such as:

```
Blueprint'/Game/Vehicles/BP_SportsCar.BP_SportsCar'
```

The receiver normalizes Blueprint asset references to generated class paths ending in `_C` before loading the actor class.

For packaged builds, ensure the referenced Blueprint classes are included in cooking/packaging. Do not depend on editor-only Blueprint assets being available in a cooked runtime.

## 5. Dynamic materials

`ApplyMaterial` operates on the first `UMeshComponent` found under the target actor.

A color such as `#D81B1B` is applied to the dynamic material parameter named:

`BaseColor`

For a project using a different material parameter name, change the string in `ExecuteApplyMaterial` or expose a project-specific material adapter.

A material asset can also be supplied through `parameters.material` using an Unreal material reference path.

## 6. React environment

Add:

```bash
VITE_UNREAL_WS_URL=ws://localhost:3002
```

The React route is:

`/ue5`

and the component is:

`src/components/unreal/UE5GameBuilder.tsx`

The browser WebSocket automatically reconnects after disconnects and only sends LLM commands when the socket is open.

## 7. LLM middleware

The route:

`POST /api/llm/ue5-commands`

accepts:

```json
{ "prompt": "Spawn a highly detailed sports car and make it night time." }
```

and returns validated JSON:

```json
{
  "commands": [
    {
      "command": "SpawnActor",
      "asset_path": "Blueprint'/Game/Vehicles/BP_SportsCar.BP_SportsCar'",
      "target_id": null,
      "parameters": {
        "location": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1],
        "color": null,
        "material": null,
        "value": 0,
        "time_of_day": 0
      }
    },
    {
      "command": "SetTimeOfDay",
      "asset_path": null,
      "target_id": null,
      "parameters": {
        "location": null,
        "rotation": null,
        "scale": null,
        "color": null,
        "material": null,
        "value": 0,
        "time_of_day": 20
      }
    }
  ]
}
```

The OpenAI implementation uses strict structured output; the current OpenAI API documents `json_schema` structured outputs and lists GPT-5.6 with the alias `gpt-5.6`.

The Anthropic implementation uses a forced tool schema and validates the tool input before transmission. Claude Sonnet 4.6 is currently listed as an active Anthropic API model.

## 8. Enable UE plugins/modules

### WebSockets

Use the engine WebSockets/WebSocketServer modules through the C++ module dependencies above. Epic's current API reference lists both `WebSockets` and `WebSocketServer` as engine modules; `WebSocketServer` provides the server API used here.

You do not need the experimental WebSocket Networking plugin for this receiver. That plugin is a separate networking stack and is documented as experimental.

### Remote Control

Enable **Remote Control API** when you also want the built-in UE Remote Control HTTP/WebSocket system for editor automation or exposed Blueprint/Python functions.

Current UE5 docs describe Remote Control as a web server inside the engine and document its WebSocket endpoint; its default WebSocket port is 30020.

For this custom AI receiver, leave the built-in Remote Control WebSocket on its default port and use **3002** for `AAICommandReceiver`, or deliberately change one of the ports so they do not conflict.

Remote Control is disabled by default in packaged/`-game` workflows and can require the documented `-RCWebControlEnable -RCWebInterfaceEnable` launch flags when you need that feature outside the editor.

## 9. Project settings / security

For local development, bind the custom receiver to localhost through your machine's firewall and keep port 3002 inaccessible from the public internet.

Before exposing this to other machines:

- add authentication to the WebSocket handshake or an initial signed message;
- validate asset paths against an allowlist;
- keep command count and numeric ranges bounded;
- rate-limit LLM command generation;
- prefer server-authoritative execution for multiplayer;
- log every AI command and UE result.

Do not accept arbitrary reflection calls, console commands, filesystem paths, or dynamically supplied C++ function names.

## 10. Test the pipeline

1. Start the UE5 editor/game with the `AICommandReceiver` actor in the active level.
2. Confirm the Output Log shows:
   `[GenesisAI] AI command WebSocket listening on ws://localhost:3002.`
3. Start the Genesis React app.
4. Open `/ue5`.
5. Wait for **UE5 WebSocket · Live**.
6. Submit:
   `Spawn a highly detailed sports car and make it night time.`
7. React calls `/api/llm/ue5-commands`.
8. The server returns strict JSON.
9. React sends the JSON over `ws://localhost:3002`.
10. UE parses the JSON with `FJsonSerializer`.
11. UE queues each command and executes up to the configured budget per frame.
12. UE sends `ue_command_completed` or `ue_command_error` JSON back to React.

Epic documents that `IWebSocketServer` message handlers run on the game thread; this implementation therefore keeps the handler lightweight and queues actual command work so a large batch is spread across frames.

## 11. Blueprint option

The same architecture can be exposed to Blueprint:

- Add a Blueprint Actor derived from `AAICommandReceiver`.
- Keep network and JSON validation in C++.
- Add BlueprintNativeEvent/BlueprintImplementableEvent adapters for project-specific actions such as Ultra Dynamic Sky time-of-day, weather systems, or custom material libraries.
- Keep the JSON command vocabulary stable while changing the project-specific implementation behind it.

This separation lets the React/LLM contract remain stable across different Unreal projects and content libraries.
