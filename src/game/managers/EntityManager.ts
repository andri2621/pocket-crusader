import { Scene } from 'phaser';
import { BaseUnit } from '../entities/base/BaseUnit';
import { BaseBuilding } from '../entities/base/BaseBuilding';
import { BaseResource } from '../entities/base/BaseResource';
import { GridPosition, BuildingType } from '../../types/game';
import { GridManager } from './GridManager';
import { useGameStore } from '../../store/useGameStore';
import { Worker } from '../entities/Worker';
import { King } from '../entities/King';
import { Warrior } from '../entities/Warrior';
import { BuildingEntity } from '../entities/BuildingEntity';
import { EventBus } from '../EventBus';

export class EntityManager {
    private scene: Scene;
    private gridManager: GridManager;
    public units: BaseUnit[] = [];
    public buildings: BaseBuilding[] = [];
    public resources: BaseResource[] = [];
    
    private spawnTimer: number = 0;
    private assignTimer: number = 0;

    constructor(scene: Scene, gridManager: GridManager) {
        this.scene = scene;
        this.gridManager = gridManager;

        // Listen for building completion → recalculate population
        this.scene.events.on('building_completed', (building: BaseBuilding) => {
            this.onBuildingCompleted(building);
        });

        // Listen for React UI 'train_warrior' event
        EventBus.off('train_warrior'); // Prevent stacking
        EventBus.on('train_warrior', (barracksId: string) => {
            const barracks = this.buildings.find(b => b.id === barracksId) as any;
            if (barracks && barracks.addWorkerToQueue) {
                // Drafting Priority 1: IDLE or WANDERING (not assigned, not building)
                let draftedWorker = this.units.find(u => 
                    u instanceof Worker && 
                    !u.isConstructionJob && 
                    !u.assignedHut && 
                    (u.workerState === 'IDLE' || (u.workerState === 'MOVING' && !u.isCarryingWood))
                ) as Worker;
                
                // Drafting Priority 2: Hijack from Hut Automation
                if (!draftedWorker) {
                    draftedWorker = this.units.find(u => 
                        u instanceof Worker && 
                        !u.isConstructionJob && 
                        u.assignedHut && 
                        u.workerState !== 'MOVING_TO_TRAIN'
                    ) as Worker;

                    if (draftedWorker) {
                        // HIJACK ACTION
                        draftedWorker.cancelHutAutomation();
                        draftedWorker.clearCarriedResource();
                    }
                }

                if (draftedWorker) {
                    this.dispatchWorkerToTrain(draftedWorker, barracks);
                } else {
                    // No eligible pawns! Refund and reject.
                    useGameStore.getState().addGold(20);
                }
            }
        });

        // Listen for React UI 'cancel_training' event
        EventBus.off('cancel_training'); // Prevent stacking
        EventBus.on('cancel_training', (payload: { id: string, index: number }) => {
            const barracks = this.buildings.find(b => b.id === payload.id) as any;
            if (barracks && barracks.cancelQueueItem) {
                barracks.cancelQueueItem(payload.index);
            }
        });

        // Listen for internal worker cancellation
        this.scene.events.on('cancel_worker_training', (workerId: string) => {
            const worker = this.units.find(u => u.id === workerId) as Worker;
            if (worker) {
                worker.showFromTraining();
                worker.setWorkerState('IDLE');
            }
        });

        // Listen for internal worker graduation
        this.scene.events.on('worker_graduated', (workerId: string) => {
            const workerIndex = this.units.findIndex(u => u.id === workerId);
            if (workerIndex !== -1) {
                const worker = this.units[workerIndex] as Worker;
                worker.cancelMovement(); // Stop any active tween chains first
                worker.destroy();
                this.units.splice(workerIndex, 1);
            }
        });

        // Listen for disband warrior event (from React HUD)
        EventBus.off('disband_warrior'); // Prevent stacking
        EventBus.on('disband_warrior', (warriorId: string) => {
            const warriorIndex = this.units.findIndex(u => u.id === warriorId);
            if (warriorIndex !== -1) {
                const warrior = this.units[warriorIndex] as Warrior;
                const col = warrior.gridX;
                const row = warrior.gridY;
                
                // Force-clear InteractionManager's selectedUnit BEFORE destroying
                this.scene.events.emit('force_deselect_unit');

                warrior.cancelMovement();
                warrior.destroy();
                this.units.splice(warriorIndex, 1);

                // Spawn a new Worker at the same position
                const worker = new Worker({
                    scene: this.scene,
                    col: col,
                    row: row,
                    texture: 'pawn-idle'
                });
                this.addUnit(worker); // Also calls recalculatePopulation
            }
        });
    }

