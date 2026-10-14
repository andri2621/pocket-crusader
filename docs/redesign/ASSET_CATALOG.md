# Tiny Swords Asset Catalog (Verified Repository Inspection)

This catalog details every verified asset located in `public/assets/tiny-swords/`. All filenames, dimensions, frame layouts, and intended usages have been programmatically inspected and verified from file headers and pixel data.

---

## 1. Terrain & Tilesets

| Relative Path | Dimensions | Type | Frame Count / Layout | Intended Use & Notes |
|---|---|---|---|---|
| `Terrain/Tileset/Tilemap_color1.png` | 576×384 | Tile Atlas | 9 cols × 6 rows (54 frames of 64×64) | **Complete Biome & Cliff Set**: <br>• Solid ground variants: frames 10, 14, 15, 16, 17, 23, 24, 25, 26.<br>• Coastline/border edges: frames 0..3, 9, 11, 18..21.<br>• **Cliffs / Tebing**: Rows 3..5, Cols 5..8 (Frames 32..35 for upper crest, 41..44 for vertical rock face, 50..53 for water base with foam). |
| `Terrain/Tileset/Tilemap_color2.png` | 576×384 | Tile Atlas | 9 cols × 6 rows (54 frames of 64×64) | Olive grass biome variation with matching cliff set. |
| `Terrain/Tileset/Tilemap_color3.png` | 576×384 | Tile Atlas | 9 cols × 6 rows (54 frames of 64×64) | Deep emerald woodland grass biome variation with matching cliff set. |
| `Terrain/Tileset/Tilemap_color4.png` | 576×384 | Tile Atlas | 9 cols × 6 rows (54 frames of 64×64) | Highland steppe biome variation. |
| `Terrain/Tileset/Tilemap_color5.png` | 576×384 | Tile Atlas | 9 cols × 6 rows (54 frames of 64×64) | Coastal/moist teal biome variation. |
| `Terrain/Tileset/Water Background color.png` | 64×64 | Standalone Tile | 1 frame (64×64) | Deep water base tile (RGB 71, 171, 169). Completely seamless when repeated. |
| `Terrain/Tileset/Water Foam.png` | 3072×192 | Spritesheet | 16 frames (192×192 each) | Animated shoreline foam and wave crests. Place along water boundaries. |
| `Terrain/Tileset/Shadow.png` | 192×192 | Tile Atlas | 3 cols × 3 rows (64×64 each) | Drop shadow tiles for cliffs and elevated plateaus. |
| `UI Elements/UI Elements/Wood Table/WoodTable_Slots.png` | 192×192 | 3×3 Tile Spritesheet (64×64 each) | **Functional Wooden Bridge**: Frame 1 (top railing), Frame 4 (solid oak plank deck), Frame 7 (bottom railing), Frames 3 & 5 (side railings). |

---

## 2. Environment Props & Resources

### Trees & Wood
| Relative Path | Dimensions | Type | Frame Count / Layout | Intended Use & Notes |
|---|---|---|---|---|
| `Terrain/Resources/Wood/Trees/Tree1.png` | 1536×256 | Spritesheet | 8 frames (192×256) | Standard tall oak tree with wind sway animation. |
| `Terrain/Resources/Wood/Trees/Tree2.png` | 1536×256 | Spritesheet | 8 frames (192×256) | Rounded deciduous tree with wind sway animation. |
| `Terrain/Resources/Wood/Trees/Tree3.png` | 1536×192 | Spritesheet | 8 frames (192×192) | Medium pine/fir tree with sway animation. |
| `Terrain/Resources/Wood/Trees/Tree4.png` | 1536×192 | Spritesheet | 8 frames (192×192) | Small decorative tree with sway animation. |
| `Terrain/Resources/Wood/Trees/Stump 1.png` | 192×256 | Standalone | 1 frame | Depleted tree stump (matches Tree 1 footprint). |
| `Terrain/Resources/Wood/Trees/Stump 2.png` | 192×256 | Standalone | 1 frame | Depleted tree stump (matches Tree 2 footprint). |
| `Terrain/Resources/Wood/Trees/Stump 3.png` | 192×256 | Standalone | 1 frame | Depleted tree stump (matches Tree 3 footprint). |
| `Terrain/Resources/Wood/Trees/Stump 4.png` | 192×256 | Standalone | 1 frame | Depleted tree stump (matches Tree 4 footprint). |
| `Terrain/Resources/Wood/Wood Resource/Wood Resource.png` | 64×64 | Standalone | 1 frame | Chopped log pile resource icon/prop. |

