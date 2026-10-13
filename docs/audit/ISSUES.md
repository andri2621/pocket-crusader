# Pocket Crusader — Issues & Architectural Risks Register

This document catalogs confirmed defects, architectural risks, and verified technical limitations across the Pocket Crusader codebase.

---

## 1. Confirmed Defects Register

### ISSUE-01: Single-Player Movement Hard-Blocked by Room ID Gate
- **Severity:** Critical
- **Evidence:** `src/game/managers/InteractionManager.ts:536–539`
  ```typescript
  if (!roomId || !this.selectedUnit) {
      console.warn("[Client Click] Aborted. Missing Room ID or no Unit selected.");
      return;
  }
  ```
- **Reproduction Steps:**
  1. Force `GameScene` to mount locally without connecting to a multiplayer room (`roomId = null`).
  2. Select any friendly worker or king by clicking its sprite.
  3. Click on any walkable ground tile on the map.
  4. Observe console warning: `[Client Click] Aborted. Missing Room ID or no Unit selected.`
  5. The unit never executes pathfinding or movement.
- **Root Cause:** Ground movement dispatch was hard-wired to multiplayer synchronization checks before validating if the current session is local/single-player.
- **Gameplay Impact:** Complete game-stopping blocker for single-player skirmish; game cannot be played offline.
- **Recommended Fix:** Allow local movement regardless of `roomId`. Wrap socket emissions in `if (roomId && activeSocket)` conditional.
- **Scope:** Local Fix (1–2 lines in `InteractionManager.ts`).

---

### ISSUE-02: Missing Single-Player Skirmish Launch Option
- **Severity:** Critical
- **Evidence:** `src/App.tsx:340–385`
- **Reproduction Steps:**
  1. Open `http://localhost:3000/`.
  2. Review the landing screen options.
  3. Only "Create Room" and "Join Room" buttons are available.
  4. The Phaser canvas (`<PhaserGame />`) only mounts after receiving `socket.on('room_ready')` from the server.
- **Root Cause:** The application lifecycle has no routing branch or UI button for single-player skirmish.
- **Gameplay Impact:** Players cannot launch or test the game without opening two browser tabs and performing a network handshake.
- **Recommended Fix:** Add a "Play Solo (Skirmish)" button in `App.tsx` that sets a local room ID (e.g. `solo_skirmish`), sets `faction = 'blue'`, and directly sets `hasStarted = true`.
- **Scope:** Local Fix (UI addition in `App.tsx`).

---

### ISSUE-03: Memory Leak & Blocked Tile on Resource Node Depletion
- **Severity:** High
- **Evidence:** `src/game/entities/GoldResource.ts:61–67` and `src/game/managers/EntityManager.ts:207–217`
  ```typescript
  // GoldResource.ts:
  protected override onDepleted(): void {
      this.mainSprite.setVisible(false);
      this.currentMiners = [];
      this.emit('depleted', this);
      this.destroy(); // Remove entity from scene
  }
  ```
- **Reproduction Steps:**
  1. Assign workers to mine a gold rock until all 60 health points are depleted.
  2. Inspect `EntityManager.resources` array in memory.
  3. The destroyed `GoldResource` instance remains inside `EntityManager.resources`.
  4. Attempt to walk a worker over the tile where the gold rock was located.
  5. The tile remains impassable (`isTileWalkable === false`).
- **Root Cause:**
  - `GoldResource.destroy()` destroys the Phaser game object, but `EntityManager` never registers an event listener for `'depleted'` and never splices the entity from `this.resources`.
  - `GridManager.unblockTile(this.gridX, this.gridY)` is never called upon depletion.
- **Technical Impact:**
  - Memory leak as depleted nodes accumulate in simulation loop arrays.
  - Runtime exception hazard: `EntityManager.update()` calls `resource.update()` on destroyed game objects.
  - Permanent phantom tile blockades on the map.
- **Recommended Fix:** Implement `EntityManager.removeResource(res)` and have `EntityManager` listen to `res.on('depleted', ...)` to remove the resource and call `gridManager.unblockTile()`.
- **Scope:** Local Fix (`EntityManager.ts`, `GoldResource.ts`, `ResourceEntity.ts`).

