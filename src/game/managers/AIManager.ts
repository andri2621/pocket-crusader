import { Scene } from 'phaser';
import { EntityManager } from './EntityManager';
import { GridManager } from './GridManager';
import { Worker } from '../entities/Worker';
import { Warrior } from '../entities/Warrior';
import { King } from '../entities/King';
import { House } from '../entities/House';
import { Barracks } from '../entities/Barracks';
import { useGameStore } from '../../store/useGameStore';
import { GridPosition } from '../../types/game';
import { BALANCE_CONFIG, AI_DIFFICULTIES, AIDifficultyConfig } from '../config/BalanceConfig';

import { GREENVALE_CONFIG } from '../map/GreenvaleMap';

export class AIManager {
    private scene: Scene;
    private entityManager: EntityManager;
    private gridManager: GridManager;
    public readonly faction: 'blue' | 'red';

    private tickTimer: number = 0;
    private matchElapsedMs: number = 0;
    private lastAttackTime: number = 0;
    private isAssaulting: boolean = false;

    constructor(scene: Scene, entityManager: EntityManager, gridManager: GridManager, faction: 'blue' | 'red' = 'red') {
        this.scene = scene;
        this.entityManager = entityManager;
        this.gridManager = gridManager;
        this.faction = faction;
    }

    /**
     * Dynamically locate base coordinates from faction Stronghold.
     * Defaults to faction base in GREENVALE_CONFIG if not yet spawned.
     */
    public get baseCol(): number {
        const stronghold = this.entityManager.buildings.find(b => b.buildingType === 'stronghold' && b.faction === this.faction);
        return stronghold ? stronghold.gridX : GREENVALE_CONFIG.bases[this.faction].strongholdCol;
    }

    public get baseRow(): number {
        const stronghold = this.entityManager.buildings.find(b => b.buildingType === 'stronghold' && b.faction === this.faction);
        return stronghold ? stronghold.gridY : GREENVALE_CONFIG.bases[this.faction].strongholdRow;
    }

    public update(_time: number, delta: number): void {
        this.matchElapsedMs += delta;
        this.tickTimer += delta;

        const store = useGameStore.getState();
        const difficulty = store.difficulty || 'easy';
        const config = AI_DIFFICULTIES[difficulty];

        if (this.tickTimer < config.tickInterval) {
            return;
        }
        this.tickTimer = 0;

        // Execute AI decision pipeline with difficulty parameters
        this.manageEconomy();
        this.manageConstruction(config);
        this.manageRecruitment(config);
        this.manageMilitary(config);
    }

