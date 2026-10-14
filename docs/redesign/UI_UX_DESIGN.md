# Pocket Crusader — UI/UX Overhaul & Tiny Swords Asset Skinning

**Status:** Authoritative Specification  
**Author:** Antigravity Systems Team (UI/UX & Frontend Architecture Lead)  
**Target:** Tiny Swords Authentic Medieval Pixel Art Design System  

---

## 1. Visual Identity & Aesthetic Transformation

### 1.1 Moving Away from Generic Web Glassmorphism

The current HUD and menu implementation relies on generic translucent dark boxes (`rgba(15, 23, 42, 0.75)`), blurred backdrops (`backdrop-filter: blur(12px)`), emoji icons (🪵, 💰, 👑, 💀, ⚔️), and rounded neon pills. This breaks visual cohesion with the high-quality pixel art of Pixel Frog's **Tiny Swords** pack.

The redesign establishes a **100% authentic medieval pixel-art presentation** utilizing the assets supplied in:
`public/assets/tiny-swords/UI Elements/UI Elements/`

```
UI Elements/
├── Wood Table/
│   ├── WoodTable.png          (Rich oak textured panel)
│   └── WoodTable_Slots.png    (Oak table with carved item slots)
├── Papers/
│   ├── RegularPaper.png       (Parchment scroll texture for menus & stats)
│   └── SpecialPaper.png       (Aged parchment for victory/defeat & modals)
├── Buttons/
│   ├── BigBlueButton_Regular.png / Pressed.png
│   ├── BigRedButton_Regular.png / Pressed.png
│   ├── SmallBlueSquareButton_Regular.png / Pressed.png
│   └── SmallBlueRoundButton_Regular.png / Pressed.png
├── Bars/
│   ├── BigBar_Base.png / BigBar_Fill.png
│   └── SmallBar_Base.png / SmallBar_Fill.png
├── Banners & Ribbons/
│   ├── Banner.png
│   ├── BigRibbons.png
│   └── SmallRibbons.png
├── Human Avatars/
│   ├── Avatar_Pawn_Blue.png / Red.png
│   ├── Avatar_Warrior_Blue.png / Red.png
│   └── Avatar_Archer_Blue.png
└── Icons/
    ├── log.png, coin.png, meat.png, hammer.png
    ├── sword.png, shield.png, gear.png, play.png, sound.png
```

---

## 2. Design System Components & Skinning Rules

### 2.1 Panel Containers: Wood & Parchment

1. **Top HUD Bar (`WoodTable.png` / carved oak style):**
   - Background utilizes sliced `WoodTable.png` with pixelated scaling (`image-rendering: pixelated`).
   - Sits flush at top of viewport, respecting `env(safe-area-inset-top)`.
   - Resource counters display authentic `log.png` and `coin.png` pixel sprites with crisp retro medieval numbers.
   - Population indicator displays `Avatar_Pawn_Blue.png` with current / max count.
2. **Contextual Dialogs & Build Windows (`RegularPaper.png`):**
   - Build menu and selection cards skin over crisp parchment texture.
   - Text rendered in warm medieval ink tones (`#2b1810` on paper, `#fef3c7` on wood) with subtle drop shadows.
   - Zero generic emojis; costs rendered with `log.png` and `coin.png` 24×24 icons.

### 2.2 Buttons & Interactive Touch Elements

1. **Primary Actions:**
   - Skinned with `BigBlueButton_Regular.png` (default) and `BigBlueButton_Pressed.png` (`:active`).
   - Tactile 4px press depression feeling on tap.
2. **Quick Sidebar & Icon Controls:**
   - Skinned with `SmallBlueSquareButton_Regular.png` and `SmallBlueRoundButton_Regular.png`.
   - Minimum physical touch footprint: **48 × 48 CSS pixels** (up to 56×56 for primary actions).

### 2.3 Progress & Health Bars

1. **Training & Spawning Gauges:**
   - Skinned with `SmallBar_Base.png` (carved dark slot) and `SmallBar_Fill.png` (vibrant emerald / azure fill).

---

## 3. Screen-by-Screen Layout Specifications

### 3.1 Main Menu & Skirmish Lobby

The landing screen welcomes players into an authentic medieval strategy war room:

```
+-------------------------------------------------------------+
|                                                             |
|                 [ POCKET CRUSADER BANNER ]                  |
|               (Pixel Art Ribbon & Swords Logo)              |
|                                                             |
|             +---------------------------------+             |
|             |          WOODEN TABLE           |             |
|             |                                 |             |
|             |  MAP: [ Greenvale Frontier  v]  |             |
|             |                                 |             |
|             |  DIFFICULTY:                    |             |
|             |  [ (Easy) ]  [ Normal ]  [ Hard ]|            |
|             |                                 |             |
|             |  +---------------------------+  |             |
|             |  |   [BigBlueButton]         |  |             |
|             |  |   PLAY SKIRMISH (SOLO)    |  |             |
|             |  +---------------------------+  |             |
|             |                                 |             |
|             |  - - - - - - OR - - - - - - -   |             |
|             |  [ Create Room ]  [ Join Room ] |             |
|             +---------------------------------+             |
|                                                             |
+-------------------------------------------------------------+
```

