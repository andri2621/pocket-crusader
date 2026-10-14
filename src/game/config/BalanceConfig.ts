export interface AIDifficultyConfig {
    name: 'easy' | 'normal' | 'hard';
    label: string;
    description: string;
    tickInterval: number;
    spawnInterval: number;
    firstAttackDelayMs: number;
    minAttackArmySize: number;
    attackCooldownMs: number;
    houseTargetCount: number;
    defensiveLeashRadius: number;
}

export const AI_DIFFICULTIES: Record<'easy' | 'normal' | 'hard', AIDifficultyConfig> = {
    easy: {
        name: 'easy',
        label: 'Easy (Recommended)',
        description: 'Slower enemy economy, delayed first attack (~3.5m), and smaller initial attack waves.',
        tickInterval: 2500,
        spawnInterval: 24000,
        firstAttackDelayMs: 210000, // 3.5 minutes
        minAttackArmySize: 4,
        attackCooldownMs: 90000,
        houseTargetCount: 2,
        defensiveLeashRadius: 7,
    },
    normal: {
        name: 'normal',
        label: 'Normal',
        description: 'Balanced economic development and coordinated assaults (~2.5m).',
        tickInterval: 2000,
        spawnInterval: 20000,
        firstAttackDelayMs: 150000, // 2.5 minutes
        minAttackArmySize: 3,
        attackCooldownMs: 60000,
        houseTargetCount: 3,
        defensiveLeashRadius: 9,
    },
    hard: {
        name: 'hard',
        label: 'Hard',
        description: 'Fast, aggressive military buildup and relentless attack waves (~1.5m).',
        tickInterval: 1500,
        spawnInterval: 16000,
        firstAttackDelayMs: 90000, // 1.5 minutes
        minAttackArmySize: 2,
        attackCooldownMs: 40000,
        houseTargetCount: 4,
        defensiveLeashRadius: 11,
    },
};

export const BALANCE_CONFIG = {
    startingResources: {
        wood: 100,
        gold: 60,
    },
    population: {
        baseCap: 5,
        capPerHouse: 5,
        maxCap: 30,
        playerSpawnInterval: 20000, // 20s
    },
    buildings: {
        house: {
            wood: 40,
            gold: 0,
            footprintWidth: 2,
            footprintHeight: 2,
            buildTime: 12000,
            popBonus: 5,
        },
        woodcutter_hut: {
            wood: 40,
            gold: 0,
            footprintWidth: 1,
            footprintHeight: 1,
            buildTime: 10000,
        },
        gold_hut: {
            wood: 40,
            gold: 0,
            footprintWidth: 1,
            footprintHeight: 1,
            buildTime: 10000,
        },
        barracks: {
            wood: 60,
            gold: 40,
            footprintWidth: 2,
            footprintHeight: 2,
            buildTime: 18000,
        },
    },
    units: {
        worker: {
            maxHealth: 50,
            speed: 150,
            carryCapacity: 10,
            harvestYield: 5,
            harvestTime: 1500,
        },
        warrior: {
            maxHealth: 120,
            speed: 125,
            attackDamage: 25,
            attackInterval: 1200,
            trainCostGold: 20,
            trainDuration: 10000,
        },
        king: {
            maxHealth: 600,
            speed: 100,
            attackDamage: 35,
            attackInterval: 1000,
        },
    },
    resources: {
        tree: {
            maxHp: 6,
            yieldPerHit: 5, // 30 wood total
        },
        goldStone: {
            maxHp: 10,
            yieldPerHit: 5, // 50 gold total
        },
    },
};
