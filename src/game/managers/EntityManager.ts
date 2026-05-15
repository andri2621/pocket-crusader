import { Scene } from 'phaser';
import { BaseUnit } from '../entities/base/BaseUnit';
import { BaseBuilding } from '../entities/base/BaseBuilding';
import { BaseResource } from '../entities/base/BaseResource';
import { GridPosition, BuildingType } from '../../types/game';
import { GridManager } from './GridManager';
import { useGameStore } from '../../store/useGameStore';
import { Worker } from '../entities/Worker';
import { King } from '../entities/King';

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
    }

    public addUnit(unit: BaseUnit) {
        this.units.push(unit);
        if (unit instanceof Worker) {
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
        this.spawnTimer += delta;
        if (this.spawnTimer >= 10000) {
            this.spawnTimer = 0;
            this.checkPopulationAndSpawn();
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
        const workers = this.units.filter(u => u instanceof Worker).length;
        store.setPopulation(workers, maxPop);
        return { workers, maxPop };
    }

    private checkPopulationAndSpawn() {
        const { workers, maxPop } = this.recalculatePopulation();
        const store = useGameStore.getState();

        if (workers < maxPop) {
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
                store.setPopulation(workers + 1, maxPop);
            }
        }
    }

    /**
     * Called when a building's construction completes.
     * Immediately recalculates population to reflect the new house.
     */
    private onBuildingCompleted(building: BaseBuilding) {
        if (building.buildingType === 'house') {
            this.recalculatePopulation();
        }
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
     * Auto-assign idle workers to the nearest unfinished building.
     */
    private assignIdleWorkers() {
        const unfinished = this.buildings.filter(b => !b.isCompleted);
        if (unfinished.length === 0) return;

        const idleWorkers = this.units.filter(
            u => u instanceof Worker && u.workerState === 'IDLE' && !(u as Worker).isConstructionJob
        ) as Worker[];

        for (const worker of idleWorkers) {
            const workerPos = { col: worker.gridX, row: worker.gridY };
            const nearestBuilding = this.getNearestUnfinishedBuilding(workerPos);
            if (!nearestBuilding) continue;

            this.dispatchWorkerToBuilding(worker, nearestBuilding);
        }
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
     * Find the nearest building that accepts resource drop-offs.
     */
    public getNearestDropOff(fromPos: GridPosition): BaseBuilding | undefined {
        const matching = this.buildings.filter(b => b.isDropOff && b.isCompleted);
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
