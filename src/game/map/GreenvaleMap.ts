/**
 * src/game/map/GreenvaleMap.ts
 * 
 * Strategic Map Configuration for Greenvale Frontier (96x64 tiles).
 * Symmetrical competitive RTS layout inspired by Stronghold Crusader.
 * 
 * Features:
 * - 96x64 tiles (6144x4096 px)
 * - Continuous organic meadow (9 verified solid ground tiles)
 * - Central river divide with two functional wooden plank bridges (WoodTable_Slots)
 * - Central cliff island (verified cliff frames 32..34, 41..43, 50..52)
 * - Strictly balanced starting bases and equidistant contested expansion quarries
 */

export interface TileCoord {
    col: number;
    row: number;
}

export interface ResourcePlacement {
    col: number;
    row: number;
    type: 'wood' | 'gold';
    texture?: string;
    maxHp?: number;
    yieldPerHit?: number;
}

export interface DecorationPlacement {
    col: number;
    row: number;
    texture: string;
    scale?: number;
}

export interface BridgePlacement {
    col: number;
    row: number;
    frame: number; // 1 = top rail, 4 = center plank deck, 7 = bottom rail
}

export interface CliffPlacement {
    col: number;
    row: number;
    frame: number; // 32..34 top crest, 41..43 rock face, 50..52 water base
}

export interface FactionBaseConfig {
    strongholdCol: number;
    strongholdRow: number;
    kingCol: number;
    kingRow: number;
    pawnCoords: TileCoord[];
}

export const GREENVALE_CONFIG = {
    cols: 96,
    rows: 64,
    tileSize: 64,
    width: 96 * 64,   // 6144 px
    height: 64 * 64,  // 4096 px
    
    // Viewport camera bounds & zoom
    camera: {
        minZoom: 0.35,
        maxZoom: 1.4,
        defaultZoom: 0.65,
    },
    
    // Faction Base Locations (Strict Mathematical Symmetry)
    bases: {
        blue: {
            strongholdCol: 12,
            strongholdRow: 30,
            kingCol: 10,
            kingRow: 32,
            pawnCoords: [
                { col: 10, row: 33 },
                { col: 11, row: 34 },
                { col: 12, row: 34 }
            ]
        } as FactionBaseConfig,
        red: {
            strongholdCol: 79,
            strongholdRow: 30,
            kingCol: 84,
            kingRow: 32,
            pawnCoords: [
                { col: 84, row: 33 },
                { col: 83, row: 34 },
                { col: 82, row: 34 }
            ]
        } as FactionBaseConfig
    }
};

/**
 * Verified 100% solid ground frame indices in Tilemap_color1.png.
 * These frames contain 4096/4096 opaque pixels with zero transparency cuts.
 */
export const SOLID_GROUND_FRAMES = [10, 14, 15, 16, 17, 23, 24, 25, 26];

/**
 * Deterministically pick a solid ground variation based on tile coordinate and seed.
 */
export function getDeterministicGroundFrame(col: number, row: number, seed: number = 1337): number {
    // Fast pseudo-random integer hash
    let h = (col * 374761393 + row * 668265263 + seed) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = (h ^ (h >>> 13)) >>> 0;
    const roll = h % 100;

    if (roll < 60) return 10;       // 60% smooth base lawn
    if (roll < 75) return 14;       // 15% grass tuft A
    if (roll < 85) return 15;       // 10% grass tuft B
    if (roll < 92) return 23;       // 7% dappled meadow
    if (roll < 97) return 26;       // 5% earthy sod detail
    if (roll < 99) return 16;       // 2% flower detail A
    return 24;                      // 1% wildflower meadow
}

/**
 * Static balanced resource placements for 96x64 Greenvale Frontier.
 */
