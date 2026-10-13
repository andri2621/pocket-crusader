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

export class AIManager {
    private scene: Scene;
    private entityManager: EntityManager;
    private gridManager: GridManager;
    public readonly faction: 'blue' | 'red';

    private tickTimer: number = 0;
    private readonly tickInterval: number = 2500; // 2.5s decision cycle

    // Base coordinates for Red faction
    public readonly baseCol: number = 25;
    public readonly baseRow: number = 9;

    constructor(scene: Scene, entityManager: EntityManager, gridManager: GridManager, faction: 'blue' | 'red' = 'red') {
        this.scene = scene;
        this.entityManager = entityManager;
        this.gridManager = gridManager;
        this.faction = faction;
    }

    public update(_time: number, delta: number): void {
        this.tickTimer += delta;
        if (this.tickTimer < this.tickInterval) {
            return;
        }
        this.tickTimer = 0;

        // Execute AI decision pipeline
        this.manageEconomy();
        this.manageConstruction();
        this.manageRecruitment();
        this.manageMilitary();
    }

    private manageEconomy(): void {
        const store = useGameStore.getState();
        const resources = store.resources[this.faction] || { wood: 300, gold: 300 };

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
            // Determine resource priority
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

    private manageConstruction(): void {
        const store = useGameStore.getState();
        const resources = store.resources[this.faction] || { wood: 300, gold: 300 };

        // Check House Construction (Target: 1-2 houses)
        const houses = this.entityManager.buildings.filter(b => b.faction === this.faction && b.buildingType === 'house');
        if (houses.length < 2 && resources.wood >= 30) {
            const candidateSpots = [
                { col: 22, row: 12 },
                { col: 27, row: 12 },
                { col: 21, row: 10 }
            ];

            for (const spot of candidateSpots) {
                if (this.gridManager.isAreaAvailable(spot.col, spot.row, 2, 2)) {
                    // Deduct wood
                    store.deductWood(30, this.faction);

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
                    return; // 1 building per cycle
                }
            }
        }

        // Check Barracks Construction (Target: 1 barracks)
        const barracksList = this.entityManager.buildings.filter(b => b.faction === this.faction && b.buildingType === 'barracks');
        if (barracksList.length === 0 && resources.wood >= 50 && resources.gold >= 50) {
            const candidateBarracksSpots = [
                { col: 20, row: 6 },
                { col: 20, row: 8 },
                { col: 22, row: 5 }
            ];

            for (const spot of candidateBarracksSpots) {
                if (this.gridManager.isAreaAvailable(spot.col, spot.row, 2, 2)) {
                    // Deduct wood and gold
                    store.deductWood(50, this.faction);
                    store.deductGold(50, this.faction);


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

    private manageRecruitment(): void {
        const store = useGameStore.getState();
        const resources = store.resources[this.faction] || { wood: 300, gold: 300 };

        const barracks = this.entityManager.buildings.find(b => 
            b.faction === this.faction && 
            b.buildingType === 'barracks' && 
            b.isCompleted
        ) as Barracks;

        if (!barracks) return;

        // Check workers available for drafting (must keep at least 1 in economy)
        const factionWorkers = this.entityManager.units.filter(u => 
            u instanceof Worker && 
            u.faction === this.faction && 
            u.active && 
            !u.isConstructionJob
        );

        if (resources.gold >= 20 && factionWorkers.length > 1 && barracks.trainingRecruits.length < 2) {
            store.deductGold(20, this.faction);
            const draftedWorker = factionWorkers.find(u => (u as Worker).workerState === 'IDLE') as Worker || factionWorkers[0] as Worker;
            if (draftedWorker) {
                this.entityManager.dispatchWorkerToTrain(draftedWorker, barracks);
            }
        }
    }

    private manageMilitary(): void {
        const warriors = this.entityManager.units.filter(u => 
            u instanceof Warrior && 
            u.faction === this.faction && 
            u.active
        ) as Warrior[];

        if (warriors.length === 0) return;

        // 1. Defend Home Base Priority: Check for any enemy units near Red Base (within 7 tiles)
        const threats = this.entityManager.units.filter(u => 
            u.faction !== this.faction && 
            u.active && 
            Math.max(Math.abs(u.gridX - this.baseCol), Math.abs(u.gridY - this.baseRow)) <= 7
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

        // 2. Offense Priority: March on the Blue King!
        const blueKing = this.entityManager.units.find(u => 
            u instanceof King && 
            u.faction !== this.faction && 
            u.active
        );

        if (blueKing) {
            for (const warrior of warriors) {
                if (!warrior.targetEntity || warrior.targetEntity !== blueKing) {
                    warrior.attackTarget(blueKing);
                }
            }
            return;
        }

        // 3. Fallback: Attack Blue Stronghold or remaining structures
        const blueBuilding = this.entityManager.buildings.find(b => 
            b.faction !== this.faction && 
            b.active
        );

        if (blueBuilding) {
            for (const warrior of warriors) {
                if (!warrior.targetEntity || warrior.targetEntity !== blueBuilding) {
                    warrior.attackTarget(blueBuilding);
                }
            }
        }
    }
}
