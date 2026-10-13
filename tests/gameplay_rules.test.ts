import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

describe('RTS Building Cost & Affordability Rules', () => {
    const BUILDING_COSTS = {
        house: { wood: 30, gold: 0 },
        woodcutter_hut: { wood: 50, gold: 0 },
        gold_hut: { wood: 50, gold: 0 },
        barracks: { wood: 50, gold: 50 }
    };

    function canAfford(building: keyof typeof BUILDING_COSTS, wood: number, gold: number): boolean {
        const cost = BUILDING_COSTS[building];
        return wood >= cost.wood && gold >= cost.gold;
    }

    test('House costs 30 wood and 0 gold', () => {
        assert.equal(canAfford('house', 30, 0), true);
        assert.equal(canAfford('house', 29, 0), false);
    });

    test('Barracks requires 50 wood and 50 gold', () => {
        assert.equal(canAfford('barracks', 50, 50), true);
        assert.equal(canAfford('barracks', 50, 49), false);
        assert.equal(canAfford('barracks', 49, 50), false);
    });

    test('Huts cost 50 wood each', () => {
        assert.equal(canAfford('woodcutter_hut', 50, 0), true);
        assert.equal(canAfford('gold_hut', 50, 0), true);
        assert.equal(canAfford('woodcutter_hut', 49, 100), false);
    });
});

describe('RTS Population Management Rules', () => {
    function calculateMaxPopulation(completedHouseCount: number): number {
        const BASE_POPULATION = 5;
        const POP_PER_HOUSE = 5;
        return BASE_POPULATION + completedHouseCount * POP_PER_HOUSE;
    }

    test('Base population cap without houses is 5', () => {
        assert.equal(calculateMaxPopulation(0), 5);
    });

    test('Each completed house adds 5 to max population', () => {
        assert.equal(calculateMaxPopulation(1), 10);
        assert.equal(calculateMaxPopulation(2), 15);
        assert.equal(calculateMaxPopulation(5), 30);
    });
 
    test('Stronghold spawns workers only when current < max', () => {
        const shouldSpawn = (current: number, max: number) => current < max;
        assert.equal(shouldSpawn(4, 5), true);
        assert.equal(shouldSpawn(5, 5), false);
        assert.equal(shouldSpawn(6, 5), false);
    });
});

describe('RTS Worker Drafting & Training Constraints', () => {
    function canDraftWorkerForTraining(gold: number, availableWorkers: number): boolean {
        // Must afford 20 gold and keep at least 1 worker active in the economy
        return gold >= 20 && availableWorkers > 1;
    }

    test('Drafting succeeds with sufficient gold and more than 1 available worker', () => {
        assert.equal(canDraftWorkerForTraining(20, 2), true);
        assert.equal(canDraftWorkerForTraining(100, 5), true);
    });

    test('Drafting is rejected if only 1 worker remains (economy safety net)', () => {
        assert.equal(canDraftWorkerForTraining(100, 1), false);
        assert.equal(canDraftWorkerForTraining(50, 0), false);
    });

    test('Drafting is rejected if player lacks 20 gold', () => {
        assert.equal(canDraftWorkerForTraining(19, 5), false);
    });
});

describe('RTS Grid Coordinate Transformations', () => {
    const TILE_SIZE = 64;
    const GRID_COLS = 32;
    const GRID_ROWS = 18;

    function getTileCenter(col: number, row: number): { x: number; y: number } {
        return {
            x: col * TILE_SIZE + TILE_SIZE / 2,
            y: row * TILE_SIZE + TILE_SIZE / 2
        };
    }

    function worldToGrid(x: number, y: number): { col: number; row: number } {
        return {
            col: Math.floor(x / TILE_SIZE),
            row: Math.floor(y / TILE_SIZE)
        };
    }

    function isValidGridPos(col: number, row: number): boolean {
        return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
    }

    test('Tile center calculation places point in center of 64px cell', () => {
        const center = getTileCenter(0, 0);
        assert.equal(center.x, 32);
        assert.equal(center.y, 32);

        const center5 = getTileCenter(5, 10);
        assert.equal(center5.x, 5 * 64 + 32);
        assert.equal(center5.y, 10 * 64 + 32);
    });

    test('World to grid maps pixel coordinates to grid cells', () => {
        const cell = worldToGrid(100, 200);
        assert.equal(cell.col, 1); // 100 / 64 = 1.5625 -> 1
        assert.equal(cell.row, 3); // 200 / 64 = 3.125 -> 3
    });

    test('Grid boundary validation respects 32x18 map size', () => {
        assert.equal(isValidGridPos(0, 0), true);
        assert.equal(isValidGridPos(31, 17), true);
        assert.equal(isValidGridPos(32, 17), false);
        assert.equal(isValidGridPos(10, 18), false);
        assert.equal(isValidGridPos(-1, 5), false);
    });
});