    public addUnit(unit: BaseUnit) {
        this.units.push(unit);
        if (unit instanceof Worker || unit instanceof Warrior) {
            this.recalculatePopulation();
        }
    }

    public addBuilding(building: BaseBuilding) {
        this.buildings.push(building);
    }

    public addResource(resource: BaseResource) {
        this.resources.push(resource);
    }

    public update(time: number, delta: number) {
        for (const unit of this.units) {
            unit.update(time, delta);
        }
        for (const building of this.buildings) {
            building.update(time, delta);
        }
        for (const resource of this.resources) {
            resource.update(time, delta);
        }

        // Population spawn check (every 10s)
        const store = useGameStore.getState();
        if (store.currentPopulation < store.maxPopulation) {
            this.spawnTimer += delta;
            if (this.spawnTimer >= 10000) {
                this.spawnTimer = 0;
                this.checkPopulationAndSpawn();
            }
        } else {
            this.spawnTimer = 0; // Reset timer if pop is capped
        }

        // Sync Spawn Timer to Stronghold
        const stronghold = this.buildings.find(b => b.buildingType === 'stronghold') as any;
        if (stronghold && stronghold.updateSpawnBar) {
            const isSpawning = store.currentPopulation < store.maxPopulation;
            stronghold.updateSpawnBar(isSpawning ? this.spawnTimer / 10000 : 0, isSpawning);
        }

        // Auto-assign idle workers to unfinished buildings (every 2s)
        this.assignTimer += delta;
        if (this.assignTimer >= 2000) {
            this.assignTimer = 0;
            this.assignIdleWorkers();
        }

        // Process Wandering AI for idle units
        this.processWanderingAI();
    }

    // ══════════════════════════════════════════════════════════
    //  POPULATION & SPAWNING
    // ══════════════════════════════════════════════════════════

    public recalculatePopulation() {
        const store = useGameStore.getState();
        const completedHouses = this.buildings.filter(b => b.buildingType === 'house' && b.isCompleted).length;
        const maxPop = 5 + (completedHouses * 5);
        const currentPop = this.units.filter(u => u instanceof Worker || u instanceof Warrior).length;
        
        const availableWorkers = this.units.filter(u => 
            u instanceof Worker && 
            !u.isConstructionJob && 
            u.workerState !== 'MOVING_TO_TRAIN'
        ).length;
        
        const workerCount = this.units.filter(u => u instanceof Worker).length;
        const warriorCount = this.units.filter(u => u instanceof Warrior).length;
        
        store.setPopulation(currentPop, maxPop, availableWorkers, workerCount, warriorCount);
        return { currentPop, maxPop, availableWorkers, workerCount, warriorCount };
    }

    private checkPopulationAndSpawn() {
        const { currentPop, maxPop, availableWorkers } = this.recalculatePopulation();
        const store = useGameStore.getState();

        if (currentPop < maxPop) {
            const stronghold = this.buildings.find(b => b.buildingType === 'stronghold');
            if (stronghold) {
                // Anti-stacking: Find a random walkable tile near the stronghold (radius 2)
                // Fallback to row + 2 if no tiles are available
                const spawnTile = this.gridManager.getRandomWalkableTileInRange(stronghold.gridX, stronghold.gridY, 2) 
                    || { col: stronghold.gridX, row: stronghold.gridY + 2 };

                const worker = new Worker({ 
                    scene: this.scene, 
                    col: spawnTile.col, 
                    row: spawnTile.row, 
                    texture: 'pawn-idle' 
                });
                this.addUnit(worker);
            }
        }
    }

    /**
     * Called when a building's construction completes.
     * Immediately recalculates population to reflect the new house.
     */
    private onBuildingCompleted(building: BaseBuilding) {
        // Force all workers assigned to this building to cancel and become IDLE immediately.
        // This ensures they are no longer marked as 'isConstructionJob' when we recalculate population.
        for (const unit of this.units) {
            if (unit instanceof Worker && unit.isConstructionJob && unit.assignedBuildingId === building.id) {
                unit.cancelBuilding();
                unit.setWorkerState('IDLE');
            }
        }
        this.recalculatePopulation();
    }

