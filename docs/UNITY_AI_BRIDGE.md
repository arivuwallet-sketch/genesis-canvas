# AI → React → Unity WebGL Bridge

This integration adds an opt-in Unity WebGL pipeline beside the existing R3F editor:

`user prompt → React → /api/llm/commands → OpenAI/Anthropic → strict JSON → react-unity-webgl → Unity SendMessage → CommandInterpreter → WebGL .jslib → React event`

## 1. What is included

### LLM middleware

- `src/lib/unityCommandSchema.ts`
  - Defines the runtime action contract.
  - Provides the strict JSON Schema used by the LLM.
  - Validates every response before it is sent to Unity.
  - Includes the system prompt template.

- `src/routes/api/llm/commands.ts`
  - Server-only route.
  - Supports OpenAI Responses API and Anthropic Messages/tool use.
  - Keeps provider API keys on the server.
  - Returns only a validated `{ "commands": [...] }` payload.

The command actions are:

- `instantiate`
- `destroy`
- `transform`
- `change_weather`
- `apply_material`

A command has this shape:

```json
{
  "action": "instantiate",
  "target_id": null,
  "prefab_name": "Prefabs/SportsCar",
  "parameters": {
    "position": [0, 0.5, 4],
    "rotation": [0, 45, 0],
    "scale": [1, 1, 1],
    "color": "#ff0000",
    "weather": null,
    "material": null,
    "enabled": null,
    "intensity": null
  }
}
```

For an existing object:

```json
{
  "action": "transform",
  "target_id": "unity-a81d4f",
  "prefab_name": null,
  "parameters": {
    "position": [3, 0.5, 2],
    "rotation": [0, 90, 0],
    "scale": null,
    "color": null,
    "weather": null,
    "material": null,
    "enabled": null,
    "intensity": null
  }
}
```

## 2. React layer

`src/components/unity/UnityGameBuilder.tsx` provides:

- Unity WebGL rendering through `react-unity-webgl`.
- A chat prompt input.
- POST to `/api/llm/commands`.
- Client-side command validation.
- `sendMessage("AICommandInterpreter", "ExecuteCommands", json)`.
- `addEventListener("UnityCommandCompleted", ...)`.
- `addEventListener("UnityCommandError", ...)`.
- A small command/status inspector.

The component is intentionally not mounted in the main editor route. This prevents the Unity WebGL runtime from replacing or duplicating the current R3F viewport. Mount it only on the Unity-powered game-builder page you want to expose.

### Unity build URL configuration

Set these Vite variables to the files produced by your Unity Web build:

```bash
VITE_UNITY_LOADER_URL=/unity-build/build.loader.js
VITE_UNITY_DATA_URL=/unity-build/build.data
VITE_UNITY_FRAMEWORK_URL=/unity-build/build.framework.js
VITE_UNITY_CODE_URL=/unity-build/build.wasm
```

The React component accepts these URLs as props as well, so a CDN can be used later.

## 3. Unity project setup

### Install Web build support

In Unity Hub, install the Web/WebGL build support module for the exact Unity editor version used by your project.

### Create the command receiver

Create:

```
Assets/
  Scripts/
    CommandInterpreter.cs
```

Create an empty scene GameObject named exactly:

```
AICommandInterpreter
```

Attach `CommandInterpreter.cs` to that object.

### Add the WebGL JavaScript plugin

Create:

```
Assets/
  Plugins/
    WebGL/
      ReactUnityBridge.jslib
```

Copy the repository version of `integrations/unity/Assets/Plugins/WebGL/ReactUnityBridge.jslib` into that location.

Unity's supported Web browser bridge uses `.jslib` plugins inside the Assets/Plugins area, and Unity can call GameObject methods from browser JavaScript with `SendMessage`. citeturn939375search1turn939375search6

### Add runtime prefabs

Because `CommandInterpreter` uses `Resources.Load`, prefab assets must be under a Resources directory:

```
Assets/
  Resources/
    Prefabs/
      SportsCar.prefab
      PoliceCar.prefab
      Tree.prefab
      ...
```

Use the path relative to `Resources`, without the `.prefab` extension. For example:

`Resources/Prefabs/SportsCar.prefab` → `prefab_name: "Prefabs/SportsCar"`

You can also place skybox materials under `Resources/Skyboxes` and reference them with `material: "Skyboxes/Rainy"`.

For optional weather effects, create scene objects named:

- `RainSystem`
- `SnowSystem`

The interpreter toggles these objects for the corresponding weather states.

## 4. Build the Unity Web application

For current Unity 6 editors, open **File → Build Profiles**, create/select a **Web** profile, and configure the Web build there. Unity documents Web as a Build Profile target in current releases. citeturn327157search0turn327157search7

For older Unity versions, the equivalent workflow is **File → Build Settings → WebGL/Web → Switch Platform → Build**. citeturn327157search3turn327157search4

Recommended development flow:

1. Add the scene containing `AICommandInterpreter` to the scenes included in the build.
2. Select the Web target/profile.
3. Make a Development Build for the first bridge test.
4. Build to a directory outside Unity's `Assets` folder.
5. Copy the generated loader, data, framework, and WebAssembly files into the React app's public directory, for example:

```
public/
  unity-build/
    build.loader.js
    build.data
    build.framework.js
    build.wasm
```

React Unity WebGL expects the Unity build URLs when creating the Unity context. citeturn608892search0turn608892search3

For release builds, use Unity's Web release-oriented optimization settings appropriate to your deployment target. Current Unity Web profiles expose release/development configurations and code-optimization options. citeturn327157search1turn327157search5

## 5. LLM configuration

Copy the relevant values into your server environment. Never expose provider keys through `VITE_*` variables.

OpenAI:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5
```

Anthropic:

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-5
```

The OpenAI implementation uses the Responses API structured-output format so the server receives a schema-constrained JSON object. OpenAI documents `json_schema` structured outputs for strict schema adherence. citeturn460862search0turn460862search2

The Anthropic implementation uses a forced tool call whose `input_schema` is the same command schema, then validates the returned tool input before sending it to Unity. Anthropic documents tool `input_schema` as the JSON Schema for tool inputs. citeturn460862search4

## 6. End-to-end test

Start the React/TanStack app and mount `UnityGameBuilder` on your Unity-facing page.

Then enter:

```
Spawn a red sports car at 0,0.5,4 and make it rain.
```

The expected flow is:

1. React POSTs the prompt to `/api/llm/commands`.
2. The server asks the configured LLM for the strict Unity command schema.
3. The server validates `{ commands: [...] }`.
4. React sends the JSON string to `AICommandInterpreter.ExecuteCommands`.
5. Unity queues and executes each command across frames.
6. Unity's `.jslib` calls `window.dispatchReactUnityEvent`.
7. `react-unity-webgl` delivers `UnityCommandCompleted` or `UnityCommandError` to the React component.

React Unity WebGL documents `sendMessage` for React→Unity calls and `addEventListener`/`removeEventListener` for Unity→React callbacks. citeturn327157search2turn327157search10

## 7. Security and production notes

- Keep OpenAI/Anthropic keys server-side.
- Treat LLM output as untrusted input even when structured output is enabled.
- Keep the command schema allowlisted. Do not allow arbitrary C# method names, filesystem paths, or arbitrary URLs.
- Add authentication and rate limiting to `/api/llm/commands` before exposing it publicly.
- Keep a maximum command count and validate numeric ranges server-side.
- Consider replacing `Resources.Load` with Addressables for large production libraries.
- For multiplayer authority, route approved commands through a server-side game simulation rather than allowing every browser client to mutate the scene independently.
