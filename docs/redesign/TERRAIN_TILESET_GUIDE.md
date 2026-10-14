# Terrain Tileset Guide — Tilemap Mechanics, Cliffs, & Bridges

This guide documents the exact atlas layout of `Tilemap_color1.png` through `Tilemap_color5.png` (576×384 px, 9 columns × 6 rows of 64×64 px tiles), cliff/tebing structure, wooden bridge implementation, and the deterministic algorithm for assembling a continuous world.

---

## 1. Root Cause Analysis: The Broken Ground Artifacts

In the previous implementation (`GameScene.ts`):
```typescript
const hash = (col * 17 + row * 31) % 23;
const frame = hash === 0 ? 1 : hash === 5 ? 2 : 10;
this.add.image(x, y, 'grass_tiles', frame)...
```

### Why this produced isolated broken patches:
1. **Frame 1 (Row 0, Col 1)** is an **outer shoreline / top-edge boundary tile**. Its upper 16 pixels are completely transparent! When placed in the middle of the ground, it cuts an empty hole into the terrain.
2. **Frame 2 (Row 0, Col 2)** is an **outer top-right corner tile**. Its top and right margins are transparent. Placing it on normal ground created floating corner fragments.
3. **Frame 10 (Row 1, Col 1)** is only ONE of the solid ground tiles. The tileset actually provides **9 unique 100% solid, seamless ground tiles** that were completely ignored!

---

## 2. Atlas Frame Classification (9 Columns × 6 Rows)

| Frame # | Row, Col | Type | Alpha & Connectivity | Semantic Role |
|---|---|---|---|---|
| **0** | R0, C0 | Outer Top-Left Corner | Top: Transparent, Left: Transparent, Bottom: Solid, Right: Solid | Northwest coastline corner |
| **1** | R0, C1 | Outer Top Edge | Top: Transparent, Bottom/Left/Right: Solid | North coastline edge |
| **2** | R0, C2 | Outer Top-Right Corner | Top: Transparent, Right: Transparent, Bottom/Left: Solid | Northeast coastline corner |
| **3** | R0, C3 | Single-Tile Width Top Cap | Top/Left/Right: Transparent | Narrow vertical spit north end |
| **4** | R0, C4 | Empty Spacer | 100% Transparent | Do not use |
| **5** | R0, C5 | Plateau Top-Left Shoreline | Shoreline transition | Elevated plateau northwest |
| **6** | R0, C6 | Plateau Top Shoreline | Shoreline transition | Elevated plateau north |
| **7** | R0, C7 | Plateau Top-Right Shoreline | Shoreline transition | Elevated plateau northeast |
| **8** | R0, C8 | Narrow Cap | Shoreline transition | Specialized cap |
| **9** | R1, C0 | Outer Left Edge | Left: Transparent, Top/Bottom/Right: Solid | West coastline edge |
| **10** | R1, C1 | **Solid Ground Variation 1** | **100% Opaque (4096 px)** | **Primary flat grass base** |
| **11** | R1, C2 | Outer Right Edge | Right: Transparent, Top/Bottom/Left: Solid | East coastline edge |
| **12** | R1, C3 | Vertical Strip Middle | Left/Right: Transparent | Narrow 1-tile path |
| **13** | R1, C4 | Empty Spacer | 100% Transparent | Do not use |
| **14** | R1, C5 | **Solid Ground Variation 2** | **100% Opaque (4096 px)** | Grass tuft variant A |
| **15** | R1, C6 | **Solid Ground Variation 3** | **100% Opaque (4096 px)** | Grass tuft variant B |
| **16** | R1, C7 | **Solid Ground Variation 4** | **100% Opaque (4096 px)** | Pebble & flower detail variant A |
| **17** | R1, C8 | **Solid Ground Variation 5** | **100% Opaque (4096 px)** | Subtle lawn variation |
| **18** | R2, C0 | Outer Bottom-Left Corner | Bottom/Left: Transparent | Southwest coastline corner |
| **19** | R2, C1 | Outer Bottom Edge | Bottom: Transparent, Top/Left/Right: Solid | South coastline edge |
| **20** | R2, C2 | Outer Bottom-Right Corner | Bottom/Right: Transparent | Southeast coastline corner |
| **21** | R2, C3 | Single-Tile Width Bottom Cap | Bottom/Left/Right: Transparent | Narrow vertical spit south end |
| **22** | R2, C4 | Empty Spacer | 100% Transparent | Do not use |
| **23** | R2, C5 | **Solid Ground Variation 6** | **100% Opaque (4096 px)** | Dappled grass texture |
| **24** | R2, C6 | **Solid Ground Variation 7** | **100% Opaque (4096 px)** | Dense wildflower meadow |
| **25** | R2, C7 | **Solid Ground Variation 8** | **100% Opaque (4096 px)** | Clover ground detail |
| **26** | R2, C8 | **Solid Ground Variation 9** | **100% Opaque (4096 px)** | Earthy sod ground detail |
| **32..35**| R3, C5..8 | **Top Cliff Rim / Grass Edge** | Top grass with south overhang | **Cliff / Tebing Upper Boundary** |
| **36, 39**| R4, C0, C3 | Inner Concave Corners (Top) | Interior corner cutouts | Water inlets / coves |
| **41..44**| R4, C5..8 | **Vertical Cliff Rock Face** | Blueish-grey stone rock wall | **Cliff / Tebing Middle Wall** |
| **45, 48**| R5, C0, C3 | Inner Concave Corners (Bottom)| Interior corner cutouts | Water inlets / coves |
| **50..53**| R5, C5..8 | **Cliff Base in Water with Foam** | Stone wall base with wave foam | **Cliff / Tebing Lower Water Base** |