    // ══════════════════════════════════════════════════════════
    //  WANDERING AI
    // ══════════════════════════════════════════════════════════

    private processWanderingAI() {
        for (const unit of this.units) {
            if (unit.canWander && unit.idleTimer > unit.wanderDelay) {
                unit.idleTimer = 0; // Reset immediately to prevent rapid re-triggering

                let radius = 3;
                if (unit instanceof King) {
                    radius = 1;
                    unit.resetWanderDelay(15000, 20000);
                } else if (unit instanceof Warrior) {
                    radius = 5;
                    unit.resetWanderDelay(8000, 15000);
                } else if (unit instanceof Worker) {
                    unit.resetWanderDelay(5000, 10000);
                }

                const targetTile = this.gridManager.getRandomWalkableTileInRange(unit.gridX, unit.gridY, radius);
                
                if (targetTile) {
                    const startPos = { col: unit.gridX, row: unit.gridY };
                    this.gridManager.findPath(startPos, targetTile, (path) => {
                        // Check canWander again in case state changed during async pathfinding
                        if (path && unit.canWander) { 
                            unit.moveAlongPath(path);
                        }
                    });
                }
            }
        }
    }

    // ══════════════════════════════════════════════════════════
    //  AUTOMATIC JOB ASSIGNMENT
    // ══════════════════════════════════════════════════════════

    /**
     * Auto-assign idle workers to jobs based on a 3-tier priority system.
     */
    private assignIdleWorkers() {
        let idleWorkers = this.units.filter(
            u => u instanceof Worker && u.workerState === 'IDLE' && !(u as Worker).isConstructionJob && !(u as Worker).assignedHut
        ) as Worker[];

        if (idleWorkers.length === 0) return;

        // PRIORITY 1: Multi-Project Construction
        const unfinishedBuildings = this.buildings.filter(b => !b.isCompleted);
        
        for (const building of unfinishedBuildings) {
            let needed = building.availableBuilderSpots;
            if (needed <= 0) continue;

            idleWorkers.sort((a, b) => {
                const distA = Math.abs(a.gridX - building.gridX) + Math.abs(a.gridY - building.gridY);
                const distB = Math.abs(b.gridX - building.gridX) + Math.abs(b.gridY - building.gridY);
                return distA - distB;
            });

            const toAssign = idleWorkers.splice(0, needed);
            for (const worker of toAssign) {
                this.dispatchWorkerToBuilding(worker, building);
            }

            if (idleWorkers.length === 0) return;
        }

        // PRIORITY 2: Hut Automation
        const completedHuts = this.buildings.filter(b => 
            (b.buildingType === 'woodcutter_hut' || b.buildingType === 'gold_hut') && b.isCompleted
        ) as any[];

        for (const hut of completedHuts) {
            let needed = Math.max(0, hut.maxWorkers - hut.assignedWorkers.length);
            if (needed <= 0) continue;

            idleWorkers.sort((a, b) => {
                const distA = Math.abs(a.gridX - hut.gridX) + Math.abs(a.gridY - hut.gridY);
                const distB = Math.abs(b.gridX - hut.gridX) + Math.abs(b.gridY - hut.gridY);
                return distA - distB;
            });

            const toAssign = idleWorkers.splice(0, needed);
            for (const worker of toAssign) {
                this.dispatchWorkerToHut(worker, hut);
            }

            if (idleWorkers.length === 0) return;
        }

        // PRIORITY 3: Leftover idle workers will eventually trigger Wandering AI in processWanderingAI()
    }

    /**
     * Dispatch a worker to walk adjacent to a building and start constructing.
     */
    public dispatchWorkerToBuilding(worker: Worker, building: BaseBuilding) {
        const startPos = { col: worker.gridX, row: worker.gridY };
        
        // For multi-tile buildings, find adjacent to any tile in the footprint
        const adjTile = this.findAdjacentToBuilding(building, startPos);
        if (!adjTile) return;

        // Check if already adjacent
        const isAdjacent = this.isAdjacentToBuilding(worker, building);
        
        if (isAdjacent) {
            worker.startBuilding(building);
        } else {
            worker.isConstructionJob = true;
            this.gridManager.findPath(startPos, adjTile, (path) => {
                if (path) {
                    worker.moveAlongPath(path, () => {
                        if (!building.isCompleted) {
                            worker.startBuilding(building);
                        } else {
                            worker.cancelBuilding();
                            worker.setWorkerState('IDLE');
                        }
                    });
                } else {
                    worker.isConstructionJob = false;
                    worker.cancelBuilding();
                }
            });
        }
    }

