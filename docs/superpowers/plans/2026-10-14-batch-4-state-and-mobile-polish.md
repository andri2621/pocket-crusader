# Batch 4: State Normalization, Mobile Polish & Final Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate type-casting tech debt in the Zustand store, replace per-frame build mode polling with reactive store subscriptions, optimize mobile touch targets and safe-area insets, and deliver the final audit recovery report.

**Architecture:** 
1. Normalizes Zustand slices by passing `GameStore` as the root state interface to all `StateCreator` factories, eliminating loose `(state: any)` casts and guaranteeing compile-time type safety across `resourceSlice`, `gameStateSlice`, and `uiSlice`.
2. Replaces frame-based `InteractionManager` polling on `scene.events.on('update')` with a reactive `useGameStore.subscribe()` listener that responds instantly to build state changes and cleans up on scene shutdown.
3. Upgrades mobile responsiveness with `env(safe-area-inset)` layout padding and minimum 48px touch hitboxes for all gameplay buttons.
4. Updates audit documentation and verifies system stability across automated tests and TypeScript compilation.

**Tech Stack:** React 19, TypeScript 5.8, Zustand 5, Phaser 3.88, Node.js 23 test runner.

**Spec:** `docs/audit/RECOVERY_ROADMAP.md` (Stages 5 & 6) and `docs/audit/ISSUES.md` (ISSUE-07, ISSUE-08).

## Global Constraints
- Zero TypeScript compiler errors (`npx tsc --noEmit`).
- All 17+ tests in `tests/gameplay_rules.test.ts` must pass.
- No regression in existing single-player RTS loop (gathering, building, training, combat, win/loss).
- Mobile-first compatibility: min 48px touch targets and safe-area insets.

---

### Task 1: Type-Safe Zustand State Normalization (S5-01)

**Files:**
- Modify: `src/store/useGameStore.ts`
- Modify: `src/store/slices/resourceSlice.ts`
- Modify: `src/store/slices/gameStateSlice.ts`
- Modify: `src/store/slices/uiSlice.ts`

**Interfaces:**
- Consumes: `GameStore` merged interface combining `ResourceSlice`, `UISlice`, and `GameStateSlice`.
- Produces: Strictly typed slice mutators with zero `(state: any)` casts.

- [ ] **Step 1: Write test case for store resource & population normalization**
Add test in `tests/gameplay_rules.test.ts` verifying faction resource isolation and deduction rules.

- [ ] **Step 2: Export `GameStore` type and refactor `resourceSlice.ts`**
Replace `StateCreator<ResourceSlice>` with `StateCreator<GameStore, [], [], ResourceSlice>`. Remove all `(state: any)` casts in `addWood`, `addGold`, `deductWood`, `deductGold`, `addFactionWood`, `addFactionGold`.

- [ ] **Step 3: Refactor `gameStateSlice.ts` to use `GameStore` type**
Replace `StateCreator<GameStateSlice>` with `StateCreator<GameStore, [], [], GameStateSlice>`. Remove all `(state: any)` casts in `setPopulation` and `setFactionPopulation`.

- [ ] **Step 4: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 2: Reactive Build Mode Subscription in InteractionManager (S5-02)

**Files:**
- Modify: `src/game/managers/InteractionManager.ts`

**Interfaces:**
- Consumes: `useGameStore.subscribe()`
- Produces: Reactive enter/exit build mode transitions without per-frame polling.

- [ ] **Step 1: Replace `pollBuildModeFromStore` with `setupStoreSubscriptions`**
Subscribe to `useGameStore` using `useGameStore.subscribe()`. Track previous `isPlacingBuilding` value and invoke `enterBuildMode` / `exitBuildMode` only on value changes.

- [ ] **Step 2: Clean up subscription on scene shutdown**
Add cleanup handler to `this.scene.events.once('shutdown')` and `destroy()` to unsubscribe from the store.

- [ ] **Step 3: Verify TypeScript compilation and building placement**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 3: Mobile Touch Targets & Safe Area Insets (S6-01)

**Files:**
- Modify: `src/styles/App.module.css`

**Interfaces:**
- Consumes: CSS `env(safe-area-inset-top/bottom/left/right)`
- Produces: Polished responsive HUD with >= 48px touch targets on mobile devices.

- [ ] **Step 1: Add safe area inset support to HUD, Quick Sidebar, and Modals**
Update `.hud`, `.quickSidebar`, and `.buildMenuOverlay` to use `max(12px, env(safe-area-inset-*))`.

- [ ] **Step 2: Ensure minimum 48px touch targets for all interactive elements**
Add `min-width: 48px; min-height: 48px;` to `.hudBuildBtn`, `.quickSidebarItem`, `.buildCard`, and modal buttons.

- [ ] **Step 3: Add responsive media queries for small mobile viewports**
Optimize `.hudItem`, `.hud`, and `.quickSidebar` for viewports under 640px width so all elements remain legible and accessible.

---

### Task 4: Test Suite Run & Final Verification

**Files:**
- Modify: `tests/gameplay_rules.test.ts`

- [ ] **Step 1: Run native Node test suite**
Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript compiler**
Run: `npx tsc --noEmit`
Expected: Clean exit code 0.

---

### Task 5: Final Recovery Audit & Documentation (Phase 7 Wrap-up)

**Files:**
- Modify: `docs/audit/RECOVERY_ROADMAP.md`
- Modify: `docs/audit/FINAL_REPORT.md`

- [ ] **Step 1: Update RECOVERY_ROADMAP.md**
Mark Stages 5 and 6 as `COMPLETED & VERIFIED`.

- [ ] **Step 2: Update FINAL_REPORT.md**
Add final implementation metrics, test coverage stats, single-player loop verification summary, and maintainability review.
