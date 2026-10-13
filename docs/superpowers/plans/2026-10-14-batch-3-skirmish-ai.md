# Batch 3: Skirmish Enemy AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a lightweight, robust, autonomous RTS Skirmish AI manager (`AIManager.ts`) that governs the Red faction in solo play: harvesting resources, constructing houses and barracks, training warriors, and launching tactical attack waves against the player's base and King.

**Architecture:**
1. `src/game/managers/AIManager.ts`: Implements state-driven AI logic for the Red faction:
   - Economy: Auto-assigns idle red workers to nearest wood trees and gold stones with balanced quotas.
   - Construction: Validates grid footprints and places House (`col: 22, row: 11`) and Barracks (`col: 20, row: 8`), dispatching workers to construct them.
   - Military Recruitment: Automatically drafts red workers at the Barracks when gold >= 20 and available workers > 1.
   - Combat Assault Waves: Evaluates defense threats within 6 tiles of Red base, or marches red warriors toward the Blue King and Blue base to engage in melee combat.
2. `src/game/scenes/GameScene.ts`: Instantiates `AIManager` when `roomId === 'solo_skirmish'` or `!roomId` and calls `aiManager.update(time, delta)` in `GameScene.update()`.
3. `tests/gameplay_rules.test.ts`: Automated unit tests for AI decision rules (resource allocation priorities, recruitment thresholds, target prioritization).

**Tech Stack:** Next.js 15, Phaser 3.80.1, Zustand 5, Node.js 23 native test runner.

**Spec:** `docs/audit/RECOVERY_ROADMAP.md` (Stage 4: Task S4-01).

---

### Task 1: Add Skirmish AI Rules Unit Tests in `tests/gameplay_rules.test.ts`

**Files:**
- Modify: `tests/gameplay_rules.test.ts`

**Interfaces:**
- Tests: AI resource balance decisions (wood vs gold priority), AI attack wave trigger condition (military size >= 1), AI threat proximity detection.

- [ ] **Step 1: Add AI unit tests in `tests/gameplay_rules.test.ts`**
- [ ] **Step 2: Run `npm test` and verify passing.**

---

### Task 2: Create `AIManager.ts` for Autonomous Enemy Skirmish

**Files:**
- Create: `src/game/managers/AIManager.ts`

**Interfaces:**
- Consumes: `EntityManager`, `GridManager`, `useGameStore`, `Phaser.Scene`
- Produces: Autonomous worker harvesting, building construction orders, warrior training, attack wave dispatch.

- [ ] **Step 1: Implement `AIManager` structure with throttled tick timer (every 2.5s).**
- [ ] **Step 2: Implement `manageEconomy()` to assign idle red workers to wood or gold.**
- [ ] **Step 3: Implement `manageConstruction()` to build House and Barracks in Red territory.**
- [ ] **Step 4: Implement `manageRecruitment()` to train Warriors at completed Barracks.**
- [ ] **Step 5: Implement `manageMilitary()` to defend base and march attack waves at Blue King.**
- [ ] **Step 6: Run `npx tsc --noEmit` to verify type safety.**

---

### Task 3: Integrate `AIManager` in `GameScene.ts`

**Files:**
- Modify: `src/game/scenes/GameScene.ts`

**Interfaces:**
- Instantiates: `this.aiManager = new AIManager(this, this.entityManager, this.gridManager, 'red')` in solo skirmish.
- Updates: `this.aiManager.update(time, delta)` in `GameScene.update()`.

- [ ] **Step 1: Add `aiManager` property and initialization in `GameScene.ts`.**
- [ ] **Step 2: Call `this.aiManager.update(time, delta)` in `GameScene.update()`.**
- [ ] **Step 3: Run `npx tsc --noEmit` and `npm test`.**

---

### Task 4: Runtime Browser Verification & Documentation Updates

**Files:**
- Modify: `docs/audit/RECOVERY_ROADMAP.md`
- Modify: `docs/audit/FEATURE_INVENTORY.md`

- [ ] **Step 1: Verify in browser that Red faction autonomously gathers, builds, and attacks.**
- [ ] **Step 2: Update `docs/audit/RECOVERY_ROADMAP.md` and `docs/audit/FEATURE_INVENTORY.md`.**