---

## 3. Cliff / Tebing Mechanics

The right-hand section of `Tilemap_color1.png` (Columns 5 through 8, Rows 3 through 5) forms a complete 3-tier cliff system:
1. **Tier 1 (Upper Ridge / Crest)**: Rows 3 (Frames 32, 33, 34). Grass plateau overlooking the drop.
2. **Tier 2 (Cliff Stone Face)**: Row 4 (Frames 41, 42, 43). Vertical rocky wall. Impassable to troops.
3. **Tier 3 (Water Footing / Foam)**: Row 5 (Frames 50, 51, 52). Rocky base emerging from water with animated wave crests.

---

## 4. Wooden Bridge Mechanics (`WoodTable_Slots.png`)

As requested, the rich medieval wooden plank textures from `WoodTable_Slots.png` (192×192 px, 3×3 tiles of 64×64) serve as the functional timber bridges across rivers:
- **Top Railing (North Edge)**: Frame 1 (`(x=64, y=0)`) — carved wooden railing.
- **Center Deck (Walking Plank)**: Frame 4 (`(x=64, y=64)`) — 100% solid horizontal oak planks.
- **Bottom Railing (South Edge)**: Frame 7 (`(x=64, y=128)`) — carved bottom wooden railing.
- **Vertical Bridge Railings**: Frames 3 and 5 for East/West railings.

### Traversal & Pathfinding Agreement:
- Water tiles without bridges are marked `TILE_BLOCKED` in `GridManager` (impassable to troops).
- Bridge tiles are marked `TILE_WALKABLE`, allowing workers and warriors to traverse cleanly across the river.

---

## 5. The Continuous Ground Rule

To guarantee that no transparent gaps or misplaced edge transitions ever appear in playable areas:

1. **The Solid Ground Palette**:
   ```typescript
   export const SOLID_GROUND_FRAMES = [10, 14, 15, 16, 17, 23, 24, 25, 26];
   ```
   Every interior playable tile **must** be selected strictly from this list. Because every tile in this set has 4096/4096 opaque pixels and 100% identical edge colors, any combination of these tiles is completely seamless and natural.

2. **Deterministic Seeded Selection**:
   Instead of ad-hoc modulo arithmetic that accidentally sampled frames 1 and 2, ground variation is weighted using a deterministic PRNG based on tile coordinate and map seed:
   - 70% chance: Base smooth grass (`Frame 10`)
   - 15% chance: Grass tufts (`Frame 14` or `Frame 15`)
   - 10% chance: Dappled meadow (`Frame 23` or `Frame 26`)
   - 5% chance: Wildflower patches (`Frame 16` or `Frame 24`)