    /**
     * Dispatch a worker to automate a Woodcutter's or Gold Hut.
     */
    public dispatchWorkerToHut(worker: Worker, hut: any) {
        const startPos = { col: worker.gridX, row: worker.gridY };
        const adjTile = this.findAdjacentToBuilding(hut, startPos);
        if (!adjTile) return;

        const isAdjacent = this.isAdjacentToBuilding(worker, hut);
        
        worker.startHutAutomation(hut);

        if (isAdjacent) {
            this.handleHutAutomationLoop(worker, hut);
        } else {
            this.gridManager.findPath(startPos, adjTile, (path) => {
                if (path && worker.assignedHut === hut) {
                    worker.moveAlongPath(path, () => {
                        if (worker.assignedHut === hut) {
                            this.handleHutAutomationLoop(worker, hut);
                        }
                    });
                } else {
                    worker.cancelHutAutomation();
                }
            });
        }
    }

    /**
     * Dispatch a worker to the Barracks for training.
     */
    public dispatchWorkerToTrain(worker: Worker, barracks: any) {
        worker.setWorkerState('MOVING_TO_TRAIN');
        this.recalculatePopulation(); // Update available workers
        
        // Add to queue immediately for UI feedback
        barracks.addWorkerToQueue(worker.id, 'warrior');

        const startPos = { col: worker.gridX, row: worker.gridY };
        const adjTile = this.findAdjacentToBuilding(barracks, startPos);
        
        if (!adjTile) {
            const index = barracks.trainingRecruits.findIndex((r: any) => r.workerId === worker.id);
            if (index !== -1) barracks.cancelQueueItem(index);
            return;
        }
        
        const isAdjacent = this.isAdjacentToBuilding(worker, barracks);
        
        if (isAdjacent) {
            worker.hideForTraining();
            barracks.startTrainingWorker(worker.id);
        } else {
            this.gridManager.findPath(startPos, adjTile, (path) => {
                // Check queue membership instead of workerState (moveAlongPath overrides state to 'MOVING')
                const stillInQueue = barracks.trainingRecruits.some((r: any) => r.workerId === worker.id);
                if (path && stillInQueue) {
                    worker.moveAlongPath(path, () => {
                        // On arrival: check queue membership again (could have been cancelled mid-walk)
                        const stillQueued = barracks.trainingRecruits.some((r: any) => r.workerId === worker.id);
                        if (stillQueued) {
                            worker.hideForTraining();
                            barracks.startTrainingWorker(worker.id);
                        }
                    });
                    // Re-apply MOVING_TO_TRAIN after moveAlongPath (which resets to 'MOVING')
                    worker.setWorkerState('MOVING_TO_TRAIN');
                } else {
                    // Pathfinding failed, cancel it
                    const index = barracks.trainingRecruits.findIndex((r: any) => r.workerId === worker.id);
                    if (index !== -1) {
                        barracks.cancelQueueItem(index);
                    }
                }
            });
        }
    }

    public handleHutAutomationLoop(worker: Worker, hut: any) {
        if (worker.assignedHut !== hut) return;
        
        const currentPos = { col: worker.gridX, row: worker.gridY };
        
        // Smart Resource Selection: Get all trees/stones, sort by distance, pick random from top 3
        const targetResourceType = hut.buildingType === 'gold_hut' ? 'gold' : 'wood';
        const validResources = this.resources.filter(r => r.resourceType === targetResourceType && r.currentHealth > 0);
        validResources.sort((a, b) => {
            const distA = Math.abs(a.gridX - hut.gridX) + Math.abs(a.gridY - hut.gridY);
            const distB = Math.abs(b.gridX - hut.gridX) + Math.abs(b.gridY - hut.gridY);
            return distA - distB;
        });

        const topResources = validResources.slice(0, 3);
        if (topResources.length === 0) {
            worker.setWorkerState('IDLE');
            return;
        }

        const resource = topResources[Math.floor(Math.random() * topResources.length)];

        // Stand Positions: Pick a random CARDINAL adjacent tile (no diagonal) for clean harvesting visuals
        const resourceAdj = this.gridManager.getRandomCardinalAdjacentWalkable(resource.gridX, resource.gridY) || 
                        this.gridManager.findCardinalAdjacentWalkable(resource.gridX, resource.gridY, currentPos);

        if (resourceAdj) {
            this.gridManager.findPath(currentPos, resourceAdj, (path) => {
                if (path && worker.assignedHut === hut) {
                    worker.moveAlongPath(path, () => {
                        if (worker.assignedHut === hut) {
                            worker.startGathering(resource);
                        }
                    });
                }
            });
        }
    }

