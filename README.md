# Arcade Race Prototype

A Vite + TypeScript playground for an arcade racing prototype combining a lightweight Three.js renderer with Rapier physics. The prototype features an oval speedway with banking, a kinematic bicycle-model drivetrain, ghost recording/replay, spline-driven AI rivals, and a reactive HUD/audio stack.

## Getting started

```bash
npm install
npm run dev
```

- `npm run dev` – launch the Vite dev server with hot module replacement.
- `npm run build` – type-check and produce a production build.
- `npm run preview` – serve the production build locally for smoke tests.

The development server opens automatically at [http://localhost:5173](http://localhost:5173/). Use keyboard (WASD / arrow keys, space for handbrake, R to reset) or a connected gamepad. Toggle optional systems with:

- `F` – show/hide FPS counter.
- `G` – start/stop ghost recording & replay.
- `I` – enable/disable AI spline followers.

## Project layout

```
src/
  audio/AudioEngine.ts      Web Audio loops for engine and tire squeal
  assets/                   Procedural textures and low-poly car prefab
  game/                     High-level orchestration (Game, AI, ghost, lap timer)
  input/InputManager.ts     Keyboard + gamepad input with persistent dead zones
  physics/                  Rapier world + bicycle dynamics
  render/                   Scene factory and post-processed renderer
  ui/HUD.ts                 DOM heads-up display widgets
  main.ts                   Entry point wiring everything together
```

## Tuning cheatsheet

Adjust these constants to change the feel of the prototype:

### Vehicle physics (`src/physics/BicycleCar.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `enginePower` | `12000` | Peak engine force applied along the forward vector. |
| `brakeForce` | `8000` | Combined braking and reverse torque. |
| `maxSteer` | `0.6` | Maximum steering angle (radians) for the virtual front axle. |
| `tireGripFront` / `tireGripRear` | `9` | Baseline lateral grip coefficients for the bicycle model. |
| `handbrakeGrip` | `3` | Reduced rear grip when the handbrake is pressed (drift bias). |
| `downforce` | `12` | Scales speed-dependent aerodynamic downforce. |
| `drag` | `0.35` | Quadratic aerodynamic drag coefficient. |
| `rollingResistance` | `8` | Linear drag applied to forward speed. |
| `differentialLock` | `0.1` | Placeholder for future torque biasing (currently unused but reserved). |

### Camera (`src/render/Renderer.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `baseFov` | `60` | Starting field of view (degrees). |
| `springStrength` | `80` | How aggressively the chase rig snaps back toward the target. |
| `damping` | `12` | Damping applied to camera velocity. |
| `shakeIntensity` | dynamic | Scales screen shake based on slip and impulses. |

### Input (`src/input/InputManager.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `steeringDeadZone` | `0.08` | Gamepad steering axis dead-zone (saved to `localStorage`). |
| `triggerDeadZone` | `0.10` | Gamepad trigger dead-zone for throttle/brake (saved to `localStorage`). |

### Audio (`src/audio/AudioEngine.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| Engine gain curve | `0.15 + normalized * 0.35` | Overall loudness of the engine loops. |
| Low oscillator range | `60 → 220 Hz` | Pitch range for the bassy engine layer. |
| High oscillator range | `180 → 700 Hz` | Pitch range for the raspy engine layer. |
| Tire squeal gain | `telemetry.slip * 0.4` | Converts slip to squeal volume. |

### Miscellaneous

- **AI spline followers** (`src/game/AIController.ts`): adjust `count`, `speed`, and banking bias.
- **Ghost recorder** (`src/game/GhostRecorder.ts`): tweak `opacity` or colour swatches for clarity.
- **Track** (`src/game/Track.ts`): change `radiusX`, `radiusZ`, or `banking` sine wave for alternative layouts.

Enjoy experimenting with the prototype and tailoring the feel of the car, camera, and ambience to your liking!
