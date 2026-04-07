# Reality Engine Scaffold

Initial React + TypeScript scaffold for a real-time adaptive rendering app.

## Quick start

```bash
npm install
npm run dev
```

## Tooling baseline

- **Build/runtime**: Vite + React 18 + TypeScript (strict mode)
- **Rendering**: Three.js/WebGL in `src/engine/rendering`
- **Code quality**: ESLint (TS + React hooks) and Prettier
- **Path aliases**:
  - `@engine` → `src/engine`
  - `@ai` → `src/ai`
  - `@ui` → `src/ui`
  - `@data` → `src/data`

## Architecture map

```text
src/
├── ai/                       # AI adaptation, policy, and forecasting modules
├── data/                     # Domain state, telemetry, and persistence boundaries
├── engine/
│   ├── rendering/
│   │   └── renderer.ts       # Three.js scene/camera/renderer setup + frame ticks
│   └── reality-engine.ts     # Top-level orchestrator and state transitions
├── ui/
│   └── App.tsx               # UI shell that mounts/unmounts engine lifecycle
├── main.tsx                  # React entry point
└── styles.css                # Minimal app styling
```

## Module responsibilities

### `src/engine/reality-engine.ts`
- Owns lifecycle: `start()` and `stop()`.
- Connects input streams (pointer + resize) to runtime state.
- Drives adaptive state transitions (`running`, `degraded`, `stopped`).
- Coordinates per-frame updates with the rendering layer.

### `src/engine/rendering/renderer.ts`
- Initializes Three.js renderer, scene, camera, and basic lighting.
- Exposes a rendering contract (`tick`, `resize`, `dispose`) for orchestration.
- Contains visual primitives for startup validation.

### `src/ui/App.tsx`
- Instantiates `RealityEngine` in React lifecycle hooks.
- Provides container element for WebGL rendering surface.

## Scripts

- `npm run dev` – start local dev server
- `npm run build` – strict TS check + production build
- `npm run preview` – preview build
- `npm run lint` – lint TypeScript/React files
- `npm run format` – format code with Prettier
- `npm run typecheck` – standalone TypeScript check
