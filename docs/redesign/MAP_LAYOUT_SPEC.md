# Greenvale Frontier Map Layout Specification (96×64 Tiles)

## 1. Overview & Strategic Design Intent

The previous `64×48` layout was undersized for an authentic medieval RTS, resulting in cramped base construction, immediately overlapping aggro radii, and barren voids between bases.

The redesigned **Greenvale Frontier** expands the battlefield to **96×64 tiles** (6144×4096 px at 64px tile size), inspired by *Stronghold Crusader*. This provides:
1. **Strategic Depth**: Meaningful travel distances between factions, giving players time to scout, build economy, and maneuver troops.
2. **Multi-Lane Warfare**: A natural central river valley with two distinct, wide crossings (Northern Ford and Southern Ford), preventing singular linear meat-grinder bottlenecks.
3. **Contested Midfield Objectives**: Rich gold quarries and timber reserves situated in contested neutral territory, rewarding forward outpost expansion.
4. **Organic Aesthetics**: Continuous lush grassland assembled from the 9 verified solid ground tiles, dense woodland perimeters, river rock formations, and restrained environmental props.

---

## 2. World Coordinate & Dimension Parameters

- **Grid Columns**: `96`
- **Grid Rows**: `64`
- **Tile Dimension**: `64×64 px`
- **Total World Dimensions**: `6144 px (W) × 4096 px (H)`
- **Camera Zoom Range**:
  - `minZoom`: `0.35` (wide strategic overview, reveals ~35–40 tiles width)
  - `defaultZoom`: `0.65` (balanced tactical perspective)
  - `maxZoom`: `1.4` (close-up unit inspection and placement precision)

---

## 3. Regional Composition

```
+-----------------------------------------------------------------------------------+
|  Cols 0-25             Cols 26-43          Cols 44-51         Cols 52-69   Cols 70-95  |
|                                                                                   |
|  [NORTH PINE]          [NORTH MEADOW]      [NORTH FORD]       [NORTH RED]  [RED TIMBER] |
|  Rows 0-14             Contested Quarry    Crossing           Flank        Rows 0-14   |
|                                                                                   |
|  [BLUE BASE CAMP]      [WESTERN VALLEY]    [CENTRAL BLUFF]    [EAST FLANK] [RED BASE]   |
|  Stronghold (12,30)    Open expansion      Impassable Ridge   Open ground  (79,30)     |
|  Timber (8-18,16-22)   & Barracks land     Cols 46-49                      Timber      |
|  Gold (10-14,42-45)                        Rows 24-40                      Gold        |
|                                                                                   |
|  [SOUTH BASIN]         [SOUTH MEADOW]      [SOUTH FORD]       [SOUTH RED]  [RED FOOT]  |
|  Rows 50-63            Contested Quarry    Crossing           Flank        Rows 50-63  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Region A: Western Faction Territory (Blue HQ — Cols 0 to 28)
- **Starting Base**:
  - Stronghold: `(col 12, row 30)` — 5×4 footprint.
  - King: `(col 10, row 32)`.
  - Starting Pawns: `(col 10, row 33)`, `(col 11, row 34)`, `(col 12, row 34)`.
- **Immediate Resources (Home Safety)**:
  - **Northern Home Forest**: 14 clustered timber trees at cols 8..18, rows 16..22. Provides safe lumber for initial Houses and Woodcutter Hut.
  - **Southern Home Gold Quarry**: 4 gold stone nodes at cols 10..14, rows 42..45. Sufficient for early warrior drafting and barracks construction.
- **Buildable Plains**: Broad, flat clearing surrounding the Stronghold (cols 8..24, rows 24..38) free of blocking props, allowing unhindered placement of up to 6 Houses and 2 Barracks.

### Region B: Eastern Faction Territory (Red HQ — Cols 68 to 95)
- **Starting Base (Strict Mathematical Symmetry)**:
  - Stronghold: `(col 79, row 30)` — 5×4 footprint.
  - King: `(col 84, row 32)`.
  - Starting Pawns: `(col 84, row 33)`, `(col 83, row 34)`, `(col 82, row 34)`.
- **Immediate Resources (Home Safety)**:
  - **Northern Home Forest**: 14 clustered timber trees at cols 77..87, rows 16..22.
  - **Southern Home Gold Quarry**: 4 gold stone nodes at cols 81..85, rows 42..45.
- **Buildable Plains**: Identical open area at cols 71..87, rows 24..38.

### Region C: The Central River & Strategic Crossings (Cols 44 to 51)
- **The River**: A natural water boundary using the verified cyan base (`Water Background color.png`) and animated `Water Rocks`.
- **Northern Chokepoint (Rows 14 to 20, Cols 45 to 50)**:
  - An unobstructed 6-tile wide natural ford connecting the northern expansion meadows.
  - Flanked by deep woodlands, creating high-ground ambush opportunities.
- **Southern Chokepoint (Rows 44 to 50, Cols 45 to 50)**:
  - A 6-tile wide river ford offering an alternative flanking route directly into the southern basins.
- **Central Dividing Bluff (Rows 22 to 42, Cols 46 to 49)**:
  - A natural obstacle ridge that splits the central valley into two separate strategic combat corridors.
  - Prevents instant direct cross-map artillery or bee-line rushing, forcing tactical path decisions.

### Region D: Neutral Contested Resource Expansions
1. **Northern Quarry & Foothills (Rows 6 to 12, Cols 44 to 52)**:
   - Contains 6 rich gold rock boulders (`gold_stone_6` down to `gold_stone_1`).
   - Equidistant from Blue and Red forward lines (approx. 34 tiles from each Stronghold).
   - Securing this zone gives decisive mid-game gold dominance.
2. **Southern Basin & Wetlands (Rows 52 to 58, Cols 44 to 52)**:
   - Contains 6 rich gold rock boulders and surrounding pine clusters.
   - Offers high reward for players who expand south.

---

## 4. Visual Layering & Ground Assembly

1. **Continuous Base Ground**:
   - Every walkable land tile is rendered using one of the 9 verified solid ground frames: `[10, 14, 15, 16, 17, 23, 24, 25, 26]`.
   - Seeded deterministic generation distributes grass tufts, clovers, and subtle lawn textures without any transparent cutouts.
2. **Water Transitions**:
   - River boundaries utilize outer transition frames layered cleanly above the cyan water base tile.
3. **Atmospheric Props**:
   - Restrained placement of rocks (`Rock1..4`) and animated swaying bushes (`Bushe1..4`) along ridge boundaries.
   - No decorative prop is placed within 4 tiles of faction Strongholds, guaranteeing building clearance.
