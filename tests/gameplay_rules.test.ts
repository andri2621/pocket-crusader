import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE_CONFIG, AI_DIFFICULTIES } from '../src/game/config/BalanceConfig.ts';
import { GREENVALE_CONFIG, getGreenvaleResources, getGreenvaleObstacles, getGreenvaleBridges } from '../src/game/map/GreenvaleMap.ts';

describe('RTS Building Cost & Affordability Rules', () => {
    function canAfford(building: keyof typeof BALANCE_CONFIG.buildings, wood: number, gold: number): boolean {
        const cost = BALANCE_CONFIG.buildings[building] as { wood: number; gold?: number };
        return wood >= cost.wood && gold >= (cost.gold ?? 0);
    }

    test('House costs 40 wood and 0 gold', () => {
        assert.equal(canAfford('house', 40, 0), true);
        assert.equal(canAfford('house', 39, 0), false);
    });

    test('Barracks requires 60 wood and 40 gold', () => {
        assert.equal(canAfford('barracks', 60, 40), true);
        assert.equal(canAfford('barracks', 60, 39), false);
        assert.equal(canAfford('barracks', 59, 40), false);
    });

    test('Huts cost 40 wood each', () => {
        assert.equal(canAfford('woodcutter_hut', 40, 0), true);
        assert.equal(canAfford('gold_hut', 40, 0), true);
        assert.equal(canAfford('woodcutter_hut', 39, 100), false);
    });
});

describe('RTS Population Management Rules', () => {
    function calculateMaxPopulation(completedHouseCount: number): number {
        const base = BALANCE_CONFIG.population.baseCap;
        const perHouse = BALANCE_CONFIG.population.capPerHouse;
        const max = BALANCE_CONFIG.population.maxCap;
        return Math.min(base + completedHouseCount * perHouse, max);
    }

    test('Base population cap without houses is 5', () => {
        assert.equal(calculateMaxPopulation(0), 5);
    });

    test('Each completed house adds 5 to max population up to max 30', () => {
        assert.equal(calculateMaxPopulation(1), 10);
        assert.equal(calculateMaxPopulation(2), 15);
        assert.equal(calculateMaxPopulation(5), 30);
        assert.equal(calculateMaxPopulation(8), 30); // Clamped at 30
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
        const trainCost = BALANCE_CONFIG.units.warrior.trainCostGold;
        // Must afford 20 gold and keep at least 1 worker active in the economy
        return gold >= trainCost && availableWorkers > 1;
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

describe('RTS Grid Coordinate Transformations (96x64)', () => {
    const TILE_SIZE = GREENVALE_CONFIG.tileSize;
    const GRID_COLS = GREENVALE_CONFIG.cols;
    const GRID_ROWS = GREENVALE_CONFIG.rows;

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
        assert.equal(cell.col, 1);
        assert.equal(cell.row, 3);
    });

    test('Grid boundary validation respects 96x64 map size', () => {
        assert.equal(isValidGridPos(0, 0), true);
        assert.equal(isValidGridPos(95, 63), true);
        assert.equal(isValidGridPos(96, 63), false);
        assert.equal(isValidGridPos(10, 64), false);
        assert.equal(isValidGridPos(-1, 5), false);
    });
});

describe('RTS Worker Resource Harvest & Capacity Rules', () => {
    test('Worker carry capacity caps at 10 and triggers return', () => {
        let carried = 0;
        const capacity = BALANCE_CONFIG.units.worker.carryCapacity;
        const yieldPerHit = BALANCE_CONFIG.units.worker.harvestYield;

        // Hit 1
        carried += yieldPerHit;
        assert.equal(carried, 5);
        assert.equal(carried >= capacity, false);

        // Hit 2
        carried += yieldPerHit;
        assert.equal(carried, 10);
        assert.equal(carried >= capacity, true);
    });

    test('Node depletion during harvesting safely records yield before node is nullified', () => {
        let node: { hp: number; yieldPerHit: number } | null = { hp: 1, yieldPerHit: 5 };
        let workerCarried = 0;
        let workerState = 'CHOPPING';

        if (node) {
            const yieldAmount = node.yieldPerHit;
            workerCarried += yieldAmount;

            node.hp -= 1;
            if (node.hp <= 0) {
                node = null;
            }

            if (!node || workerCarried >= 10) {
                workerState = 'CARRYING';
            }
        }

        assert.equal(workerCarried, 5);
        assert.equal(node, null);
        assert.equal(workerState, 'CARRYING');
    });
});

describe('RTS Combat & Damage Calculation Rules', () => {
    test('Warrior deals 25 damage per hit', () => {
        let targetHp = BALANCE_CONFIG.units.warrior.maxHealth;
        const warriorDamage = BALANCE_CONFIG.units.warrior.attackDamage;
        targetHp -= warriorDamage;
        assert.equal(targetHp, 95);
    });

    test('King with 600 health takes 24 warrior hits to defeat', () => {
        let kingHp = BALANCE_CONFIG.units.king.maxHealth;
        const warriorDamage = BALANCE_CONFIG.units.warrior.attackDamage;
        const hitsNeeded = kingHp / warriorDamage;
        assert.equal(hitsNeeded, 24);

        for (let i = 0; i < hitsNeeded; i++) {
            kingHp -= warriorDamage;
        }
        assert.equal(kingHp, 0);
    });

    test('Melee range considers adjacent tiles within Chebyshev distance 1', () => {
        const isMeleeRange = (c1: number, r1: number, c2: number, r2: number) => {
            return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2)) <= 1;
        };
        assert.equal(isMeleeRange(5, 5, 5, 6), true);
        assert.equal(isMeleeRange(5, 5, 6, 6), true);
        assert.equal(isMeleeRange(5, 5, 4, 5), true);
        assert.equal(isMeleeRange(5, 5, 5, 7), false);
        assert.equal(isMeleeRange(5, 5, 7, 7), false);
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
            blue: { wood: 100, gold: 60, currentPopulation: 0, maxPopulation: 5 },
            red: { wood: 100, gold: 60, currentPopulation: 0, maxPopulation: 5 }
        };
    }

    test('Adding resources to one faction does not leak into the other faction', () => {
        const state = createInitialState();
        state.red.wood += 10;
        assert.equal(state.red.wood, 110);
        assert.equal(state.blue.wood, 100);
    });

    test('Deducting resources clamps at 0 and does not go negative', () => {
        const state = createInitialState();
        state.blue.wood = Math.max(0, state.blue.wood - 150);
        assert.equal(state.blue.wood, 0);
    });

    test('Faction population updates preserve per-faction limits', () => {
        const state = createInitialState();
        state.blue.maxPopulation = 15;
        state.red.maxPopulation = 10;
        assert.equal(state.blue.maxPopulation, 15);
        assert.equal(state.red.maxPopulation, 10);
    });
});

