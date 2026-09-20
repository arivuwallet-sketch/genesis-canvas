# Genesis Canvas

you need to building an omnipotent, AI-driven, full 3D realistic PC game builder. The interface will feature a sophisticated UI overlaying a highly advanced 3D canvas. Users will type prompts, and the AI will dynamically generate, place, and manipulate 3D objects, logic, and environments.

# Tech Stack Architecture
You are strictly bound to this exact tech stack. Do not deviate or suggest alternatives.

Core Graphics: React Three Fiber (R3F), Three.js, @react-three/drei, Miniplex, ECSY.

Physics: @react-three/rapier (use this as the primary), Cannon-es, Ammo.js, three-mesh-bvh.

Asset Pipeline: GLTFLoader, DRACOLoader, gltfjsx, glTF-Transform, KTX2/Basis loaders.

Post-Processing: @react-three/postprocessing (Bloom, SSAO, SMAA, Depth of Field, Motion Blur), plus custom GLSL shader support.

Controls & Input: PointerLockControls, Gamepad API, ecctrl.

AI & Pathfinding: Yuka, three-pathfinding.

Audio: Three.js PositionalAudio, Howler.js.

UI/HUD: HTML/CSS (DOM Overlays), tunnel-rat, Drei , three-mesh-ui.

State & Network: Zustand (primary state), Colyseus, Socket.io, WebRTC.

Performance: Stats.js, R3F , Spector.js.

# Task: Phase 1 - Architecture Setup & Core Viewport
Before we build the complex physics and AI networking, we must establish a rock-solid, high-performance foundation.

Initialize a full-screen React application using Zustand for state management.

Create the core R3F 

 that fills the entire viewport.

Inside the canvas, set up a basic test environment:

A grid helper and axes helper.

A physical floor using @react-three/rapier <RigidBody>.

A basic metallic cube that falls onto the floor (to verify Rapier physics are working).

@react-three/drei <Environment> for realistic HDRI lighting.

R3F <Perf> monitor in the corner so I can track framerates.

Overlay a sleek, dark-mode HTML UI (using tunnel-rat or standard absolute positioning) with a bottom chat input field for the "Omnipotent AI".

# Guidelines

Component Modularity: Break everything down. Do not put all the 3D logic in the main App file. Create separate components for Viewport.js, PhysicsWorld.js, and OverlayUI.js.

Design Buzzwords: The UI should feel premium, technical, glassmorphic, and dark mode. Use absolute minimum visual clutter.

State Management: Use Zustand to track the "chat input" state.

# Constraints

Do NOT attempt to build the multiplayer networking or LLM backend yet. We are strictly building the visual and physics foundation first.

Before you write any code, please review this entire Knowledge Base, share your understanding of my project, and ask me for confirmation to proceed.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/539ceb8d-8abe-4dee-bbc7-6eafdc330392).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