### Gold Mines & Stones
| Relative Path | Dimensions | Type | Frame Count / Layout | Intended Use & Notes |
|---|---|---|---|---|
| `Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png` .. `6.png` | 128×128 | Standalone | 1 frame each | Static gold boulder deposits (Gold Stone 1 through 6). |
| `Terrain/Resources/Gold/Gold Stones/Gold Stone 1_Highlight.png` .. `6_Highlight.png` | 768×128 | Spritesheet | 6 frames (128×128) | Animated glint/sparkle overlay for active gold nodes. |
| `Terrain/Resources/Gold/Gold Resource/Gold_Resource.png` | 128×128 | Standalone | 1 frame | Large golden quarry formation. |
| `Terrain/Resources/Gold/Gold Resource/Gold_Resource_Highlight.png` | 768×128 | Spritesheet | 6 frames (128×128) | Animated shimmer overlay for large gold quarry. |

### Rocks, Bushes, Clouds, Water Decorations
| Relative Path | Dimensions | Type | Frame Count / Layout | Intended Use & Notes |
|---|---|---|---|---|
| `Terrain/Decorations/Rocks/Rock1.png` .. `4.png` | 64×64 | Standalone | 1 frame each | Static decorative pebbles and rocks (passable or minor obstacles). |
| `Terrain/Decorations/Bushes/Bushe1.png` .. `4.png` | 1024×128 | Spritesheet | 8 frames (128×128) | Animated rustling bushes. |
| `Terrain/Decorations/Rocks in the Water/Water Rocks_01.png` .. `04.png` | 1024×64 | Spritesheet | 16 frames (64×64) | Animated river and coastal obstacle rocks with water ripples. |
| `Terrain/Decorations/Rubber Duck/Rubber duck.png` | 96×32 | Spritesheet | 3 frames (32×32) | Easter egg animated water float. |
| `Terrain/Decorations/Clouds/Clouds_01.png` .. `08.png` | 576×256 | Standalone | 1 frame each | Atmospheric drifting cloud shadows. |

### Animals & Food
| Relative Path | Dimensions | Type | Frame Count / Layout | Intended Use & Notes |
|---|---|---|---|---|
| `Terrain/Resources/Meat/Sheep/Sheep_Idle.png` | 768×128 | Spritesheet | 6 frames (128×128) | Sheep idle grazing animation. |
| `Terrain/Resources/Meat/Sheep/Sheep_Grass.png` | 1536×128 | Spritesheet | 12 frames (128×128) | Sheep chewing grass animation. |
| `Terrain/Resources/Meat/Sheep/Sheep_Move.png` | 512×128 | Spritesheet | 4 frames (128×128) | Sheep walking animation. |
| `Terrain/Resources/Meat/Meat Resource/Meat Resource.png` | 64×64 | Standalone | 1 frame | Harvested meat supply icon/prop. |

---

## 3. Buildings

All buildings are available in 5 faction colors: `Blue`, `Red`, `Yellow`, `Purple`, `Black`.

| Relative Path (Blue Example) | Dimensions | Grid Footprint | Intended Use & Notes |
|---|---|---|---|
| `Buildings/Blue Buildings/Castle.png` | 320×256 | 5×4 tiles | Main Faction Stronghold / HQ. |
| `Buildings/Blue Buildings/House1.png` .. `House3.png` | 128×192 | 2×3 tiles | Residential House (+5 population cap). |
| `Buildings/Blue Buildings/House_Construction.png` | 128×192 | 2×3 tiles | Scaffold / building under construction. |
| `Buildings/Blue Buildings/House_Destroyed.png` | 128×192 | 2×3 tiles | Ruin / demolished building wreckage. |
| `Buildings/Blue Buildings/Hut.png` | 128×192 | 2×3 tiles | Woodcutter Hut drop-off station. |
| `Buildings/Blue Buildings/Gold_Hut.png` | 128×192 | 2×3 tiles | Gold Miner Hut drop-off station. |
| `Buildings/Blue Buildings/Barracks.png` | 192×256 | 3×4 tiles | Military Training Barracks (trains Warriors). |
| `Buildings/Blue Buildings/Archery.png` | 192×256 | 3×4 tiles | Archery Range. |
| `Buildings/Blue Buildings/Monastery.png` | 192×320 | 3×5 tiles | Monastery / Healer sanctuary. |
| `Buildings/Blue Buildings/Tower.png` | 128×256 | 2×4 tiles | Guard / Watch Tower. |

---

## 4. Units

All units are available in `Blue`, `Red`, `Yellow`, and `Purple`.

