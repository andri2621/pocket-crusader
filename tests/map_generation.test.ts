import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { 
    GREENVALE_CONFIG, 
    SOLID_GROUND_FRAMES, 
    getDeterministicGroundFrame,
    getGreenvaleBridges,
    getGreenvaleCliffs,
    getGreenvaleWaterTiles,
    getGreenvaleObstacles,
    getGreenvaleResources
} from '../src/game/map/GreenvaleMap.ts';

describe('Map Generation & Solid Terrain Invariants', () => {
    test('Every generated ground frame across the 96x64 grid is from the verified solid palette', () => {
        const solidSet = new Set(SOLID_GROUND_FRAMES);
        
        for (let r = 0; r < GREENVALE_CONFIG.rows; r++) {
            for (let c = 0; c < GREENVALE_CONFIG.cols; c++) {
                const frame = getDeterministicGroundFrame(c, r);
                assert.ok(solidSet.has(frame), `Frame ${frame} at (${c}, ${r}) is not in solid ground set!`);
                assert.notEqual(frame, 1, 'Frame 1 (outer top edge with transparent margin) must never appear in base ground');
                assert.notEqual(frame, 2, 'Frame 2 (outer corner with transparent margin) must never appear in base ground');
                assert.notEqual(frame, 4, 'Frame 4 (empty spacer) must never appear in base ground');
                assert.notEqual(frame, 13, 'Frame 13 (empty spacer) must never appear in base ground');
                assert.notEqual(frame, 22, 'Frame 22 (empty spacer) must never appear in base ground');
            }
        }
    });

    test('Deterministic ground frame is reproducible with the same seed', () => {
        for (let i = 0; i < 50; i++) {
            const c = (i * 13) % GREENVALE_CONFIG.cols;
            const r = (i * 29) % GREENVALE_CONFIG.rows;
            const f1 = getDeterministicGroundFrame(c, r, 1337);
            const f2 = getDeterministicGroundFrame(c, r, 1337);
            assert.equal(f1, f2);
        }
    });

    test('Wooden plank bridges exist across the river and connect West and East banks', () => {
        const bridges = getGreenvaleBridges();
        assert.ok(bridges.length >= 12, 'Bridges should have at least 12 tile segments');

        // North bridge should span cols 45 to 48 at row 17 (deck)
        const northDeck = bridges.filter(b => b.row === 17 && b.frame === 4);
        assert.equal(northDeck.length, 4, 'North bridge deck must span 4 tiles across river');

        // South bridge should span cols 45 to 48 at row 47 (deck)
        const southDeck = bridges.filter(b => b.row === 47 && b.frame === 4);
        assert.equal(southDeck.length, 4, 'South bridge deck must span 4 tiles across river');
    });

    test('Cliffs / Tebing form an impassable barrier separating central waters', () => {
        const cliffs = getGreenvaleCliffs();
        assert.ok(cliffs.length > 50, 'Cliffs must form a substantial dividing ridge');

        const obstacles = getGreenvaleObstacles();
        const obstacleSet = new Set(obstacles.map(o => `${o.col},${o.row}`));

        // Verify every cliff tile is marked as an obstacle
        for (const cliff of cliffs) {
            const key = `${cliff.col},${cliff.row}`;
            assert.ok(obstacleSet.has(key), `Cliff tile at ${key} must be marked as blocked obstacle`);
        }
    });

    test('Bridges are strictly walkable (never in obstacle list)', () => {
        const bridges = getGreenvaleBridges();
        const obstacles = getGreenvaleObstacles();
        const obstacleSet = new Set(obstacles.map(o => `${o.col},${o.row}`));

        for (const bridge of bridges) {
            const key = `${bridge.col},${bridge.row}`;
            assert.equal(obstacleSet.has(key), false, `Bridge tile at ${key} must NOT be in obstacle list!`);
        }
    });

    test('Verified sliced UI textures exist and are available in public assets', () => {
        const slicedDir = path.resolve(process.cwd(), 'public/assets/tiny-swords/UI Elements/UI Elements/Sliced');
        const requiredFiles = [
            'Button_Blue_Regular_192.png',
            'Button_Blue_Pressed_192.png',
            'Button_Red_Regular_192.png',
            'Button_Red_Pressed_192.png',
            'Paper_Regular_192.png',
            'Ribbon_Blue_192.png',
            'Bar_Base_192.png'
        ];

        for (const file of requiredFiles) {
            const fullPath = path.join(slicedDir, file);
            assert.ok(fs.existsSync(fullPath), `Required sliced texture ${file} must exist at ${fullPath}`);
        }
    });
});
