# Make "create a car" spawn a real car

## The problem
The AI responded to "create a car" by spawning 6 plain boxes and cylinders
("Car Body", "Car Cabin", 4 wheels). Technically a car made of blocks, but it
looks like scattered crates. The app's model library only contains a robot, so
the AI had no real car to work with.

## What we'll build

1. **Add a real car model**
   - Download a free-to-use (CC0) low-poly car 3D model from a public asset
     source (e.g. Kenney / poly.pizza) and place it at `public/models/car.glb`.
   - Validate the file downloads correctly before wiring it in.

2. **Register it in the model catalog**
   - Add a "Car" entry to `MODEL_CATALOG` in `src/utils/assetManager.ts` with
     keywords: car, vehicle, automobile, sedan, race car.
   - Give it a sensible default scale so it lands proportionate to the world.

3. **Teach the AI about it**
   - Update the schema hint in `src/routes/api/ai/chat.ts` so the AI knows
     `/models/car.glb` exists and should use it for car/vehicle requests
     instead of assembling primitives.

4. **Verify in the browser**
   - Type "create a car" in the chat and screenshot the result: one
     recognizable car model on the ground, no page errors.

## Notes
- No changes to selection, physics, or the pipeline UI — the spawned car gets
  the same physics body, selection outline, and gizmo support as everything
  else automatically.
- If the car model download fails, the fallback is to keep the catalog as-is
  and say so, rather than shipping a broken reference.
