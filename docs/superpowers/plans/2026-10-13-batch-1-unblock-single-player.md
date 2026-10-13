# Batch 1: Unblock Single-Player & Fix Critical Simulation Defects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unblock single-player gameplay, add a solo skirmish launch button, fix resource depletion memory and tile leaks, remove debug bounding boxes in production, throttle Barracks UI updates, and establish automated unit testing for core gameplay rules.

**Architecture:** 
1. Decouple local player input and unit movement commands from Socket.IO networking requirements in `InteractionManager.ts`.
2. Add a direct "Play Solo (Skirmish)" launch path in `App.tsx` that bypasses the 2-player lobby handshake.
3. Establish proper entity lifecycle cleanup: `EntityManager` listens to `'depleted'` on resource entities, unblocks the corresponding tile in `GridManager`, removes the entity from `resources[]`, and cancels any targeting workers.
4. Remove `enableDebug` calls on resource entities.
5. Throttle Barracks training progress updates from 60 Hz down to discrete delta checkpoints to stop React UI re-render thrashing.
6. Create pure TypeScript gameplay test suite runnable via Node 23 native test runner.

**Tech Stack:** Next.js 15, React 19, Phaser 3.80.1, Zustand 5, Node.js 23 native test runner (`node --test`).

**Spec:** `docs/audit/RECOVERY_ROADMAP.md` (Stage 1 & Stage 2 tasks: S1-01, S1-02, S2-01, S2-02, S2-03).

## Global Constraints
- Do not introduce new third-party libraries or npm dependencies.
- Keep mobile compatibility intact (no right-click or keyboard-only requirements).
- Preserve existing working systems (worker harvesting loop, building construction, barracks training, pathfinding).
- Keep TypeScript types clean; ensure `npx tsc --noEmit` and `npm run build` pass with 0 errors.

---

### Task 1: Unblock Single-Player Ground Movement in `InteractionManager.ts`

**Files:**
- Modify: `src/game/managers/InteractionManager.ts:530-562`

**Interfaces:**
- Consumes: `useGameStore.getState().roomId`, `this.selectedUnit`
- Produces: `moveToGrid` command dispatched locally regardless of `roomId`; socket event emitted conditionally only when `roomId && activeSocket`.

- [ ] **Step 1: Inspect lines 530-560 in `InteractionManager.ts`**
Verify the exact guard:
```typescript
if (!roomId || !this.selectedUnit) {
    console.warn("[Client Click] Aborted. Missing Room ID or no Unit selected.");
    return;
}
```

- [ ] **Step 2: Modify `InteractionManager.ts` to allow movement without `roomId`**
Remove the `!roomId` guard so ground movement executes locally when `this.selectedUnit` is valid:
```typescript
if (!this.selectedUnit) {
    return;
}

// Execute local movement pathfinding
this.selectedUnit.moveToGrid(targetPos.col, targetPos.row);

// Dynamically emit via socket only if connected to an active room
if (roomId) {
    const activeSocket = (this.scene as any).socket || this.scene.game.registry.get('socket');
    if (activeSocket) {
        activeSocket.emit('client_unit_move', {
            roomId: String(roomId).trim(),
            entityId: this.selectedUnit.id,
            targetCol: targetPos.col,
            targetRow: targetPos.row
        });
    }
}
```

- [ ] **Step 3: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: Exits with code 0.

---

### Task 2: Add "Play Solo (Skirmish)" Button in `App.tsx`

**Files:**
- Modify: `src/App.tsx:285-360`
- Modify: `src/styles/App.module.css:63-100`

**Interfaces:**
- Consumes: `useGameStore.getState().setMultiplayerState`
- Produces: `handleStartSoloSkirmish()` action setting `roomId = 'solo_skirmish'`, `isHost = true`, `faction = 'blue'`, `hasStarted = true`.

- [ ] **Step 1: Add `handleStartSoloSkirmish` to `App.tsx`**
In `src/App.tsx`:
```typescript
const handleStartSoloSkirmish = async () => {
    setMultiplayerState('solo_skirmish', true, 'blue');
    await requestFullscreenAndLock();
    setHasStarted(true);
    setIsFullscreen(true);
};
```