    private manageEconomy(): void {
        const store = useGameStore.getState();
        const resources = store.resources[this.faction] || { wood: 100, gold: 60 };

        // Find idle workers of this faction
        const idleWorkers = this.entityManager.units.filter(u => 
            u instanceof Worker && 
            u.faction === this.faction && 
            u.active && 
            u.workerState === 'IDLE' && 
            !u.isConstructionJob && 
            !u.assignedHut
        ) as Worker[];

        for (const worker of idleWorkers) {
            // Determine resource priority based on current reserves
            const targetType = (resources.wood < 80) ? 'wood' : (resources.gold < 60) ? 'gold' : 'wood';
            const startPos = { col: worker.gridX, row: worker.gridY };
            const resource = this.entityManager.getNearestResource(startPos, targetType);

            if (resource && resource.active) {
                const adjTile = this.gridManager.findCardinalAdjacentWalkable(resource.gridX, resource.gridY, startPos);
                if (adjTile) {
                    this.gridManager.findPath(startPos, adjTile, (path: GridPosition[] | null) => {
                        if (path && path.length > 0) {
                            worker.moveAlongPath(path, () => {
                                if (resource.active) {
                                    worker.startGathering(resource);
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    private manageConstruction(config: AIDifficultyConfig): void {
        const store = useGameStore.getState();
        const resources = store.resources[this.faction] || { wood: 100, gold: 60 };
        const baseC = this.baseCol;
        const baseR = this.baseRow;

        // 1. Check House Construction
        const houses = this.entityManager.buildings.filter(b => b.faction === this.faction && b.buildingType === 'house');
        const houseCost = BALANCE_CONFIG.buildings.house.wood;
        if (houses.length < config.houseTargetCount && resources.wood >= houseCost) {
            const candidateHouseSpots = [
                { col: baseC - 4, row: baseR - 3 },
                { col: baseC + 5, row: baseR - 3 },
                { col: baseC - 4, row: baseR + 3 },
                { col: baseC + 5, row: baseR + 3 },
                { col: baseC, row: baseR - 5 },
                { col: baseC, row: baseR + 5 }
            ];

            for (const spot of candidateHouseSpots) {
                if (this.gridManager.isValidGridPos(spot.col, spot.row) && 
                    this.gridManager.isAreaAvailable(spot.col, spot.row, 2, 2)) {
                    // Deduct wood
                    store.deductWood(houseCost, this.faction);

                    // Place House
                    const houseId = `house_${this.faction}_${Date.now()}`;
                    const house = new House({
                        scene: this.scene,
                        col: spot.col,
                        row: spot.row,
                        texture: 'house1',
                        faction: this.faction,
                        id: houseId
                    });
                    this.gridManager.blockArea(spot.col, spot.row, 2, 2);
                    this.entityManager.addBuilding(house);

                    // Dispatch nearest idle worker
                    const idleWorker = this.entityManager.units.find(u => 
                        u instanceof Worker && 
                        u.faction === this.faction && 
                        u.active && 
                        !u.isConstructionJob
                    ) as Worker;
                    if (idleWorker) {
                        this.entityManager.dispatchWorkerToBuilding(idleWorker, house);
                    }
                    return; // 1 building order per cycle
                }
            }
        }

        // 2. Check Barracks Construction (Target: 1 barracks)
        const barracksList = this.entityManager.buildings.filter(b => b.faction === this.faction && b.buildingType === 'barracks');
        const barracksWood = BALANCE_CONFIG.buildings.barracks.wood;
        const barracksGold = BALANCE_CONFIG.buildings.barracks.gold;

        if (barracksList.length === 0 && resources.wood >= barracksWood && resources.gold >= barracksGold) {
            const candidateBarracksSpots = [
                { col: baseC - 6, row: baseR },
                { col: baseC + 6, row: baseR },
                { col: baseC - 3, row: baseR - 5 },
                { col: baseC + 3, row: baseR - 5 },
                { col: baseC - 3, row: baseR + 5 },
                { col: baseC + 3, row: baseR + 5 }
            ];

            for (const spot of candidateBarracksSpots) {
                if (this.gridManager.isValidGridPos(spot.col, spot.row) &&
                    this.gridManager.isAreaAvailable(spot.col, spot.row, 2, 2)) {
                    // Deduct wood and gold
                    store.deductWood(barracksWood, this.faction);
                    store.deductGold(barracksGold, this.faction);

                    // Place Barracks
                    const barracksId = `barracks_${this.faction}_${Date.now()}`;
                    const barracks = new Barracks({
                        scene: this.scene,
                        col: spot.col,
                        row: spot.row,
                        texture: 'barracks',
                        faction: this.faction,
                        id: barracksId
                    });
                    this.gridManager.blockArea(spot.col, spot.row, 2, 2);
                    this.entityManager.addBuilding(barracks);

                    // Dispatch worker
                    const idleWorker = this.entityManager.units.find(u => 
                        u instanceof Worker && 
                        u.faction === this.faction && 
                        u.active && 
                        !u.isConstructionJob
                    ) as Worker;
                    if (idleWorker) {
                        this.entityManager.dispatchWorkerToBuilding(idleWorker, barracks);
                    }
                    return;
                }
            }
        }
    }

    private manageRecruitment(_config: AIDifficultyConfig): void {
        const store = useGameStore.getState();
        const resources = store.resources[this.faction] || { wood: 100, gold: 60 };

        const barracks = this.entityManager.buildings.find(b => 
            b.faction === this.faction && 
            b.buildingType === 'barracks' && 
            b.isCompleted
        ) as Barracks;

        if (!barracks) return;

        // Economy Safety Net: Keep at least 1-2 workers dedicated to harvesting
        const factionWorkers = this.entityManager.units.filter(u => 
            u instanceof Worker && 
            u.faction === this.faction && 
            u.active && 
            !u.isConstructionJob
        );

        const trainCost = BALANCE_CONFIG.units.warrior.trainCostGold;
        if (resources.gold >= trainCost && factionWorkers.length > 1 && barracks.trainingRecruits.length < 2) {
            store.deductGold(trainCost, this.faction);
            const draftedWorker = factionWorkers.find(u => (u as Worker).workerState === 'IDLE') as Worker || factionWorkers[0] as Worker;
            if (draftedWorker) {
                this.entityManager.dispatchWorkerToTrain(draftedWorker, barracks);
            }
        }
    }

    private manageMilitary(config: AIDifficultyConfig): void {
        const warriors = this.entityManager.units.filter(u => 
            u instanceof Warrior && 
            u.faction === this.faction && 
            u.active
        ) as Warrior[];

        if (warriors.length === 0) {
            this.isAssaulting = false;
            return;
        }

        const baseC = this.baseCol;
        const baseR = this.baseRow;

        // 1. Defend Home Base Priority: Check for any enemy units near Base within defensive leash radius
        const threats = this.entityManager.units.filter(u => 
            u.faction !== this.faction && 
            u.active && 
            Math.max(Math.abs(u.gridX - baseC), Math.abs(u.gridY - baseR)) <= config.defensiveLeashRadius
        );

        if (threats.length > 0) {
            const primaryThreat = threats[0];
            for (const warrior of warriors) {
                if (warrior.targetEntity !== primaryThreat) {
                    warrior.attackTarget(primaryThreat);
                }
            }
            return;
        }

        // 2. Offense Gating: Validate Timing, Army Size & Cooldown
        const timeReady = this.matchElapsedMs >= config.firstAttackDelayMs;
        const armyReady = warriors.length >= config.minAttackArmySize;
        const cooldownReady = (this.matchElapsedMs - this.lastAttackTime) >= config.attackCooldownMs;

        if (!this.isAssaulting) {
            if (timeReady && armyReady && cooldownReady) {
                this.isAssaulting = true;
                this.lastAttackTime = this.matchElapsedMs;
                console.log(`[AIManager] ${this.faction.toUpperCase()} launching assault wave with ${warriors.length} warriors!`);
            } else {
                // Defensive stance: Keep warriors rallied near home base
                for (const warrior of warriors) {
                    const distFromBase = Math.max(Math.abs(warrior.gridX - baseC), Math.abs(warrior.gridY - baseR));
                    if (distFromBase > config.defensiveLeashRadius && !warrior.targetEntity) {
                        // Return to base vicinity
                        const rallyTile = this.gridManager.getRandomWalkableTileInRange(baseC, baseR, 3);
                        if (rallyTile) {
                            warrior.moveToGrid(rallyTile.col, rallyTile.row);
                        }
                    }
                }
                return;
            }
        }

        // 3. Active Offensive Assault Wave Execution
        const blueKing = this.entityManager.units.find(u => 
            u instanceof King && 
            u.faction !== this.faction && 
            u.active
        );

        if (blueKing) {
            for (const warrior of warriors) {
                // Easy difficulty: If heavily damaged (< 25% HP), retreat to base
                if (config.name === 'easy' && warrior.currentHealth < warrior.maxHealth * 0.25) {
                    if (warrior.targetEntity) {
                        warrior.cancelAttack();
                        const rallyTile = this.gridManager.getRandomWalkableTileInRange(baseC, baseR, 2);
                        if (rallyTile) {
                            warrior.moveToGrid(rallyTile.col, rallyTile.row);
                        }
                    }
                    continue;
                }

                if (!warrior.targetEntity || warrior.targetEntity !== blueKing) {
                    warrior.attackTarget(blueKing);
                }
            }
            return;
        }

        // 4. Fallback: Attack Enemy Buildings
        const enemyBuilding = this.entityManager.buildings.find(b => 
            b.faction !== this.faction && 
            b.active
        );

        if (enemyBuilding) {
            for (const warrior of warriors) {
                if (!warrior.targetEntity || warrior.targetEntity !== enemyBuilding) {
                    warrior.attackTarget(enemyBuilding);
                }
            }
        }
    }
}
