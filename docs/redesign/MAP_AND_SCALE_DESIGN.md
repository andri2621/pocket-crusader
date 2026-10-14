# Pocket Crusader — Map & Scale Design: Greenvale Frontier

**Status:** Authoritative Specification  
**Author:** Antigravity Systems Team (World & Tech Design Lead)  
**Target:** 64×48 Grid Battlefield & Mobile-First Camera Architecture  

---

## 1. World Scale & Coordinate Systems

### 1.1 Dimensional Baseline

| Dimension | Previous Prototype | Redesigned Greenvale Frontier | Rationale |
|---|---|---|---|
| **Grid Dimensions** | 32 cols × 18 rows (576 cells) | **64 cols × 48 rows (3,072 cells)** | 5.33× battlefield expansion; enables tactical maneuver, outpost expansion, and distinct macro-regions. |
| **World Tile Size** | 64 × 64 pixels | **64 × 64 pixels** | Matches Tiny Swords native tile slice standard (`Tilemap_color1.png`). |
| **World Pixel Size** | 2048 × 1152 px | **4096 × 3072 px** | Expansive battlefield with dedicated staging grounds and neutral territories. |
| **Camera Viewport** | 100% Window (1:1 zoom fits whole map on desktop) | **Viewport clamped with strategic (0.4×) and tactical (1.2×) zoom** | Prevents map from being shrunk into an illegible postage stamp on mobile screens. |

---

## 2. Battlefield Topography: Greenvale Frontier

The Greenvale Frontier is designed as a structured, balanced skirmish map with bilateral macro-symmetry, natural chokepoints, defensible plateaus, and contested central resources.

```
+-----------------------------------------------------------------------------------------------+
|                                      NORTHERN WOODLANDS                                       |
|  [Dense Forest Cluster]                 [Contested Gold Mine]            [Dense Forest Cluster] |
|                                                    |                                          |
|                                       NORTH CHOKEPOINT                                        |
|  +--------------------+                            |                     +--------------------+
|  |                    |                            |                     |                    |
|  |  BLUE FACTION BASE |                        RIVER /                   |  RED FACTION BASE  |
|  |  (West Stronghold) |                        VALLEY                    |  (East Stronghold) |
|  |  [Starting Wood]   |                       CROSSING                   |  [Starting Wood]   |
|  |  [Starting Gold]   |                            |                     |  [Starting Gold]   |
|  |                    |                            |                     |                    |
|  +--------------------+                    CENTRAL MEADOWS               +--------------------+
|                                         (Main Open Battlefield)                               |
|                                                    |                                          |
|                                       SOUTH CHOKEPOINT                                        |
|  [Southern Forest]                                 |                     [Southern Forest]    |
|                                          [Contested Gold Mine]                                |
|                                      SOUTHERN HIGHLANDS                                       |
+-----------------------------------------------------------------------------------------------+
```

### 2.1 Regional Macro-Layout

1. **Blue Starting Enclave (West - Cols 6–18, Rows 18–30):**
   - **Stronghold HQ:** Positioned at `col: 10, row: 24` (5×2 footprint).
   - **King Starting Position:** Guarding the courtyard at `col: 9, row: 24`.
   - **Starting Workers:** 3 Pawns at `(9, 25)`, `(10, 26)`, `(11, 25)`.
   - **Safe Starting Resources:**
     - 4 Wood Trees: `(8, 19)`, `(9, 19)`, `(10, 19)`, `(11, 19)` (North of HQ).
     - 2 Gold Mines: `(8, 28)`, `(9, 28)` (South of HQ).
   - **Building Clearings:** Flat, unobstructed 2×2 clearings for Houses and Barracks.

2. **Red Starting Enclave (East - Cols 46–58, Rows 18–30):**
   - **Stronghold HQ:** Positioned at `col: 50, row: 24` (5×2 footprint).
   - **King Starting Position:** Guarding the courtyard at `col: 51, row: 24`.
   - **Starting Workers:** 3 Pawns at `(49, 25)`, `(50, 26)`, `(51, 25)`.
   - **Safe Starting Resources:**
     - 4 Wood Trees: `(53, 19)`, `(54, 19)`, `(55, 19)`, `(56, 19)` (North of HQ).
     - 2 Gold Mines: `(53, 28)`, `(54, 28)` (South of HQ).
   - **Building Clearings:** Symmetrical clearings reserved for AI expansion.

3. **Central Battlefields & Valley (Cols 28–36, Rows 12–36):**
   - Wide open grassland for large army clashes.
   - Water features / decorative riverbanks dividing upper and lower approaches.
   - Two strategic chokepoints:
     - **North Crossing:** Bridges/shallows at `col: 32, rows: 14–16`.
     - **South Crossing:** Passes at `col: 32, rows: 32–34`.