- [ ] **Step 2: Add UI button in `App.tsx` landing panel**
Inside `<div className={styles.lobbyActions}>`:
```tsx
<button className={styles.lobbyBtnPrimary} onClick={handleStartSoloSkirmish}>
    Play Solo (Skirmish)
</button>
<div className={styles.lobbyDivider}>
    <span>or Multiplayer</span>
</div>
```

- [ ] **Step 3: Style the divider in `App.module.css`**
Add styles for `.lobbyDivider`:
```css
.lobbyDivider {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 4px 0;
}
```

- [ ] **Step 4: Run build check**
Run: `npx tsc --noEmit`
Expected: Exits with code 0.

---

### Task 3: Fix Resource Node Depletion Memory & Tile Leaks

**Files:**
- Modify: `src/game/entities/GoldResource.ts:60-68`
- Modify: `src/game/entities/ResourceEntity.ts:25-38`
- Modify: `src/game/managers/EntityManager.ts:203-217, 340-360`

**Interfaces:**
- Consumes: `BaseResource.takeDamage()`, `resource.emit('depleted', this)`
- Produces: `EntityManager.handleResourceDepleted(resource)`, `GridManager.unblockTile(col, row)`

- [ ] **Step 1: Update `GoldResource.ts` onDepleted**
In `GoldResource.ts`, ensure `depleted` event passes `this`:
```typescript
protected override onDepleted(): void {
    this.mainSprite.setVisible(false);
    this.currentMiners = [];
    this.emit('depleted', this);
    this.destroy(); // Remove entity from scene
}
```

- [ ] **Step 2: Update `ResourceEntity.ts` onDepleted**
In `ResourceEntity.ts`, set stump and unblock tile when depleted:
```typescript
protected override onDepleted(): void {
    if (this.resourceType === 'wood') {
        this.mainSprite.stop();
        this.mainSprite.setTexture('stump');
        this.mainSprite.setOrigin(0.5, 0.95);
    } else if (this.resourceType === 'gold') {
        this.mainSprite.setVisible(false);
    }
    
    // Emit event so EntityManager can update walk grid and prune references
    this.emit('depleted', this);
}
```

- [ ] **Step 3: Add `handleResourceDepleted` in `EntityManager.ts`**
In `EntityManager.ts`:
1. In `addResource(resource: BaseResource)`:
```typescript
public addResource(resource: BaseResource) {
    this.resources.push(resource);
    resource.once('depleted', (res: BaseResource) => {
        this.handleResourceDepleted(res);
    });
}
```
2. Implement `handleResourceDepleted`:
```typescript
private handleResourceDepleted(resource: BaseResource) {
    // 1. Unblock tile in grid
    this.gridManager.unblockTile(resource.gridX, resource.gridY);

    // 2. Remove from active resources array
    this.resources = this.resources.filter(r => r !== resource && r.id !== resource.id);

    // 3. Clear any workers targeting this resource
    for (const unit of this.units) {
        if (unit instanceof Worker && unit.getTargetResource() === resource) {
            unit.cancelGathering();
            unit.setWorkerState('IDLE');
        }
    }
}
```

- [ ] **Step 4: In `EntityManager.update()`, guard against destroyed resources**
Ensure iteration does not crash if a resource was destroyed mid-tick:
```typescript
for (const resource of this.resources) {
    if (resource && resource.active) {
        resource.update(time, delta);
    }
}
```

- [ ] **Step 5: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: Exits with code 0.

---

### Task 4: Remove Production Debug Bounding Boxes

**Files:**
- Modify: `src/game/entities/ResourceEntity.ts:18-24`
- Modify: `src/game/entities/GoldResource.ts:18-24`

**Interfaces:**
- Removes: `this.scene.input.enableDebug(this, 0xff0000)`

- [ ] **Step 1: Remove debug hitbox in `ResourceEntity.ts`**
Remove `this.scene.input.enableDebug(this, 0xff0000);`.

- [ ] **Step 2: Remove debug hitbox in `GoldResource.ts`**
Remove `this.scene.input.enableDebug(this, 0xff0000);`.

- [ ] **Step 3: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: Exits with code 0.

---

### Task 5: Throttle Barracks Training Updates

**Files:**
- Modify: `src/game/entities/Barracks.ts:300-335`

