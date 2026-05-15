# 📜 RTS Development Blueprint: Project "Tiny Kingdom"

**Core Concept:** A modular RTS game inspired by Stronghold Crusader.
**Tech Stack:** Phaser 3, TypeScript, Zustand.
**Grid Logic:** 64x64 tiles with **Bottom-Center Snapping**.

---

## 🏗️ System Architecture

### 1. The Manager-Entity Pattern
* **Managers (`src/game/managers/`)**: logic hubs (Grid, Entity, Interaction).
* **Entities (`src/game/entities/`)**: Object states & visuals (BaseEntity, BaseUnit, BaseBuilding, BaseResource).

### 2. Centralized Types (`src/types/`)
* **Strict Rule:** All interfaces/enums must be in `src/types/` to prevent circular dependencies.

---

## 🎮 Core Gameplay Rules (Stronghold Logic)

### 1. Population & Spawning
* **Auto-Spawn:** New Worker every 10s at Stronghold.
* **Population Cap:** Stops if `currentPopulation >= maxPopulation`.
* **Max Population Formula**: `5 (Base) + (Completed Houses * 5)`.
* *Note:* Woodcutter's Huts and other industrial buildings do NOT add population.

### 2. Smart Deposit System
* **Drop-off Points:** Buildings with `isDropOff: true` (Stronghold, Woodcutter's Hut).
* **Logic:** Workers deposit to the **NEAREST** valid drop-off point.
* **Strategical Roles**:
    * **Stronghold**: Universal drop-off (All resources).
    * **Woodcutter's Hut**: Specialized for Wood (Placed near forests for efficiency).

### 3. Key Entities
* **The King**:
    * Visual: Blue Pawn (1.3x scale) + Procedural Gold Crown + "THE KING" label + Golden Aura.
    * Role: Must be protected. No manual labor.
    * Loss Condition: King HP <= 0 = **Game Over**.
* **Stronghold**: 5x2 tiles footprint. Primary HQ.

---

## 🛠️ Technical Implementation Standards

### 1. Alignment & Hitboxes (The 64x64 Rule)
* **Anchor:** Bottom-Center `(col * 64 + 32, row * 64 + 64)`.
* **Sprite Origin:** `(0.5, 0.95)` (or adjusted based on asset size, e.g. `128/192`) at local `(0, 0)`.
* **Selection Circle:** Drawn at `(0, -32)` to sit perfectly in the center of the visual tile.
* **Interaction Hitbox (1x1 Entity):** `setInteractive(new Phaser.Geom.Rectangle(-32, -64, 64, 64))`.
* **Interaction Hitbox (Multi-tile WxH):** `x: -(W*32)`, `y: -(H*64)`, `width: W*64`, `height: H*64`.

### 2. State Management (Zustand)
* Global states (`wood`, `population`, `isGameOver`) must stay in Zustand.
* Managers sync game events to the store.

### 3. Z-Index (Depth Sorting)
* Every entity must call `setDepth(this.y)` in the update loop for correct layering.

---

## 🚀 Future Roadmap
* Construction states (Building progress).
* Enemy AI (Red Faction Goblins/Warriors).
* Gold mining & Food production.