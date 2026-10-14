# UI Asset Guide — Nine-Slice Rendering & Component Architecture

This guide details the exact layout, slicing parameters, and assembly techniques for UI assets in `public/assets/tiny-swords/UI Elements/UI Elements/`.

---

## 1. Root Cause Analysis: The Broken Menu UI

In the previous implementation (`App.module.css` and `App.tsx`):
```css
.panel {
    background-image: url('/assets/tiny-swords/UI Elements/UI Elements/Wood Table/WoodTable.png');
    background-size: 100% 100%;
}
.titleRibbon {
    background-image: url('/assets/tiny-swords/UI Elements/UI Elements/Banners/Banner.png');
    background-size: 100% 100%;
}
```

### Why this broke:
1. **`WoodTable.png` is 448×448 px** (7 columns × 7 rows of 64×64 cells). Rows 2 & 4 and Columns 2 & 4 are completely transparent spacers. Setting `background-size: 100% 100%` stretched the entire 49-tile multi-part table atlas into a single distorted rectangle, exposing empty transparent gaps across the menu.
2. **`Banner.png` is 448×448 px**, also an atlas sheet. Stretching it caused massive pixel blur and misalignment.
3. **Buttons (`BigBlueButton_Regular.png`) are 320×320 px sheets** containing 9 slices on a 5×5 grid with 64px gaps.

---

## 2. Nine-Slice Slicing Specifications

### A. Compact Wood Table Panel (`WoodTable_Slots.png`)
- **Dimensions**: 192×192 px.
- **Layout**: 3 columns × 3 rows of 64×64 px cells (No spacer gaps!).
- **Visual Slices**:
  - Top-Left Corner: `(0, 0, 64, 64)`
  - Top-Mid Edge: `(64, 0, 64, 64)`
  - Top-Right Corner: `(128, 0, 64, 64)`
  - Mid-Left Edge: `(0, 64, 64, 64)`
  - Center Fill: `(64, 64, 64, 64)` — 100% solid wood plank texture
  - Mid-Right Edge: `(128, 64, 64, 64)`
  - Bot-Left Corner: `(0, 128, 64, 64)`
  - Bot-Mid Edge: `(64, 128, 64, 64)`
  - Bot-Right Corner: `(128, 128, 64, 64)`
- **CSS Nine-Slice Formula**:
  ```css
  border-image-source: url('/assets/tiny-swords/UI Elements/UI Elements/Wood Table/WoodTable_Slots.png');
  border-image-slice: 64 fill;
  border-image-width: 32px; /* Scale cleanly for UI */
  border-image-repeat: repeat;
  image-rendering: pixelated;
  ```

### B. Big Buttons (`BigBlueButton_Regular.png` & `BigBlueButton_Pressed.png`)
- **Dimensions**: 320×320 px each.
- **Layout**: 5 columns × 5 rows of 64×64 px cells.
- **Active Grid Cells**:
  - `(x=0, y=0)`: Top-Left
  - `(x=128, y=0)`: Top-Center
  - `(x=256, y=0)`: Top-Right
  - `(x=0, y=128)`: Mid-Left
  - `(x=128, y=128)`: Center Fill (solid blue wood)
  - `(x=256, y=128)`: Mid-Right
  - `(x=0, y=256)`: Bot-Left
  - `(x=128, y=256)`: Bot-Center
  - `(x=256, y=256)`: Bot-Right
  - Columns 1 (64..127) and 3 (192..255) are empty.
  - Rows 1 (64..127) and 3 (192..255) are empty.
- **Rendering Solution**:
  Generate or crop a clean 192×192 9-slice image (or use a dedicated canvas/SVG asset pre-sliced from the verified cells) so that standard CSS `border-image` or Phaser `NineSlice` functions with pixel perfection and zero distortion.

### C. Ribbons & Title Banners (`SmallRibbons.png`)
- **Dimensions**: 320×640 px (5 columns × 10 rows).
- **Faction Row Mapping**:
  - Rows 0–1: Blue / Cyan Ribbon
  - Rows 2–3: Red Ribbon
  - Rows 4–5: Gold / Yellow Ribbon
  - Rows 6–7: Purple Ribbon
  - Rows 8–9: Slate / Black Ribbon
- **Column Mapping**:
  - Col 0 `(0..63 px)`: Left folded ribbon tail
  - Col 2 `(128..191 px)`: Repeating ribbon center
  - Col 4 `(256..319 px)`: Right folded ribbon tail

### D. Progress & Health Bars (`BigBar_Base.png` & `BigBar_Fill.png`)
- **Base Frame**: 320×64 px (5 columns of 64px). Left cap at Col 0, center repeating at Col 2, right cap at Col 4.
- **Interior Fill**: 64×64 px seamless red/green fill pattern.

---

## 3. UI Component Architecture

To replace the fragile ad-hoc CSS classes, the UI implements 6 reusable, pixel-crisp components:

1. **`GamePanel`**:
   - Reusable container using verified 9-slice wood table borders (`WoodTable_Slots.png`) with crisp pixel-art scaling.
   - Supports size variants: `modal`, `sidebar`, `dock`, `hud-card`.

2. **`GameButton`**:
   - Primary medieval button supporting Blue, Red, and Gold variants.
   - Slices from verified Regular and Pressed assets.
   - Shifts content down 2px on `:active` to match the pressed physical relief.
   - Supports optional 64×64 icon and text with high-contrast drop shadow.

3. **`ResourceDisplay`**:
   - Displays resource count with verified icons (`log.png`, `coin.png`, `meat.png`) inside a compact wood pill.

4. **`HealthBar`**:
   - Constructed using the verified `BigBar_Base` frame and `BigBar_Fill` interior.

5. **`UnitPortrait`**:
   - Uses the verified 256×256 Human Avatars cropped in a crisp pixel frame.

6. **`InventorySlot`**:
   - Clean 64×64 slot frame for actions and building choices.