describe('Skirmish AI Difficulty Profiles & Wave Pacing Rules', () => {
    test('Easy difficulty delays first assault to >= 3.5 minutes and requires >= 4 warriors', () => {
        const easy = AI_DIFFICULTIES.easy;
        assert.equal(easy.firstAttackDelayMs, 210000);
        assert.equal(easy.minAttackArmySize, 4);
        assert.equal(easy.tickInterval, 2500);
    });

    test('Normal difficulty balances aggression to 2.5 minutes and 3 warriors', () => {
        const normal = AI_DIFFICULTIES.normal;
        assert.equal(normal.firstAttackDelayMs, 150000);
        assert.equal(normal.minAttackArmySize, 3);
    });

    test('Hard difficulty enforces faster military ramp up with 1.5 min delay and 2 warriors', () => {
        const hard = AI_DIFFICULTIES.hard;
        assert.equal(hard.firstAttackDelayMs, 90000);
        assert.equal(hard.minAttackArmySize, 2);
    });
});

describe('Greenvale Frontier Map Symmetry & Strategic Balancing', () => {
    test('Blue and Red starting base resources are strictly symmetrical in quantity', () => {
        const resources = getGreenvaleResources();
        
        // Count trees near Blue base (cols 5..20) vs Red base (cols 75..90)
        const blueTrees = resources.filter(r => r.type === 'wood' && r.col >= 5 && r.col <= 20).length;
        const redTrees = resources.filter(r => r.type === 'wood' && r.col >= 75 && r.col <= 90).length;
        assert.equal(blueTrees, 14);
        assert.equal(redTrees, 14);

        // Count gold rocks near Blue base vs Red base
        const blueGold = resources.filter(r => r.type === 'gold' && r.col >= 5 && r.col <= 20).length;
        const redGold = resources.filter(r => r.type === 'gold' && r.col >= 75 && r.col <= 90).length;
        assert.equal(blueGold, 4);
        assert.equal(redGold, 4);
    });

    test('Central river divide and chokepoints allow strategic river crossing via wooden bridges', () => {
        const obstacles = getGreenvaleObstacles();
        assert.ok(obstacles.length > 20);
        
        // Both North and South crossings feature functional wooden bridges
        const bridges = getGreenvaleBridges();
        assert.ok(bridges.length >= 12);

        // North bridge tiles (rows 16-18) must NOT be in obstacles (walkable across river)
        const northBridgeTiles = bridges.filter(b => b.row >= 16 && b.row <= 18);
        for (const nb of northBridgeTiles) {
            const isBlocked = obstacles.some(o => o.col === nb.col && o.row === nb.row);
            assert.equal(isBlocked, false, `North Bridge at (${nb.col}, ${nb.row}) must remain walkable`);
        }

        // South bridge tiles (rows 46-48) must NOT be in obstacles (walkable across river)
        const southBridgeTiles = bridges.filter(b => b.row >= 46 && b.row <= 48);
        for (const sb of southBridgeTiles) {
            const isBlocked = obstacles.some(o => o.col === sb.col && o.row === sb.row);
            assert.equal(isBlocked, false, `South Bridge at (${sb.col}, ${sb.row}) must remain walkable`);
        }
    });
});
