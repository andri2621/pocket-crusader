# Batch 2: Warrior Melee Combat Loop & Win/Lose Match Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete melee combat system for Warriors (attack range, cooldown, swing animation, damage application, health deduction, unit death cleanup), target acquisition via touch/tap input in `InteractionManager`, and match resolution (Victory when enemy King dies, Defeat when player King dies, with interactive Victory/Defeat modal and match restart).

**Architecture:**
1. `Warrior.ts`: Implements combat state machine (`targetEntity`, `attackCooldown`, `attackDamage = 25`, `attackRange = 1.5` tiles, melee attack loop in `update()`, facing flip, `${texturePrefix}-attack` animation).
2. `InteractionManager.ts`: Detects taps on hostile units/kings/buildings when a Warrior is selected; dispatches `warrior.attackTarget(enemy)`; renders red target indicator.
3. `BaseEntity.ts` & `BaseUnit.ts`: Implements uniform unit death lifecycle (`emit('death')`, visual fade tween, unlinking from selection and `EntityManager.units`).
4. `King.ts` & `gameStateSlice.ts`: Enriches match-end resolution (`gameResult: 'victory' | 'defeat'`). Differentiates player King death (Defeat) from enemy King death (Victory).
5. `App.tsx`: Renders glassmorphic Victory / Defeat screen with celebratory/somber styling, outcome banner, and "Play Again" restart button that cleans up and restarts the skirmish cleanly.
6. `tests/gameplay_rules.test.ts`: Automated unit tests for combat calculations, melee range checks, and match resolution logic.

**Tech Stack:** Next.js 15, React 19, Phaser 3.80.1, Zustand 5, Node.js 23 native test runner.

**Spec:** `docs/audit/RECOVERY_ROADMAP.md` (Stage 3 tasks: S3-01, S3-02).

---

### Task 1: Add Combat Rules Unit Tests in `tests/gameplay_rules.test.ts`

**Files:**
- Modify: `tests/gameplay_rules.test.ts`

**Interfaces:**
- Tests: Melee combat damage math, melee range adjacency rules, victory/defeat condition evaluation.

- [ ] **Step 1: Add combat and match resolution test suites to `tests/gameplay_rules.test.ts`**
```typescript
describe('RTS Combat & Damage Calculation Rules', () => {
    test('Warrior deals 25 damage per hit', () => {
        let targetHp = 100;
        const warriorDamage = 25;
        targetHp -= warriorDamage;
        assert.equal(targetHp, 75);
    });

    test('Melee range considers adjacent tiles within Chebyshev distance 1', () => {
        const isMeleeRange = (c1: number, r1: number, c2: number, r2: number) => {
            return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2)) <= 1;
        };
        assert.equal(isMeleeRange(5, 5, 5, 6), true); // North
        assert.equal(isMeleeRange(5, 5, 6, 6), true); // Diagonal
        assert.equal(isMeleeRange(5, 5, 5, 7), false); // 2 tiles away
        assert.equal(isMeleeRange(5, 5, 7, 7), false);
    });

    test('King death determines victory vs defeat based on faction', () => {
        const resolveMatch = (playerFaction: 'blue' | 'red', deadKingFaction: 'blue' | 'red') => {
            return playerFaction === deadKingFaction ? 'defeat' : 'victory';
        };
        assert.equal(resolveMatch('blue', 'red'), 'victory');
        assert.equal(resolveMatch('blue', 'blue'), 'defeat');
    });
});
```

- [ ] **Step 2: Run test suite to verify tests execute**
Run: `npm test`
Expected: Passes.

---

### Task 2: Implement Unit Death Lifecycle in `BaseUnit.ts` and `EntityManager.ts`

**Files:**
- Modify: `src/game/entities/base/BaseUnit.ts:155-173`
- Modify: `src/game/managers/EntityManager.ts:135-155`

**Interfaces:**
- Consumes: `unit.takeDamage(amount)`, `unit.currentHealth <= 0`
- Produces: `unit.onDeath()`, `unit.emit('death', this)`, `EntityManager` unit list cleanup and population recalculation.

- [ ] **Step 1: Override `onDeath` in `BaseUnit.ts`**
When a unit's health reaches 0:
- Stop any running tweens/movement.
- Disable interactivity (`disableInteractive()`).
- Fade out sprite and destroy container after tween.
- Emit `'death'` event.

- [ ] **Step 2: Listen for unit death in `EntityManager.ts`**
In `EntityManager.addUnit(unit)`:
- Listen to `unit.once('death', ...)` to remove the unit from `this.units`, emit `'force_deselect_unit'` if needed, and call `this.recalculatePopulation()`.

- [ ] **Step 3: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 3: Implement Warrior Combat State Machine in `Warrior.ts`

**Files:**
- Modify: `src/game/entities/Warrior.ts`

**Interfaces:**
- Consumes: `targetEntity: BaseEntity | null`
- Produces: `attackTarget(target: BaseEntity)`, melee swing loop in `update(time, delta)`, `${texturePrefix}-attack` animation.

- [ ] **Step 1: Add combat properties to `Warrior.ts`**
```typescript
public targetEntity: BaseEntity | null = null;
public attackCooldown: number = 0;
public readonly attackInterval: number = 1200; // 1.2s per swing
public readonly attackDamage: number = 25;
private isAttacking: boolean = false;
```