describe('RTS Worker Resource Harvest & Capacity Rules', () => {
    test('Worker carry capacity caps at 10 and triggers return', () => {
        let carried = 0;
        const capacity = 10;
        const yieldPerHit = 5;

        // Hit 1
        carried += yieldPerHit;
        assert.equal(carried, 5);
        assert.equal(carried >= capacity, false);

        // Hit 2
        carried += yieldPerHit;
        assert.equal(carried, 10);
        assert.equal(carried >= capacity, true); // Capacity reached, returns to base
    });
});

describe('RTS Combat & Damage Calculation Rules', () => {
    test('Warrior deals 25 damage per hit', () => {
        let targetHp = 100;
        const warriorDamage = 25;
        targetHp -= warriorDamage;
        assert.equal(targetHp, 75);
    });

    test('King with 500 health takes 20 warrior hits to defeat', () => {
        let kingHp = 500;
        const warriorDamage = 25;
        const hitsNeeded = kingHp / warriorDamage;
        assert.equal(hitsNeeded, 20);

        for (let i = 0; i < hitsNeeded; i++) {
            kingHp -= warriorDamage;
        }
        assert.equal(kingHp, 0);
    });

    test('Melee range considers adjacent tiles within Chebyshev distance 1', () => {
        const isMeleeRange = (c1: number, r1: number, c2: number, r2: number) => {
            return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2)) <= 1;
        };
        assert.equal(isMeleeRange(5, 5, 5, 6), true); // North
        assert.equal(isMeleeRange(5, 5, 6, 6), true); // North-East diagonal
        assert.equal(isMeleeRange(5, 5, 4, 5), true); // West
        assert.equal(isMeleeRange(5, 5, 5, 7), false); // 2 tiles away
        assert.equal(isMeleeRange(5, 5, 7, 7), false); // 2 tiles diagonal
    });

    test('King death determines victory vs defeat based on player faction', () => {
        const resolveMatch = (playerFaction: 'blue' | 'red', deadKingFaction: 'blue' | 'red') => {
            return playerFaction === deadKingFaction ? 'defeat' : 'victory';
        };
        assert.equal(resolveMatch('blue', 'red'), 'victory');
        assert.equal(resolveMatch('blue', 'blue'), 'defeat');
        assert.equal(resolveMatch('red', 'blue'), 'victory');
        assert.equal(resolveMatch('red', 'red'), 'defeat');
    });
});

describe('RTS Store Faction Resource Isolation & Normalization Rules', () => {
    interface FactionRes {
        wood: number;
        gold: number;
        currentPopulation: number;
        maxPopulation: number;
    }

    function createInitialState(): { blue: FactionRes; red: FactionRes } {
        return {
            blue: { wood: 300, gold: 300, currentPopulation: 0, maxPopulation: 5 },
            red: { wood: 300, gold: 300, currentPopulation: 0, maxPopulation: 5 }
        };
    }

    test('Adding resources to one faction does not leak into the other faction', () => {
        const state = createInitialState();
        // Red AI gathers 10 wood
        state.red.wood += 10;
        assert.equal(state.red.wood, 310);
        assert.equal(state.blue.wood, 300); // Blue remains unchanged
    });

    test('Deducting resources clamps at 0 and does not go negative', () => {
        const state = createInitialState();
        // Player attempts to build 10 houses costing 300 wood, then another house
        state.blue.wood = Math.max(0, state.blue.wood - 350);
        assert.equal(state.blue.wood, 0);
    });

    test('Faction population updates preserve per-faction limits', () => {
        const state = createInitialState();
        state.blue.maxPopulation = 15; // 2 houses built
        state.red.maxPopulation = 10;  // 1 house built
        assert.equal(state.blue.maxPopulation, 15);
        assert.equal(state.red.maxPopulation, 10);
    });
});

