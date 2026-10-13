# Baseline System & Environment Audit

**Project:** Pocket Crusader (Project "Tiny Kingdom")  
**Audit Date:** October 2026  
**Auditor:** Senior Gameplay & Systems Architect  
**Corpus / Workspace:** `d:\MY-PROJECT\phaser-example`  
**Repository Branch:** `feat/tiny-kingdoms-rts`  
**Commit Baseline:** `a905801` (*WIP: multiplayer, with sync all unit*)  

---

## 1. Executive Summary of Baseline

Pocket Crusader is a web-based, mobile-first 2D medieval RTS inspired by *Stronghold Crusader*, built using Next.js (React 19), Phaser 3 (v3.80.1), Zustand v5, and Socket.IO v4.8. Assets are sourced from Pixel Frog's *Tiny Swords* pack.

The codebase originated from the official Phaser Next.js template (`phaserjs/template-nextjs`), but has undergone substantial custom gameplay development through multiple iterations (Phases 3 through 14).

### Key Baseline Findings
- **Compilability:** The project compiles without TypeScript errors (`npx tsc --noEmit` exits with code 0).
- **Production Build:** Next.js static production export succeeds (`next build` outputs to `dist/` with code 0).
- **Server Execution:** The custom server (`node server.js`) starts cleanly on port 3000, establishing HTTP and Socket.IO listeners.
- **Runtime Playability:** **The game cannot be played in single-player mode.** The runtime is locked behind a two-player Socket.IO lobby handshake (`room_ready`). Even if forced, ground movement commands abort if `roomId` is absent in Zustand.
- **Multiplayer Runtime Verification:** When two browser clients connect and join the same 4-letter room code, Phaser initializes WebGL, preloads 4MB of Tiny Swords spritesheets, spawns the world (Blue and Red bases), auto-spawns workers up to the 5-pop cap, and executes wandering AI.
- **Automated Tests:** **0 tests exist.** No test framework (Jest, Vitest, Playwright, Mocha) is installed or configured. No `npm test` script exists.
- **Critical Build/UI Blocker:** The build button in the React HUD overlay is unclickable in the browser because `.hud` has `pointer-events: none` and `.hudBuildBtn` is completely missing from `App.module.css`, preventing the build menu from opening via UI clicks.

---

## 2. Environment & Dependency Specifications

### 2.1 Runtime Environment
- **Node.js:** v23.3.0 (detected via active execution environment)
- **Package Manager:** npm v10+ (lockfile v3 format)
- **Operating System:** Windows 10/11
- **Phaser Rendering Mode:** WebGL (Phaser v3.80.1)

### 2.2 Installed Package Dependencies (from `package.json` & `package-lock.json`)

| Dependency | Declared Version | Lockfile Version | Category | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `phaser` | `3.80.1` | `3.80.1` | Core Engine | 2D Game canvas, scenes, tweens, math |
| `next` | `15.3.1` | `15.3.1` | Framework | React host, SSR/Export, static asset server |
| `react` | `19.0.0` | `19.0.0` | UI Library | Application shells, HUD, state wrappers |
| `react-dom` | `19.0.0` | `19.0.0` | UI Library | DOM renderer for React |
| `zustand` | `^5.0.13` | `5.0.13` | State Store | Global resource, selection, and UI stores |
| `easystarjs` | `^0.4.4` | `0.4.4` | Pathfinding | A* grid pathfinding algorithm |
| `socket.io` | `^4.8.3` | `4.8.3` | Networking | WebSocket relay server |
| `socket.io-client`| `^4.8.3` | `4.8.3` | Networking | Client Socket.IO connector |
| `typescript` | `^5` | `5.8.3` | Dev Dependency| Type checking and compilation |
| `@types/node` | `^20` | `20.17.24` | Dev Dependency| Node.js type definitions |
| `@types/react` | `^19` | `19.0.10` | Dev Dependency| React type definitions |
| `@types/react-dom`| `^19` | `19.0.4` | Dev Dependency| ReactDOM type definitions |

> [!WARNING]
> The template `README.md` claims "Phaser 4", but the actual installed dependency is **Phaser 3.80.1**. Phaser 4 does not exist as a production release. The template description is obsolete.

---

## 3. Command & Script Verification