1. **Game Title:** Rendered with Tiny Swords banner/ribbon art.
2. **Map Selector:** Prominently displays "Greenvale Frontier (64×48)".
3. **Difficulty Selector:** 3 distinct pixel buttons: **Easy (Default)**, **Normal**, **Hard**.
   - Clear explanatory subtitle beneath active selection:
     *Easy: Slower enemy economy, delayed first attack (~3.5m), smaller initial waves.*
4. **Instant Action:** Big Blue Button initiates the match instantly with selected parameters.

### 3.2 In-Game HUD & Action Architecture

```
+-------------------------------------------------------------+
| [🪵 100]  [💰 60]  [👥 3/5]              [⚙️]  [🔨 BUILD]   | <- Top Oak Bar
+-------------------------------------------------------------+
|                                                             |
|                                                             |
|  [👤 Workers (3)]                                           |
|  [⚔️ Warriors (0)]                                           | <- Quick Left Sidebar
|                                                             |
|                                                             |
|                                                             |
|                                                             |
|                         [ BATTLEFIELD ]                     |
|                                                             |
|                                                             |
|                                                             |
|                                 +-------------------------+ |
|                                 | SELECTION PANEL (PARCH) | |
|                                 | [Avatar] [Unit / Bldg]  | | <- Contextual Card
|                                 | [Actions / Train Btn]   | |    (Bottom-Right)
|                                 +-------------------------+ |
+-------------------------------------------------------------+
```

1. **Top Bar (Resource & Economy):**
   - Fixed height 54px.
   - Resource counters:
     - Wood: `log.png` icon + quantity.
     - Gold: `coin.png` icon + quantity.
     - Population: `Avatar_Pawn_Blue.png` + `current / max` (e.g. `3/5`).
   - Build Toggle Button: `hammer.png` button at top-right.
2. **Left Quick Action Stack:**
   - Stack of square wooden slots:
     - Top Slot: Idle Worker selector (`Avatar_Pawn_Blue.png` with badge count).
     - Bottom Slot: Warrior army selector (`Avatar_Warrior_Blue.png` with badge count).
   - Tapping centers camera smoothly on the idle unit and selects it.
3. **Contextual Selection Card (Bottom-Right / Bottom-Center):**
   - Only appears when an entity is selected.
   - **Worker Selected:** Shows worker avatar, state (`IDLE`, `CHOPPING`, `MINING`, `BUILDING`), and quick cancel/disband option.
   - **Barracks Selected:** Shows Barracks icon, recruit Warrior button (`cost: 20 Gold`), queue count (`x1`, `x2`), and visual training progress bar (`SmallBar_Fill`).
   - **Warrior Selected:** Shows warrior avatar, HP bar, attack damage, and stance.
4. **Build Menu Modal:**
   - Opens as a parchment scroll overlay (`RegularPaper.png`).
   - Lists 4 constructible structures:
     - **House:** 40 Wood (+5 Pop cap).
     - **Woodcutter's Hut:** 40 Wood (Automated wood gathering).
     - **Gold Hut:** 40 Wood (Automated gold mining).
     - **Barracks:** 60 Wood, 40 Gold (Trains Warriors).
   - Each card features building artwork, required wood/gold icons, and an active or disabled state.
5. **Victory & Defeat Modal:**
   - Rendered with `SpecialPaper.png` and royal banners.
   - Victorious: "VICTORY!" with crown ribbon, match statistics (Wood harvested, Gold harvested, Army size, Time elapsed).
   - Defeated: "DEFEAT" with broken shield ribbon and match statistics.
   - Pixel-art "Play Again" button (`BigBlueButton`) restarts the game cleanly.

---

## 4. Mobile Ergonomics & Responsive Safe-Areas

1. **Touch Target Sizing:**
   - Every clickable button has a minimum hit area of **48 × 48 px**.
   - Primary action buttons (Play, Build, Train) are **56px to 64px** tall.
2. **Safe Area Insets:**
   - CSS uses `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, and `env(safe-area-inset-right)` to avoid notches and home-indicator bars.
3. **Viewport Obstruction Prevention:**
   - Menus and cards never exceed 40% of the screen height in landscape orientation.
   - Tap-to-move and tap-to-attack input events pass directly through to Phaser when clicking the battlefield.
   - Event propagation (`e.stopPropagation()`) strictly isolates React UI clicks from triggering spurious ground movement orders.