---

### ISSUE-04: Permanent Red Debug Hitboxes Enabled in Production
- **Severity:** High
- **Evidence:** `src/game/entities/ResourceEntity.ts:22` and `src/game/entities/GoldResource.ts:21`
  ```typescript
  this.scene.input.enableDebug(this, 0xff0000);
  ```
- **Reproduction Steps:**
  1. Open the game in any browser.
  2. Observe every tree and gold rock on the map.
  3. Bright red debug bounding boxes are drawn permanently over every resource entity.
- **Root Cause:** Debug calls were left active in constructors and never gated behind a debug configuration flag.
- **Technical Impact:** Visual pollution that breaks visual immersion and aesthetic polish.
- **Recommended Fix:** Remove `enableDebug` calls or gate them behind `process.env.NODE_ENV === 'development' && DEBUG_HITBOXES`.
- **Scope:** Local Fix (2 lines across two files).

---

### ISSUE-05: 60 Hz React Re-Render Bottleneck in Barracks Update Loop
- **Severity:** High
- **Evidence:** `src/game/entities/Barracks.ts:311–318`
  ```typescript
  if (store.selectedBuildingId === this.id) {
      const uiQueue = this.trainingRecruits.map(r => r.unitType);
      store.setTrainingState(uiQueue, this.currentTrainingProgress);
  }
  ```
- **Reproduction Steps:**
  1. Select a friendly Barracks and start training a Warrior.
  2. Open React DevTools Profiler or insert a `console.log` in `SelectionPanel`.
  3. Observe that `SelectionPanel` re-renders on every animation frame (60 times per second) for the entire 10-second training duration.
- **Root Cause:** Calling Zustand `setTrainingState()` every frame inside Phaser `update()` triggers React's reconciliation engine at 60 FPS.
- **Technical Impact:** Severe CPU utilization and battery drain on mobile devices; frame drops during military production.
- **Recommended Fix:** Throttle the Zustand sync to 5–10 Hz (every 100–200ms) or update progress bar via local SVG/CSS animation.
- **Scope:** Refactor / Optimization (`Barracks.ts`, `SelectionPanel`).

---

### ISSUE-06: Combat & Damage Subsystem Is Completely Missing
- **Severity:** High
- **Evidence:** `src/game/entities/Warrior.ts:1–47`
- **Reproduction Steps:**
  1. Train a Warrior at the Barracks.
  2. Move the Warrior next to an enemy pawn or enemy King.
  3. Attempt to issue an attack command.
  4. There is no attack command handler; warriors only have idle and walk states.
- **Root Cause:** The combat loop was never implemented. Warriors were created as animated visual sprites without gameplay systems.
- **Gameplay Impact:** Game cannot be won or fought; core RTS gameplay loop (Gather → Build → Train → **Fight** → Win) breaks at the combat stage.
- **Recommended Fix:** Implement `BaseUnit.attack(targetEntity)`, attack range check, combat cooldown timer, damage calculation, and death dispatch.
- **Scope:** Architectural Subsystem Implementation.

---

### ISSUE-07: Unhandled Multiplayer Disconnections
- **Severity:** Medium
- **Evidence:** `server.js:121` emits `player_disconnected`, but search across `src/` yields zero listeners.
- **Reproduction Steps:**
  1. Start a 2-player game in two browser tabs.
  2. Close tab 2.
  3. Observe tab 1.
  4. Tab 1 receives no notification, alert, or victory trigger. The player remains stranded in the game.
- **Root Cause:** Client-side networking in `App.tsx` and `GameScene.ts` never hooked into the `player_disconnected` event.
- **Technical Impact:** Poor user experience; abandoned matches hang indefinitely.
- **Recommended Fix:** Listen to `player_disconnected` in `App.tsx` and show a "Player disconnected — Victory!" modal.
- **Scope:** Local Fix (`App.tsx`).

---