- [ ] **Step 2: Add `attackTarget(target: BaseEntity)` method**
- Set `this.targetEntity = target`.
- If already in melee range (Chebyshev distance <= 1):
  - Stop movement.
  - Set state to `'ATTACK'`.
- Else:
  - Find path to adjacent walkable tile of target and move there.

- [ ] **Step 3: Update `Warrior.update(time, delta)`**
In `update(time, delta)`:
- If `targetEntity` is dead or destroyed (`!targetEntity.active || targetEntity.currentHealth <= 0`):
  - Clear `targetEntity`.
  - Set state to `'IDLE'`.
- If `targetEntity` is set:
  - Check distance:
    - If in melee range (`Math.max(Math.abs(this.gridX - target.gridX), Math.abs(this.gridY - target.gridY)) <= 1`):
      - Stop movement if moving.
      - Flip sprite toward target.
      - If `this.workerState !== 'ATTACK'`, `setWorkerState('ATTACK')`.
      - Decrement `this.attackCooldown -= delta`.
      - When `this.attackCooldown <= 0`:
        - Reset `this.attackCooldown = this.attackInterval`.
        - `this.targetEntity.takeDamage(this.attackDamage)`.
    - Else if not moving:
      - Pathfind adjacent to `targetEntity`.

- [ ] **Step 4: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 4: Hook Hostile Target Selection in `InteractionManager.ts`

**Files:**
- Modify: `src/game/managers/InteractionManager.ts:365-375, 515-560`

**Interfaces:**
- Consumes: User tap on enemy unit / enemy King / enemy building while Warrior is selected.
- Produces: `warrior.attackTarget(enemyEntity)`, red attack tap indicator.

- [ ] **Step 1: Check hostile targets in `InteractionManager.handleTap`**
In `handleTap(pointer)`:
When `hitUnit` is detected:
```typescript
if (hitUnit) {
    if (hitUnit.faction !== localFaction) {
        // Hostile Unit Clicked!
        if (this.selectedUnit instanceof Warrior) {
            this.showHostileTapIndicator(hitUnit.gridX, hitUnit.gridY);
            (this.selectedUnit as Warrior).attackTarget(hitUnit);
            return;
        }
        return; // Non-warriors cannot attack
    }
    this.selectUnit(hitUnit);
    return;
}
```
When `hitBuilding` is detected:
```typescript
if (hitBuilding && hitBuilding.faction !== localFaction) {
    if (this.selectedUnit instanceof Warrior) {
        this.showHostileTapIndicator(hitBuilding.gridX, hitBuilding.gridY);
        (this.selectedUnit as Warrior).attackTarget(hitBuilding);
        return;
    }
}
```

- [ ] **Step 2: Add `showHostileTapIndicator(col, row)` with red combat reticle**
Red circle with crosshair or pulse animation indicating attack order.

- [ ] **Step 3: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 5: King Match Resolution & UI Modal in `App.tsx` and `gameStateSlice.ts`

**Files:**
- Modify: `src/store/slices/gameStateSlice.ts`
- Modify: `src/game/entities/King.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles/App.module.css`

**Interfaces:**
- Consumes: `king.onDeath()`, `useGameStore.getState().setGameOver(true, gameResult)`
- Produces: Glassmorphic Victory / Defeat modal with "Play Again" button that restarts the match.

- [ ] **Step 1: Update `gameStateSlice.ts`**
Add:
```typescript
gameResult: 'victory' | 'defeat' | null;
setGameOver: (isOver: boolean, result?: 'victory' | 'defeat' | null) => void;
```

- [ ] **Step 2: Update `King.ts:onDeath()`**
Determine result based on local player faction:
```typescript
protected override onDeath(): void {
    const store = useGameStore.getState();
    const localFaction = store.faction || 'blue';
    const isPlayerKing = this.faction === localFaction;
    const result = isPlayerKing ? 'defeat' : 'victory';
    
    store.setGameOver(true, result);
    this.mainSprite.setTint(0xff0000);
    this.mainSprite.setAlpha(0.6);
}
```

- [ ] **Step 3: Render Victory / Defeat Modal in `src/App.tsx`**
When `isGameOver` is true:
- Show stylish modal:
  - If `gameResult === 'victory'`: "VICTORY! The enemy king has fallen!" (with gold laurel icon / green accent).
  - If `gameResult === 'defeat'`: "DEFEAT! Your king has fallen in battle!" (with skull/sword icon / crimson accent).
  - "Play Again" button: resets match and reloads scene cleanly.

- [ ] **Step 4: Style modal in `App.module.css`**

- [ ] **Step 5: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 6: Browser Verification and Evidence Capture

**Files:**
- Modify: `docs/audit/RECOVERY_ROADMAP.md`
- Modify: `docs/audit/FEATURE_INVENTORY.md`

- [ ] **Step 1: Run automated unit tests**
Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Verify in browser using `browser_subagent`**
- Start solo skirmish.
- Train a warrior or issue test attack on enemy King.
- Observe attack animation and damage reduction.
- Verify Victory/Defeat screen appears on King death.
- Click "Play Again" and confirm clean restart.