4. **Contested Expansion Outposts:**
   - **Northern Gold Quarry:** 4 rich gold rocks at `(31, 8)`, `(32, 8)`, `(33, 8)`, `(34, 8)`.
   - **Southern Gold Quarry:** 4 rich gold rocks at `(31, 40)`, `(32, 40)`, `(33, 40)`, `(34, 40)`.
   - **Neutral Forests:** 12+ timber clusters along perimeter borders.

---

## 3. Footprint & Collision Architecture

### 3.1 Authoritative Entity Footprint Table

All gameplay systems (A* pathfinding grid, placement preview ghost, selection hitboxes, and z-sorting) must adhere to identical footprint data:

| Entity Type | Footprint (Cols × Rows) | Pixel Collision Bounds | Sprite Asset & Origin | Z-Depth Formula |
|---|---|---|---|---|
| **Pawn (Worker)** | 1×1 (dynamic traversal) | 32×32 centered | 192×192 (`origin: (0.5, 128/192)`) | `y = gridY * 64 + 64` |
| **Warrior** | 1×1 (dynamic traversal) | 40×40 centered | 192×192 (`origin: (0.5, 128/192)`) | `y = gridY * 64 + 64` |
| **King** | 1×1 (dynamic traversal) | 48×48 centered | 192×192 (`origin: (0.5, 128/192)`) | `y = gridY * 64 + 64` |
| **House** | 2×2 (blocked) | 128×128 | `House1.png` (`origin: (0.5, 0.9)`) | `y = (gridY + 2) * 64` |
| **Barracks** | 2×2 (blocked) | 128×128 | `Barracks.png` (`origin: (0.5, 0.9)`) | `y = (gridY + 2) * 64` |
| **Woodcutter Hut** | 1×1 (blocked) | 64×64 | `Hut.png` (`origin: (0.5, 0.9)`, scale 0.6) | `y = (gridY + 1) * 64` |
| **Gold Hut** | 1×1 (blocked) | 64×64 | `Gold_Hut.png` (`origin: (0.5, 0.9)`, scale 0.6) | `y = (gridY + 1) * 64` |
| **Stronghold HQ** | 5×2 (blocked) | 320×128 | `Castle.png` (`origin: (0.5, 0.9)`) | `y = (gridY + 2) * 64` |
| **Tree Node** | 1×1 (blocked) | 64×64 | `Tree1.png` (`origin: (0.5, 0.88)`) | `y = (gridY + 1) * 64` |
| **Gold Stone Node** | 1×1 (blocked) | 64×64 | `Gold Stone 1-6.png` (`origin: (0.5, 0.8)`) | `y = (gridY + 1) * 64` |

### 3.2 Building Entrances & Safe Construction Margins

Every multi-tile structure reserves surrounding walkable perimeter tiles:
- **Stronghold (5×2):** Entrance corridor across rows `gridY + 2` (cols `gridX + 1` through `gridX + 3`).
- **Barracks (2×2):** Training assembly rally point at `(gridX, gridY + 2)` and `(gridX + 1, gridY + 2)`.

---

## 4. Mobile Camera & Viewport Systems

### 4.1 Zoom & Pan Constraints

```typescript
export const CAMERA_CONFIG = {
    minZoom: 0.45,       // Strategic macro view (shows base + approach)
    maxZoom: 1.50,       // Tactical micro view (close unit inspection)
    defaultZoom: 0.75,   // Mobile default view (comfortable ~12x9 tiles visible)
    panSmoothFactor: 0.15,
    worldWidth: 4096,
    worldHeight: 3072,
};
```

1. **Initial Framing:** Camera initializes smoothly centered on player Stronghold (`col: 10, row: 24` → pixel `x: 640, y: 1536`) at `zoom: 0.75`.
2. **Bounds Clamping:** Main camera is hard-clamped to `(0, 0, 4096, 3072)`. At all zoom levels, viewport edges cannot expose black outer space.
3. **Pinch & Touch Gesture Handling:**
   - 1-finger drag pans the battlefield when not dragging a placement ghost or selecting.
   - 2-finger pinch zooms fluidly around the touch midpoint without camera jump.
   - Pointer world coordinate transforms (`cameras.main.getWorldPoint`) remain pixel-accurate at all zoom levels.

---

## 5. Rendering & Pathfinding Performance

1. **Static Terrain Rendering:**
   - The 64×48 terrain is rendered cleanly using Phaser Tilemap / Blitter or static image grid with randomized grass details (`Tilemap_color1.png`), eliminating per-frame overhead.
2. **EasyStar.js Pathfinding Optimization:**
   - Grid dimensions: 64×48 (3,072 cells). EasyStar handles up to 10,000 cells at 60 FPS when configured properly.
   - `iterationsPerCalculation: 2000` (up from 1000) prevents long-distance paths across 40 tiles from failing or stalling.
   - Diagonals enabled, corner cutting disabled.
3. **Incremental Obstacle Updates:**
   - Block/unblock calls update only the affected cells in `walkGrid` rather than re-instantiating the matrix.