| Unit | File Examples | Dimensions | Frames & Cell Size | Notes |
|---|---|---|---|---|
| **Pawn (Worker)** | `Pawn_Idle.png` | 1536×192 | 8 frames (192×192) | Unarmed idle. |
| | `Pawn_Run.png` | 1152×192 | 6 frames (192×192) | Movement. |
| | `Pawn_Interact Axe.png` | 1152×192 | 6 frames (192×192) | Chopping wood. |
| | `Pawn_Interact Pickaxe.png` | 1152×192 | 6 frames (192×192) | Mining gold. |
| | `Pawn_Interact Hammer.png` | 576×192 | 3 frames (192×192) | Building construction. |
| | `Pawn_Run Wood.png`, `Gold.png`, `Meat.png` | 1152×192 | 6 frames (192×192) | Resource haul movement. |
| | `Pawn_Idle Wood.png`, `Gold.png`, `Meat.png` | 1536×192 | 8 frames (192×192) | Resource haul idle. |
| **Warrior** | `Warrior_Idle.png` | 1536×192 | 8 frames (192×192) | Sword & shield idle stance. |
| | `Warrior_Run.png` | 1152×192 | 6 frames (192×192) | Movement. |
| | `Warrior_Attack1.png`, `Attack2.png` | 768×192 | 4 frames (192×192) | Melee attack swings. |
| | `Warrior_Guard.png` | 1152×192 | 6 frames (192×192) | Defensive block. |
| **Archer** | `Archer_Idle.png` / `Run.png` / `Shoot.png` | 1152/768/1536×192 | 6/4/8 frames (192×192) | Ranged bow unit. |
| **Monk** | `Idle.png` / `Run.png` / `Heal.png` | 1152/768/2112×192 | 6/4/11 frames (192×192) | Healer unit. |
| **Lancer** | `Lancer_Idle.png` / `Run.png` / Attacks | 3840/1920/960×320 | Multiple directions (320×320) | Heavy cavalry unit. |

---

## 5. UI Elements

### Panels, Tables, Bridges & Papers
| Relative Path | Dimensions | Structure | Intended Use & Proper Slicing |
|---|---|---|---|
| `Wood Table/WoodTable_Slots.png` | 192×192 | 3 cols × 3 rows of 64×64 (No spacers) | **Dual Role**: <br>1. Compact 9-Slice UI Panel.<br>2. **Functional Wooden River Bridge** across water channels (Frames 1, 4, 7). |
| `Wood Table/WoodTable.png` | 448×448 | 7 cols × 7 rows with empty spacer columns/rows | Extended table atlas with legs and ornaments. |
| `Papers/RegularPaper.png` | 320×320 | 5 cols × 5 rows (3×3 9-slice with 64px gaps) | Parchment / scroll 9-slice panel. |
| `Papers/SpecialPaper.png` | 320×320 | 5 cols × 5 rows (3×3 9-slice with 64px gaps) | Wax-sealed parchment 9-slice panel. |

### Buttons
| Relative Path | Dimensions | Structure | Intended Use & Proper Slicing |
|---|---|---|---|
| `Buttons/BigBlueButton_Regular.png` | 320×320 | 5 cols × 5 rows (3×3 9-slice with 64px gaps) | Normal state big medieval button. Sliced to contiguous 192×192. |
| `Buttons/BigBlueButton_Pressed.png` | 320×320 | 5 cols × 5 rows (3×3 9-slice with 64px gaps) | Pressed state big button. Sliced to contiguous 192×192. |
| `Buttons/BigRedButton_Regular.png` / `Pressed.png` | 320×320 | 5 cols × 5 rows | Red faction variant big button. Sliced to contiguous 192×192. |
| `Buttons/SmallBlueSquareButton_Regular.png` / `Pressed.png` | 128×128 | 2 cols × 2 rows (64×64 each) | Square action button (90×94 visual area). |
| `Buttons/TinySquareBlueButton.png` / `RedButton.png` | 64×64 | Standalone (64×64) | Compact HUD icon button. |

### Ribbons, Banners & Bars
| Relative Path | Dimensions | Structure | Intended Use & Proper Slicing |
|---|---|---|---|
| `Ribbons/SmallRibbons.png` | 320×640 | 5 cols × 10 rows (64×64) | 3-piece ribbon banner (Left Col 0, Center Col 2, Right Col 4). Sliced to 192×64. |
| `Bars/BigBar_Base.png` | 320×64 | 5 cols × 1 row (64×64) | Health/Progress bar frame. Sliced to 192×64. |
| `Bars/BigBar_Fill.png` | 64×64 | 1 frame (64×64) | Repeating bar interior fill. |