    /**
     * Check if a worker is adjacent to any tile of a building's footprint.
     */
    private isAdjacentToBuilding(worker: Worker, building: BaseBuilding): boolean {
        for (let r = 0; r < building.footprint.height; r++) {
            for (let c = 0; c < building.footprint.width; c++) {
                const bCol = building.gridX + c;
                const bRow = building.gridY + r;
                if (Math.abs(worker.gridX - bCol) <= 1 && Math.abs(worker.gridY - bRow) <= 1) {
                    // Make sure it's not ON the building tile itself
                    if (worker.gridX !== bCol || worker.gridY !== bRow) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Find the best adjacent walkable tile next to any tile in the building's footprint.
     */
    private findAdjacentToBuilding(building: BaseBuilding, startPos: GridPosition): GridPosition | null {
        let bestTile: GridPosition | null = null;
        let bestDist = Infinity;

        for (let r = 0; r < building.footprint.height; r++) {
            for (let c = 0; c < building.footprint.width; c++) {
                const bCol = building.gridX + c;
                const bRow = building.gridY + r;
                const adj = this.gridManager.findAdjacentWalkable(bCol, bRow, startPos);
                if (adj) {
                    const dist = Math.abs(adj.col - startPos.col) + Math.abs(adj.row - startPos.row);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestTile = adj;
                    }
                }
            }
        }
        return bestTile;
    }

    // ══════════════════════════════════════════════════════════
    //  QUERY METHODS
    // ══════════════════════════════════════════════════════════

    public getResourceAt(col: number, row: number): BaseResource | undefined {
        return this.resources.find(r => r.gridX === col && r.gridY === row);
    }

    public getNearestBuilding(fromPos: GridPosition, type: BuildingType): BaseBuilding | undefined {
        const matching = this.buildings.filter(b => b.buildingType === type);
        if (matching.length === 0) return undefined;

        let nearest = matching[0];
        let minDist = Infinity;

        for (const b of matching) {
            const dist = Math.abs(b.gridX - fromPos.col) + Math.abs(b.gridY - fromPos.row);
            if (dist < minDist) {
                minDist = dist;
                nearest = b;
            }
        }
        return nearest;
    }

    /**
     * Find the nearest building that accepts a specific resource drop-off.
     */
    public getNearestDropOff(fromPos: GridPosition, resourceType: string): BaseBuilding | undefined {
        const matching = this.buildings.filter(b => b.isDropOff && b.isCompleted && b.acceptedResources.includes(resourceType));
        if (matching.length === 0) return undefined;

        let nearest = matching[0];
        let minDist = Infinity;

        for (const b of matching) {
            const dist = Math.abs(b.gridX - fromPos.col) + Math.abs(b.gridY - fromPos.row);
            if (dist < minDist) {
                minDist = dist;
                nearest = b;
            }
        }
        return nearest;
    }

    /**
     * Find the nearest unfinished building for construction assignment.
     */
    public getNearestUnfinishedBuilding(fromPos: GridPosition): BaseBuilding | undefined {
        const matching = this.buildings.filter(b => !b.isCompleted);
        if (matching.length === 0) return undefined;

        let nearest = matching[0];
        let minDist = Infinity;

        for (const b of matching) {
            const dist = Math.abs(b.gridX - fromPos.col) + Math.abs(b.gridY - fromPos.row);
            if (dist < minDist) {
                minDist = dist;
                nearest = b;
            }
        }
        return nearest;
    }

    public getNearestResource(fromPos: GridPosition, resourceType?: string): BaseResource | undefined {
        const matching = resourceType ? this.resources.filter(r => r.resourceType === resourceType && r.currentHealth > 0) : this.resources.filter(r => r.currentHealth > 0);
        if (matching.length === 0) return undefined;

        let nearest = matching[0];
        let minDist = Infinity;

        for (const r of matching) {
            const dist = Math.abs(r.gridX - fromPos.col) + Math.abs(r.gridY - fromPos.row);
            if (dist < minDist) {
                minDist = dist;
                nearest = r;
            }
        }
        return nearest;
    }
}