| Script / Command | Target Executable | Result | Observations & Failure Modes |
| :--- | :--- | :--- | :--- |
| `npm run dev` | `node server.js` | **PASS** | Launches Next.js dev server with Socket.IO relay on `http://localhost:3000`. |
| `npm run build` | `next build` | **PASS** | Generates static export in `dist/`. Completed in ~12s. Type check passes. ESlint is skipped during build. |
| `npm run start` | `NODE_ENV=production node server.js` | **CAUTION** | Fails on Windows command prompt due to POSIX `NODE_ENV=production` syntax without `cross-env`. Powershell requires `$env:NODE_ENV="production"`. |
| `npm run dev-nolog` | `node server.js` | **PASS** | Identical to `npm run dev`. |
| `npm run build-nolog`| `next build` | **PASS** | Identical to `npm run build`. |
| `npx tsc --noEmit` | `tsc` | **PASS** | TypeScript v5 compiler passes with 0 errors across all `src/` files. |
| `npx next lint` | `eslint` | **CAUTION** | Core web vitals linting configured in `.eslintrc.json`, but bypassed during Next.js builds via `next.config.mjs` (`ignoreDuringBuilds: true`). |
| `npm test` | *None* | **MISSING** | No script defined in `package.json`. No test runner or framework present in repository. |

---

## 4. Repository Structure & Template Boundary Analysis

### 4.1 Provenance and Template Heritage
The repository was initialized from `phaserjs/template-nextjs`. The following files remain largely as template scaffolding:
- `src/pages/_document.tsx`
- `src/pages/_app.tsx`
- `src/game/EventBus.ts`
- `src/PhaserGame.tsx` (modified to inject Socket.IO into Phaser registry)
- `log.js` (Phaser Studio telemetry script)

### 4.2 Custom Gameplay Systems (Non-Template)
Everything else represents custom RTS implementation:
- `server.js`: Replaced template express/http handler with custom Next.js + Socket.IO relay server.
- `src/App.tsx`: Replaced template demo UI with RTS lobby, HUD, resource counters, selection panel, and build menu.
- `src/network/socketClient.ts`: Client socket instance.
- `src/store/`: Zustand split stores (`gameStateSlice`, `resourceSlice`, `uiSlice`).
- `src/game/main.ts`: Custom Phaser configuration (`#3e2723` background, RESIZE scale, Boot/Preloader/GameScene).
- `src/game/scenes/`:
  - `Boot.ts`: Entry scene.
  - `Preloader.ts`: Asset loader for Tiny Swords spritesheets and images.
  - `GameScene.ts`: World initialization, tilegrid rendering, camera controls, manager orchestration, socket relays.
- `src/game/managers/`:
  - `GridManager.ts`: 32x18 tile grid, EasyStar A* pathfinding, collision blocking, coordinate helpers.
  - `EntityManager.ts`: 773-line monolith managing units, buildings, resources, pop calculations, auto-job dispatch, and wandering AI.
  - `InteractionManager.ts`: 654-line input handler managing unit selection, ground move orders, ghost building placement, resource harvesting triggers.
- `src/game/entities/`:
  - `base/BaseEntity.ts`: Phaser Container wrapper with pixel positioning, health, selection ring, damage shake.
  - `base/BaseUnit.ts`: Path movement via Phaser Tweens, state machine, anti-overlap jitter.
  - `base/BaseBuilding.ts`: Footprints, construction progress tiles (`House_Construction`), progress bars.
  - `base/BaseResource.ts`: Resource nodes with health and yield.
  - `Worker.ts`: 441-line unit handling chopping, mining, carrying, building, hut automation, and drafting.
  - `Warrior.ts`: Military unit with attack animation definition (no combat logic).
  - `King.ts`: Crown graphics, golden aura, game over trigger on death.
  - `Stronghold.ts`: 5x2 castle, universal drop-off, auto-spawn progress bar.
  - `House.ts`: 2x2 population structure (+5 pop).
  - `BuildingEntity.ts`: Woodcutter's Hut (1x1 drop-off for wood, 2 worker capacity).
  - `GoldHut.ts`: 1x1 drop-off for gold (2 worker capacity).
  - `ResourceEntity.ts`: Trees with swaying animation and stump transition.
  - `GoldResource.ts`: 6-stage degrading gold stone nodes.

---

## 5. Asset Pack Verification (Tiny Swords by Pixel Frog)

The assets are stored under `public/assets/tiny-swords/` (Total size: ~4.03 MB). All referenced paths in `Preloader.ts` were programmatically verified against disk:

| Asset Key | File Path | Status on Disk | Dimensions / Frames |
| :--- | :--- | :--- | :--- |
| `grass_tiles` | `Terrain/Tileset/Tilemap_color1.png` | **EXISTS** | 64x64 tileset |
| `tree` | `Terrain/Resources/Wood/Trees/Tree1.png` | **EXISTS** | 1536x256 (8 frames @ 192x256) |
| `stump` | `Terrain/Resources/Wood/Trees/Stump 1.png` | **EXISTS** | Static image |
| `gold_stone_1..6` | `Terrain/Resources/Gold/Gold Stones/Gold Stone 1..6.png` | **EXISTS** | 6 progressive stage images |
| `pawn-idle`, `run`, etc.| `Units/Blue Units/Pawn/*.png` (15 sheets) | **EXISTS** | 192x192 sheets (axe, hammer, pick, wood, gold) |
| `pawn-red-*` | `Units/Red Units/Pawn/*.png` (15 sheets) | **EXISTS** | Red faction variants |
| `warrior-*` | `Units/Blue Units/Warrior/*.png` (3 sheets) | **EXISTS** | Idle, Run, Attack1 |
| `warrior-red-*` | `Units/Red Units/Warrior/*.png` (3 sheets) | **EXISTS** | Red faction variants |
| `castle` | `Buildings/Blue Buildings/Castle.png` | **EXISTS** | Static image (used for Stronghold) |
| `house1` | `Buildings/Blue Buildings/House1.png` | **EXISTS** | Static image |
| `hut` | `Buildings/Blue Buildings/Hut.png` | **EXISTS** | Static image (Woodcutter's Hut) |
| `gold_hut` | `Buildings/Blue Buildings/Gold_Hut.png` | **EXISTS** | Static image |
| `barracks` | `Buildings/Blue Buildings/Barracks.png` | **EXISTS** | Static image |
| `house_construction` | `Buildings/Blue Buildings/House_Construction.png`| **EXISTS** | Static image (tiled scaffold) |
| Avatars & Icons | `UI Elements/UI Elements/...` (7 icons) | **EXISTS** | Avatars, coin, log, sword, hammer, meat |

### Asset Anomalies Discovered:
1. **Red Faction Building Sprites:** `Preloader.ts` only loads `Buildings/Blue Buildings/` assets (`Castle.png`, `House1.png`, etc.). For Red faction buildings, the code tints Blue sprites red (`0xff8888`) instead of loading from `Buildings/Red Buildings/` (which exist on disk).
2. **Hardcoded HTML Asset Paths in React:** `App.tsx` references image URLs as relative paths: `src="assets/tiny-swords/..."` without leading slashes. In nested routing or certain static exports, relative URLs fail to resolve.
3. **Debug Bounds Enabled in Production:** `ResourceEntity.ts` and `GoldResource.ts` execute `this.scene.input.enableDebug(this, 0xff0000)`, causing permanent red bounding boxes to be drawn on all trees and gold stones in the game canvas.

---

## 6. Runtime Verification Results

### 6.1 Browser & Subagent Runtime Tests

Two browser sessions were conducted using automated browser subagents interacting with `http://localhost:3000`:

#### Session 1: Single Player Launch Check
- **Result:** Failed to reach gameplay.
- **Evidence:** Browser displays landing page lobby with "Pocket Crusader" title, "Create Room", and "Join Room" inputs. There is no single-player start option. Clicking "Create Room" displays "Room: [CODE] - Waiting for another player...". Phaser canvas does not instantiate.

#### Session 2: Two-Player Handshake & Game Initialization
- **Client 1:** Opened `http://localhost:3000`, clicked "Create Room", generated room code `NI5P`.
- **Client 2:** Opened second page, entered `NI5P`, clicked "Join".
- **Result:** Handshake succeeded! `room_ready` fired on both clients.
- **Phaser Startup:** Phaser v3.80.1 initialized WebGL context in `#game-container`. Preloader displayed `Loading...` for ~5 seconds while assets loaded, then transitioned into `GameScene`.
- **World State Rendered:**
  - 32x18 grass grid drawn with subtle grid lines.
  - Blue Base: Stronghold castle at [6, 9], King at [5, 9] with golden crown and aura, 3 starting pawns.
  - Red Base: Stronghold castle at [25, 9] (red-tinted), King at [24, 9], 3 starting pawns (red tunics).
  - Center: 2 Gold Stone nodes at [10, 5]-[11, 5] and 3 Pine Trees at [15, 5]-[17, 5].
  - HUD: Displayed 300 Wood, 300 Gold, 5/5 Population, Hammer build button, 5 Workers, 0 Warriors.
  - Auto-Spawning: Stronghold green progress bar filled every 10s and spawned additional workers up to the 5-cap.
  - Wandering AI: Units periodically picked random adjacent tiles and walked. Socket relay logs confirmed real-time movement packets being forwarded.

#### Session 3: UI & Interaction Verification
- **Unit Selection:** Clicking a worker selected the unit and set Zustand store state.
- **Resource Harvesting:** Ordering worker to chop pine tree initiated movement and axe chopping animation.
- **Build Button Failure:** Clicking the hammer build icon in the HUD failed to open the Build Menu. DOM inspection revealed that the click event was blocked by `.hud { pointer-events: none; }` because `.hudBuildBtn` lacks a CSS class definition with `pointer-events: auto`.
- **Camera/Viewport:** On desktop browser resolutions (e.g. 1280x720+), a wide black/brown area appears to the right of the map because the map bounds are fixed at 2048x1152 and default zoom is 1.0 without responsive auto-fit.