### ISSUE-08: Dual Event Bus Architecture & Fragile Listener Cleanup
- **Severity:** Medium
- **Evidence:** `src/game/managers/EntityManager.ts:34, 74`
  ```typescript
  EventBus.off('train_warrior'); // Prevent stacking
  EventBus.on('train_warrior', ...);
  ```
- **Root Cause:** Two different event buses are mixed (`EventBus` singleton and `scene.events`). Global `EventBus` persists across scene lifecycles, requiring defensive unbinding.
- **Technical Impact:** Fragile code susceptible to memory leaks, duplicate event execution, or lost events during scene restarts.
- **Recommended Fix:** Consolidate event communication through a typed GameEvents interface managed by the scene lifecycle.
- **Scope:** Refactor.

---

### ISSUE-09: Frame Polling of Zustand Store for Build Mode
- **Severity:** Medium
- **Evidence:** `src/game/managers/InteractionManager.ts:72–83`
  ```typescript
  this.scene.events.on('update', () => {
      const store = useGameStore.getState();
      const placing = store.isPlacingBuilding;
      if (placing && !this.isBuildMode) this.enterBuildMode(placing);
      else if (!placing && this.isBuildMode) this.exitBuildMode(false);
  });
  ```
- **Root Cause:** Instead of using Zustand's `subscribe()` or event emission, `InteractionManager` polls store state 60 times per second.
- **Technical Impact:** Wasteful CPU cycles and unnecessary store reads on every tick.
- **Recommended Fix:** Use `useGameStore.subscribe((state) => state.isPlacingBuilding, ...)` or emit an event when build mode changes.
- **Scope:** Local Refactor (`InteractionManager.ts`).

---

### ISSUE-10: State Duplication Between Root & Nested Faction Resources
- **Severity:** Medium
- **Evidence:** `src/store/slices/resourceSlice.ts:28–100` and `src/store/slices/gameStateSlice.ts:37–81`
- **Root Cause:** Store keeps root properties (`state.wood`, `state.gold`, `state.currentPopulation`) while also maintaining `state.resources[faction]`. Mutators use `(state: any)` casting and manually sync root and nested properties.
- **Technical Impact:** Loss of TypeScript type safety; risk of split-brain state where UI reads root values that don't match faction values.
- **Recommended Fix:** Normalize state structure so `state.resources[faction]` is the single source of truth, and provide typed selector helpers.
- **Scope:** Store Refactor (`resourceSlice.ts`, `gameStateSlice.ts`).

---

### ISSUE-11: Victory / Defeat Modal Never Rendered
- **Severity:** Medium
- **Evidence:** `src/game/entities/King.ts:74–78` sets `isGameOver: true`, but `src/App.tsx` never reads or renders `isGameOver`.
- **Root Cause:** Victory UI modal was omitted from React HUD layout.
- **Gameplay Impact:** Even if game-over is triggered programmatically, the player is never notified.
- **Recommended Fix:** Render a game-over modal in `App.tsx` when `isGameOver === true`.
- **Scope:** Local UI addition (`App.tsx`).

---

## 2. Unverified Hypotheses for Further Runtime Testing

1. **Hypothesis H-1 (Multiplayer Desync on Simultaneous Build):** If two players simultaneously place buildings overlapping each other within a few milliseconds, both clients may block different tiles locally before receiving peer packets, causing irrecoverable pathfinding divergence.
   - *Test Needed:* Script automated simultaneous socket packets from two clients targeting the same tile.
2. **Hypothesis H-2 (Mobile Multi-Touch Conflict):** Dragging camera with two fingers while tapping to place a ghost building may trigger conflicting pointer events in `InteractionManager`.
   - *Test Needed:* Emulate multi-touch mobile gestures in Chrome DevTools device mode.
3. **Hypothesis H-3 (Timer Drift in Worker Gathering):** Phaser's `time.addEvent` is bound to the client frame rate. A client experiencing frame drops may gather resources slower than a peer at 60 FPS, causing resource node health desync.
   - *Test Needed:* Throttle CPU on one client and compare resource depletion timestamps.
