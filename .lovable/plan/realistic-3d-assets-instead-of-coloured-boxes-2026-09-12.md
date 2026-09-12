# Realistic 3D assets instead of coloured boxes

## The problem
Typing "create a car" produced six plain shapes — a red box body, a box cabin,
four cylinder wheels. The engine only has one real 3D model in its library (a
robot), so whatever you ask for, the AI has no choice but to fake it with
primitives. The references you shared (sports car, human character, terrain,
city) are the quality bar.

## Honest constraint
The engine cannot invent a photoreal model on demand — nothing in the browser
generates a new sculpted, textured 3D asset from a sentence in real time. What
it *can* do is pick from a real library of properly modelled, textured assets.
So the fix is to give the engine a library worth picking from, and make
everything it renders look like a real 3D scene rather than flat plastic.

## What we'll build

### 1. A real asset library
Download free-to-use (CC0) game-ready models with proper textures and place
them in the project, covering the categories in your references:
- Vehicles: sports car, sedan, truck
- Characters: humanoid figure (rigged where available)
- Environment: trees, rocks, terrain chunk
- Buildings: house, tower, city block pieces
- Props: crate, barrel, streetlight

Each model is validated after download; anything that fails to fetch is
dropped rather than left as a broken reference.

### 2. Smart matching from your words
Expand the engine's catalogue so each model carries keywords ("car, vehicle,
sports car, race car"). When a prompt names something in the library, the
engine spawns that real model. Only genuinely unknown things fall back to
shapes — and the message will say so plainly instead of silently faking it.

### 3. Teach the AI what exists
Feed the current library list into the AI's instructions so it stops
assembling cars out of boxes and reaches for the real model instead. Group
requests ("build a street") spawn several library models arranged sensibly.

### 4. Make the render look realistic
- Replace the flat single-colour ground with a textured, non-uniform surface.
- Add proper image-based lighting so metal and paint catch reflections the way
  the reference car does.
- Keep the existing quality presets working; realism improvements sit on the
  Medium/Ultra tiers so lower-end machines stay smooth.

### 5. Verify on screen
Run "create a car", "spawn a character", and "add some trees" in the live
preview and screenshot each, confirming recognisable models and no errors.

## Notes
- Selection, gizmos, physics, carving, and the agent pipeline all keep working
  unchanged — library models get the same treatment as anything else.
- The uploaded images are used as a quality reference only; they are not
  placed into the app.
- Full photoreal city/terrain at the scale of your Berlin and landscape
  references is beyond a browser-based engine's budget; the goal here is
  convincing, well-lit, properly textured game assets.