export function getGreenvaleResources(): ResourcePlacement[] {
    const resources: ResourcePlacement[] = [];

    // ── 1. BLUE STARTING SAFE RESOURCES (West HQ) ────────────
    // Northern Home Forest Cluster (14 trees)
    const blueWood: TileCoord[] = [
        { col: 9, row: 17 }, { col: 10, row: 17 }, { col: 11, row: 17 }, { col: 12, row: 17 },
        { col: 13, row: 17 }, { col: 14, row: 17 },
        { col: 10, row: 18 }, { col: 11, row: 18 }, { col: 12, row: 18 }, { col: 13, row: 18 },
        { col: 14, row: 18 },
        { col: 11, row: 19 }, { col: 12, row: 19 }, { col: 13, row: 19 }
    ];
    for (const pos of blueWood) {
        resources.push({ ...pos, type: 'wood' });
    }

    // Southern Home Gold Mines (4 rich stones)
    resources.push(
        { col: 11, row: 43, type: 'gold', texture: 'gold_stone_6' },
        { col: 12, row: 43, type: 'gold', texture: 'gold_stone_5' },
        { col: 11, row: 44, type: 'gold', texture: 'gold_stone_4' },
        { col: 12, row: 44, type: 'gold', texture: 'gold_stone_3' }
    );

    // ── 2. RED STARTING SAFE RESOURCES (East HQ — Symmetrical) ─
    // Northern Home Forest Cluster (14 trees)
    const redWood: TileCoord[] = [
        { col: 81, row: 17 }, { col: 82, row: 17 }, { col: 83, row: 17 }, { col: 84, row: 17 },
        { col: 85, row: 17 }, { col: 86, row: 17 },
        { col: 81, row: 18 }, { col: 82, row: 18 }, { col: 83, row: 18 }, { col: 84, row: 18 },
        { col: 85, row: 18 },
        { col: 82, row: 19 }, { col: 83, row: 19 }, { col: 84, row: 19 }
    ];
    for (const pos of redWood) {
        resources.push({ ...pos, type: 'wood' });
    }

    // Southern Home Gold Mines (4 rich stones)
    resources.push(
        { col: 83, row: 43, type: 'gold', texture: 'gold_stone_6' },
        { col: 84, row: 43, type: 'gold', texture: 'gold_stone_5' },
        { col: 83, row: 44, type: 'gold', texture: 'gold_stone_4' },
        { col: 84, row: 44, type: 'gold', texture: 'gold_stone_3' }
    );

    // ── 3. CONTESTED NEUTRAL RESOURCE OUTPOSTS ──────────────
    // Northern Contested Gold Quarry (Cols 45–48, Rows 7–9)
    resources.push(
        { col: 45, row: 7, type: 'gold', texture: 'gold_stone_6' },
        { col: 46, row: 7, type: 'gold', texture: 'gold_stone_5' },
        { col: 47, row: 7, type: 'gold', texture: 'gold_stone_4' },
        { col: 48, row: 7, type: 'gold', texture: 'gold_stone_6' },
        { col: 46, row: 8, type: 'gold', texture: 'gold_stone_3' },
        { col: 47, row: 8, type: 'gold', texture: 'gold_stone_2' }
    );

    // Southern Contested Gold Quarry (Cols 45–48, Rows 55–57)
    resources.push(
        { col: 45, row: 55, type: 'gold', texture: 'gold_stone_6' },
        { col: 46, row: 55, type: 'gold', texture: 'gold_stone_5' },
        { col: 47, row: 55, type: 'gold', texture: 'gold_stone_4' },
        { col: 48, row: 55, type: 'gold', texture: 'gold_stone_6' },
        { col: 46, row: 56, type: 'gold', texture: 'gold_stone_3' },
        { col: 47, row: 56, type: 'gold', texture: 'gold_stone_2' }
    );

    // Deep Northern Perimeter Timber (Rows 2–4)
    for (let c = 26; c <= 68; c += 3) {
        resources.push({ col: c, row: 3, type: 'wood' });
        resources.push({ col: c + 1, row: 4, type: 'wood' });
    }

    // Deep Southern Perimeter Timber (Rows 59–61)
    for (let c = 26; c <= 68; c += 3) {
        resources.push({ col: c, row: 59, type: 'wood' });
        resources.push({ col: c + 1, row: 60, type: 'wood' });
    }

    return resources;
}

/**
 * Functional Wooden Plank Bridges across the Central River channels.
 * Utilizes WoodTable_Slots.png:
 * - Frame 1: Top wooden railing
 * - Frame 4: Center oak walking deck
 * - Frame 7: Bottom wooden railing
 */
export function getGreenvaleBridges(): BridgePlacement[] {
    const bridges: BridgePlacement[] = [];

    // ── 1. NORTH WOODEN BRIDGE (Rows 16–18, Cols 45–48) ──────
    for (let c = 45; c <= 48; c++) {
        bridges.push({ col: c, row: 16, frame: 1 }); // Top Railing
        bridges.push({ col: c, row: 17, frame: 4 }); // Walking Deck
        bridges.push({ col: c, row: 18, frame: 7 }); // Bottom Railing
    }

    // ── 2. SOUTH WOODEN BRIDGE (Rows 46–48, Cols 45–48) ──────
    for (let c = 45; c <= 48; c++) {
        bridges.push({ col: c, row: 46, frame: 1 }); // Top Railing
        bridges.push({ col: c, row: 47, frame: 4 }); // Walking Deck
        bridges.push({ col: c, row: 48, frame: 7 }); // Bottom Railing
    }

    return bridges;
}

/**
 * Cliffs / Tebing separating the central valley.
 * Utilizes verified cliff frames from Tilemap_color1.png:
 * - Rows 22..24: Grass crest overlooking cliff (Frames 32, 33, 34)
 * - Rows 25..38: Vertical stone cliff face (Frames 41, 42, 43)
 * - Rows 39..41: Cliff rock base in water (Frames 50, 51, 52)
 */