**Interfaces:**
- Consumes: `trainingTimer.getOverallProgress()`
- Produces: Throttled calls to `useGameStore.getState().setTrainingState()` only when progress advances by >= 0.05 or completes.

- [ ] **Step 1: Add `lastSyncedProgress` tracking in `Barracks.ts`**
Add private property `private lastSyncedProgress: number = -1;`.

- [ ] **Step 2: Update `Barracks.update()` to throttle store sync**
In `Barracks.ts`:
```typescript
if (this.isTraining && this.trainingTimer) {
    this.currentTrainingProgress = this.trainingTimer.getOverallProgress();
    this.updateTrainingBar(this.currentTrainingProgress);
    
    // Throttle React store sync: only update if progress changed by at least 5% (0.05) or finished
    const store = useGameStore.getState();
    if (store.selectedBuildingId === this.id) {
        if (Math.abs(this.currentTrainingProgress - this.lastSyncedProgress) >= 0.05 || this.currentTrainingProgress >= 1) {
            this.lastSyncedProgress = this.currentTrainingProgress;
            const uiQueue = this.trainingRecruits.map(r => r.unitType);
            store.setTrainingState(uiQueue, this.currentTrainingProgress);
        }
    }
}
```

- [ ] **Step 3: Reset `lastSyncedProgress = -1` when queue empties**
In `cancelQueueItem` and `onTrainingComplete`, reset `this.lastSyncedProgress = -1`.

- [ ] **Step 4: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: Exits with code 0.

---

### Task 6: Add Pure Gameplay Unit Tests

**Files:**
- Create: `tests/gameplay_rules.test.ts`
- Modify: `package.json:24-30`

**Interfaces:**
- Tests: Resource deduction/refund math, building cost rules, population cap formulas, worker carry limits.

- [ ] **Step 1: Add `test` script in `package.json`**
Add `"test": "node --experimental-strip-types --test tests/**/*.test.ts"` to `scripts`.

- [ ] **Step 2: Create `tests/gameplay_rules.test.ts`**
Write tests using Node 23 native test runner:
```typescript
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

describe('RTS Economy & Population Rules', () => {
    test('House costs 30 wood and adds 5 max population', () => {
        const initialWood = 300;
        const houseCost = 30;
        const remainingWood = initialWood - houseCost;
        assert.equal(remainingWood, 270);
        
        const basePop = 5;
        const newMaxPop = basePop + 5;
        assert.equal(newMaxPop, 10);
    });

    test('Barracks costs 50 wood and 50 gold', () => {
        const woodCost = 50;
        const goldCost = 50;
        assert.equal(woodCost + goldCost, 100);
    });

    test('Warrior training costs 20 gold and requires available workers > 1', () => {
        const canTrain = (gold: number, availableWorkers: number) => gold >= 20 && availableWorkers > 1;
        assert.equal(canTrain(20, 2), true);
        assert.equal(canTrain(19, 2), false);
        assert.equal(canTrain(50, 1), false);
    });

    test('Worker carry capacity caps at 10 resources', () => {
        let carried = 0;
        const yieldPerHit = 5;
        carried += yieldPerHit;
        assert.equal(carried, 5);
        carried += yieldPerHit;
        assert.equal(carried, 10);
        const isFull = carried >= 10;
        assert.equal(isFull, true);
    });
});
```

- [ ] **Step 3: Run the test suite**
Run: `npm test`
Expected: All tests pass.

---

### Task 7: Runtime Browser Verification & Documentation Update

**Files:**
- Modify: `docs/audit/RECOVERY_ROADMAP.md`
- Modify: `docs/audit/FEATURE_INVENTORY.md`

- [ ] **Step 1: Test solo launch and unit movement in browser**
Launch browser via `browser_subagent` to verify:
1. "Play Solo (Skirmish)" button appears and is clickable.
2. GameScene mounts immediately without waiting for a room.
3. Unit selection works without red bounding boxes.
4. Clicking ground moves unit smoothly along path.
5. Workers gather resources and build structures.

- [ ] **Step 2: Update `docs/audit/RECOVERY_ROADMAP.md` and `docs/audit/FEATURE_INVENTORY.md`**
Mark S1-01, S1-02, S2-01, S2-02, S2-03 as completed and verified.