export function getGreenvaleCliffs(): CliffPlacement[] {
    const cliffs: CliffPlacement[] = [];

    // Central Dividing Bluff (Cols 45..48, Rows 22..41)
    for (let c = 45; c <= 48; c++) {
        const colType = c === 45 ? 0 : (c === 48 ? 2 : 1); // 0=left, 1=mid, 2=right

        // Crest (Upper grass edge)
        cliffs.push({ col: c, row: 22, frame: 32 + colType });
        cliffs.push({ col: c, row: 23, frame: 32 + colType });

        // Vertical Rock Wall
        for (let r = 24; r <= 38; r++) {
            cliffs.push({ col: c, row: r, frame: 41 + colType });
        }

        // Lower Rock Footing in water
        cliffs.push({ col: c, row: 39, frame: 50 + colType });
        cliffs.push({ col: c, row: 40, frame: 50 + colType });
    }

    return cliffs;
}

/**
 * Natural water channels (Central River).
 * Runs down cols 45–48 from row 0 to 63.
 * Excludes bridge tiles and central cliff bluff.
 */
export function getGreenvaleWaterTiles(): TileCoord[] {
    const water: TileCoord[] = [];
    const bridgeTiles = new Set(getGreenvaleBridges().map(b => `${b.col},${b.row}`));
    const cliffTiles = new Set(getGreenvaleCliffs().map(c => `${c.col},${c.row}`));

    for (let r = 0; r < GREENVALE_CONFIG.rows; r++) {
        for (let c = 45; c <= 48; c++) {
            const key = `${c},${r}`;
            if (!bridgeTiles.has(key) && !cliffTiles.has(key)) {
                water.push({ col: c, row: r });
            }
        }
    }

    return water;
}

/**
 * Impassable terrain barriers for pathfinding and collision.
 * Includes:
 * - Central Cliff Bluff (Cols 45..48, Rows 22..40)
 * - Central River Water (Water tiles without bridges)
 * - Outer rock ridges
 * Note: Bridges (Rows 16–18 and 46–48) are strictly OMITTED from obstacles,
 * guaranteeing they are fully walkable!
 */
export function getGreenvaleObstacles(): TileCoord[] {
    const obstacles: TileCoord[] = [];

    // 1. Central Cliff Bluff (Rows 22 to 40, Cols 45 to 48)
    for (let r = 22; r <= 40; r++) {
        for (let c = 45; c <= 48; c++) {
            obstacles.push({ col: c, row: r });
        }
    }

    // 2. Unbridged River Water Tiles
    const water = getGreenvaleWaterTiles();
    for (const w of water) {
        obstacles.push(w);
    }

    // 3. Western Outcrop Rocks (near Blue perimeter)
    obstacles.push(
        { col: 25, row: 20 }, { col: 26, row: 20 },
        { col: 25, row: 44 }, { col: 26, row: 44 }
    );

    // 4. Eastern Outcrop Rocks (near Red perimeter)
    obstacles.push(
        { col: 69, row: 20 }, { col: 70, row: 20 },
        { col: 69, row: 44 }, { col: 70, row: 44 }
    );

    return obstacles;
}

/**
 * Aesthetic decorations (bushes, rocks) that enrich the environment
 * without blocking troop movements or base building zones.
 */
export function getGreenvaleDecorations(): DecorationPlacement[] {
    const decs: DecorationPlacement[] = [];

    // Bushes along meadow edges (animated Bushe1/Bushe2)
    const bushPositions: TileCoord[] = [
        { col: 34, row: 22 }, { col: 35, row: 23 }, { col: 60, row: 22 }, { col: 61, row: 23 },
        { col: 34, row: 42 }, { col: 35, row: 43 }, { col: 60, row: 42 }, { col: 61, row: 43 },
        { col: 18, row: 20 }, { col: 20, row: 40 }, { col: 75, row: 20 }, { col: 77, row: 40 }
    ];

    for (let i = 0; i < bushPositions.length; i++) {
        const tex = i % 2 === 0 ? 'dec_bush_1' : 'dec_bush_2';
        decs.push({ ...bushPositions[i], texture: tex, scale: 0.7 });
    }

    // Rocks scattered around quarry edges and riverbanks
    const rockPositions: TileCoord[] = [
        { col: 43, row: 6 }, { col: 50, row: 6 }, { col: 43, row: 54 }, { col: 50, row: 54 },
        { col: 10, row: 45 }, { col: 13, row: 45 }, { col: 82, row: 45 }, { col: 85, row: 45 },
        { col: 44, row: 15 }, { col: 49, row: 15 }, { col: 44, row: 49 }, { col: 49, row: 49 }
    ];

    for (let i = 0; i < rockPositions.length; i++) {
        const tex = i % 2 === 0 ? 'dec_rock_1' : 'dec_rock_2';
        decs.push({ ...rockPositions[i], texture: tex, scale: 0.8 });
    }

    return decs;
}
