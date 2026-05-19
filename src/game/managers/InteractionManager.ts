import { Scene } from 'phaser';
import { EntityManager } from './EntityManager';
import { GridManager, TILE_SIZE, GRID_COLS, GRID_ROWS } from './GridManager';
import { BaseUnit } from '../entities/base/BaseUnit';
import { BaseResource } from '../entities/base/BaseResource';
import { BaseBuilding } from '../entities/base/BaseBuilding';
import { Worker } from '../entities/Worker';
import { Warrior } from '../entities/Warrior';
import { House } from '../entities/House';
import { BuildingEntity } from '../entities/BuildingEntity';
import { GoldHut } from '../entities/GoldHut';
import { Barracks } from '../entities/Barracks';
import { useGameStore } from '../../store/useGameStore';

// Building definitions for ghost creation
const BUILDING_DEFS: Record<string, { texture: string; width: number; height: number; cost: number; goldCost?: number; scale?: number }> = {
    house: { texture: 'house1', width: 2, height: 2, cost: 30 },
    woodcutter_hut: { texture: 'hut', width: 1, height: 1, cost: 50, scale: 0.6 },
    gold_hut: { texture: 'gold_hut', width: 1, height: 1, cost: 50, scale: 0.6 },
    barracks: { texture: 'barracks', width: 2, height: 2, cost: 50, goldCost: 50, scale: 0.76 },
};

export class InteractionManager {
    private scene: Scene;
    private entityManager: EntityManager;
    private gridManager: GridManager;
    
    private selectedUnit: BaseUnit | null = null;
    private tapIndicator: Phaser.GameObjects.Graphics;

    // ── Build Mode State ──────────────────────────────────────
    private isBuildMode: boolean = false;
    private buildType: string | null = null;
    private ghostSprite: Phaser.GameObjects.Image | null = null;
    private ghostOverlay: Phaser.GameObjects.Graphics | null = null;
    private ghostGridCol: number = -1;
    private ghostGridRow: number = -1;
    private ghostValid: boolean = false;
    private pointerDown: boolean = false;

    constructor(scene: Scene, entityManager: EntityManager, gridManager: GridManager) {
        this.scene = scene;
        this.entityManager = entityManager;
        this.gridManager = gridManager;

        this.tapIndicator = this.scene.add.graphics();
        this.tapIndicator.setDepth(5);

        // Listen for force-deselect events (e.g. after disband)
        this.scene.events.on('force_deselect_unit', (unitId?: string) => {
            if (!unitId || (this.selectedUnit && this.selectedUnit.id === unitId)) {
                this.selectedUnit = null;
                useGameStore.getState().setSelectedUnit(null, null);
            }
        });

        this.scene.events.on('resource_collected', (worker: Worker) => {
            this.handleResourceCollected(worker);
        });

        this.setupInput();
        this.pollBuildModeFromStore();
    }

    // ══════════════════════════════════════════════════════════
    //  BUILD MODE — Ghost & Placement
    // ══════════════════════════════════════════════════════════

    /**
     * Poll the Zustand store each frame to detect when React UI triggers build mode.
     */
    private pollBuildModeFromStore() {
        this.scene.events.on('update', () => {
            const store = useGameStore.getState();
            const placing = store.isPlacingBuilding;

            if (placing && !this.isBuildMode) {
                this.enterBuildMode(placing);
            } else if (!placing && this.isBuildMode) {
                this.exitBuildMode(false);
            }
        });
    }

    public enterBuildMode(buildingType: string) {
        if (this.isBuildMode) this.exitBuildMode();

        const def = BUILDING_DEFS[buildingType];
        if (!def) return;

        this.isBuildMode = true;
        this.buildType = buildingType;
        this.deselectUnit();

        this.ghostSprite = this.scene.add.image(0, 0, def.texture);
        this.ghostSprite.setAlpha(0.6);
        this.ghostSprite.setDepth(50);
        this.ghostSprite.setOrigin(0.5, 0.9);
        
        if (def.scale) {
            this.ghostSprite.setScale(def.scale);
        }

        this.ghostOverlay = this.scene.add.graphics();
        this.ghostOverlay.setDepth(49);

        this.ghostSprite.setVisible(false);
        this.ghostOverlay.setVisible(false);

        const store = useGameStore.getState();
        if (store.isPlacingBuilding !== buildingType) {
            store.setPlacingBuilding(buildingType);
        }
    }

    public exitBuildMode(clearStore: boolean = true) {
        this.isBuildMode = false;
        this.buildType = null;
        this.ghostGridCol = -1;
        this.ghostGridRow = -1;
        this.ghostValid = false;
        this.pointerDown = false;

        if (this.ghostSprite) {
            this.ghostSprite.destroy();
            this.ghostSprite = null;
        }
        if (this.ghostOverlay) {
            this.ghostOverlay.destroy();
            this.ghostOverlay = null;
        }

        if (clearStore) {
            useGameStore.getState().setPlacingBuilding(null);
        }
    }

    public updateGhost() {
        if (!this.isBuildMode || !this.ghostSprite || !this.buildType) return;

        const def = BUILDING_DEFS[this.buildType];
        if (!def) return;

        const pointer = this.scene.input.activePointer;
        const isMobile = !this.scene.sys.game.device.os.desktop;
        if (isMobile && !this.pointerDown) return;

        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const grid = this.gridManager.pixelToGrid(worldPoint.x, worldPoint.y);
        const snappedCol = Math.max(0, Math.min(grid.col, GRID_COLS - def.width));
        const snappedRow = Math.max(0, Math.min(grid.row, GRID_ROWS - def.height));

        if (snappedCol !== this.ghostGridCol || snappedRow !== this.ghostGridRow) {
            this.ghostGridCol = snappedCol;
            this.ghostGridRow = snappedRow;
            this.ghostValid = this.gridManager.isAreaAvailable(snappedCol, snappedRow, def.width, def.height);

            if (def.width === 2 && def.height === 2) {
                this.ghostSprite!.setPosition(
                    snappedCol * TILE_SIZE + TILE_SIZE,
                    snappedRow * TILE_SIZE + TILE_SIZE * 2
                );
            } else {
                const pos = this.gridManager.getTileBottomCenter(snappedCol, snappedRow);
                this.ghostSprite!.setPosition(pos.x, pos.y);
            }

            const tintColor = this.ghostValid ? 0x00ff00 : 0xff0000;
            this.ghostSprite!.setTint(tintColor);
            this.drawFootprintOverlay(snappedCol, snappedRow, def.width, def.height, this.ghostValid);
        }

        this.ghostSprite!.setVisible(true);
        this.ghostOverlay!.setVisible(true);
    }

    private drawFootprintOverlay(col: number, row: number, width: number, height: number, valid: boolean) {
        if (!this.ghostOverlay) return;
        this.ghostOverlay.clear();

        const fillColor = valid ? 0x00ff00 : 0xff0000;
        const strokeColor = valid ? 0x00ff00 : 0xff0000;

        this.ghostOverlay.fillStyle(fillColor, 0.25);
        this.ghostOverlay.fillRect(col * TILE_SIZE, row * TILE_SIZE, width * TILE_SIZE, height * TILE_SIZE);

        this.ghostOverlay.lineStyle(2, strokeColor, 0.8);
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                this.ghostOverlay.strokeRect(
                    (col + c) * TILE_SIZE + 1, (row + r) * TILE_SIZE + 1,
                    TILE_SIZE - 2, TILE_SIZE - 2
                );
            }
        }
    }

    private tryPlaceBuilding(): boolean {
        if (!this.isBuildMode || !this.buildType || !this.ghostValid) return false;

        const def = BUILDING_DEFS[this.buildType];
        if (!def) return false;

        const col = this.ghostGridCol;
        const row = this.ghostGridRow;

        const store = useGameStore.getState();
        const faction = store.faction || 'blue';
        const roomId = store.roomId;

        if (store.wood < def.cost) return false;
        if (def.goldCost && store.gold < def.goldCost) return false;

        store.addWood(-def.cost);
        if (def.goldCost) store.addGold(-def.goldCost);

        const newBuildingId = `building_${faction}_${Date.now()}`;

        // Multiplayer Sync Emission
        const activeSocket = (this.scene as any).socket || this.scene.game.registry.get('socket');
        if (activeSocket && roomId) {
            console.log(`[InteractionManager Sync] Emitting build event for ${this.buildType} at [Col:${col}, Row:${row}] with ID ${newBuildingId}`);
            activeSocket.emit('client_build_structure', {
                roomId: String(roomId).trim(),
                type: this.buildType,
                col,
                row,
                entityId: newBuildingId,
                faction
            });
        }

        if (this.buildType === 'house') {
            const house = new House({ scene: this.scene, col, row, texture: 'house1', faction, id: newBuildingId });
            this.entityManager.addBuilding(house);
        } else if (this.buildType === 'woodcutter_hut') {
            const hut = new BuildingEntity({
                scene: this.scene, col, row,
                texture: 'hut',
                buildingType: 'woodcutter_hut',
                faction,
                id: newBuildingId
            });
            this.entityManager.addBuilding(hut);
        } else if (this.buildType === 'gold_hut') {
            const hut = new GoldHut({
                scene: this.scene, col, row,
                texture: 'gold_hut',
                buildingType: 'gold_hut',
                faction,
                id: newBuildingId
            });
            this.entityManager.addBuilding(hut);
        } else if (this.buildType === 'barracks') {
            const barracks = new Barracks({
                scene: this.scene, col, row,
                texture: 'barracks',
                faction,
                id: newBuildingId
            });
            this.entityManager.addBuilding(barracks);
        }

        this.gridManager.blockArea(col, row, def.width, def.height);
        this.exitBuildMode();
        return true;
    }

    // ══════════════════════════════════════════════════════════
    //  INPUT HANDLING
    // ══════════════════════════════════════════════════════════

    private setupInput() {
        const TAP_THRESHOLD = 10;

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 2 && this.isBuildMode) {
                this.exitBuildMode();
                return;
            }
            if (this.isBuildMode && pointer.button === 0) {
                this.pointerDown = true;
                this.updateGhost();
            }
        });

        this.scene.input.on('pointermove', (_pointer: Phaser.Input.Pointer) => {
            // Ghost tracking handled in updateGhost() from scene update loop
        });

        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isBuildMode) {
                if (pointer.button === 0) {
                    this.tryPlaceBuilding();
                    this.pointerDown = false;
                }
                return; // Block ALL other interactions during build mode
            }

            const distance = Phaser.Math.Distance.Between(
                pointer.downX, pointer.downY,
                pointer.upX, pointer.upY
            );

            if (distance < TAP_THRESHOLD) {
                this.handleTap(pointer);
            }
        });

        // Disable context menu on the canvas to allow right-click
        this.scene.game.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    private handleTap(pointer: Phaser.Input.Pointer) {
        if (this.isBuildMode) return;

        // Hit Test Elements
        const hitObjects = this.scene.input.hitTestPointer(pointer);
        
        let hitUnit: BaseUnit | null = null;
        let hitResource: BaseResource | null = null;
        let hitBuilding: BaseBuilding | null = null;

        for (const obj of hitObjects) {
            if (obj instanceof BaseUnit) {
                hitUnit = obj;
                break;
            }
            if (obj instanceof BaseResource) {
                hitResource = obj;
            }
            if (obj instanceof BaseBuilding) {
                hitBuilding = obj;
            }
        }

        // Handle Building Selection
        const store = useGameStore.getState();
        const localFaction = store.faction || 'blue';

        if (hitBuilding) {
            // Faction Select Lock: Only allow selecting our own buildings
            if (hitBuilding.faction !== localFaction) {
                return;
            }
            store.setSelectedBuilding(hitBuilding.id, hitBuilding.buildingType);
            
            // If it's a barracks, also sync its queue immediately
            if (hitBuilding instanceof Barracks) {
                const b = hitBuilding as any;
                const uiQueue = b.trainingRecruits.map((r: any) => r.unitType);
                store.setTrainingState(uiQueue, b.currentTrainingProgress);
            } else {
                store.setTrainingState([], 0);
            }
        } else {
            if (store.selectedBuildingId) {
                store.setSelectedBuilding(null, null);
                store.setTrainingState([], 0);
            }
        }

        // 2. Unit Selection Priority
        if (hitUnit) {
            // Faction Select Lock: Only allow selecting our own units
            if (hitUnit.faction !== localFaction) {
                return;
            }
            this.selectUnit(hitUnit);
            return;
        }

        // 3. Resource Interaction Priority
        if (hitResource && this.selectedUnit instanceof Worker) {
            const resource = hitResource;
            const worker = this.selectedUnit as Worker;

            this.showTapIndicator(resource.gridX, resource.gridY);
            
            // If already carrying the same resource type, maybe full, so go deposit then come back to gather this
            if (worker.carriedAmount > 0 && worker.carriedResourceType === resource.resourceType) {
                this.handleResourceCollected(worker, resource);
                return;
            }

            // Cancel any construction job or hut automation
            worker.cancelBuilding();
            worker.cancelHutAutomation();

            const startPos = { col: worker.gridX, row: worker.gridY };
            // Cardinal-only check: worker must be exactly up/down/left/right of resource
            const dx = Math.abs(worker.gridX - resource.gridX);
            const dy = Math.abs(worker.gridY - resource.gridY);
            const isCardinalAdjacent = (dx + dy === 1);

            if (isCardinalAdjacent) {
                worker.startGathering(resource);

                // Sync gathering immediately
                const activeSocket = (this.scene as any).socket || this.scene.game.registry.get('socket');
                const store = useGameStore.getState();
                if (activeSocket && store.roomId) {
                    activeSocket.emit('client_start_gathering', {
                        roomId: String(store.roomId).trim(),
                        entityId: worker.id,
                        resourceX: resource.gridX,
                        resourceY: resource.gridY,
                        resourceType: resource.resourceType
                    });
                }
            } else {
                const adjTile = this.gridManager.findCardinalAdjacentWalkable(resource.gridX, resource.gridY, startPos);
                if (adjTile) {
                    // Sync walking to resource node
                    const activeSocket = (this.scene as any).socket || this.scene.game.registry.get('socket');
                    const store = useGameStore.getState();
                    if (activeSocket && store.roomId) {
                        activeSocket.emit('client_unit_move', {
                            roomId: String(store.roomId).trim(),
                            entityId: worker.id,
                            targetCol: adjTile.col,
                            targetRow: adjTile.row
                        });
                        activeSocket.emit('client_start_gathering', {
                            roomId: String(store.roomId).trim(),
                            entityId: worker.id,
                            resourceX: resource.gridX,
                            resourceY: resource.gridY,
                            resourceType: resource.resourceType
                        });
                    }

                    this.gridManager.findPath(startPos, adjTile, (path) => {
                        if (path) {
                            worker.moveAlongPath(path, () => {
                                worker.startGathering(resource);
                            });
                        }
                    });
                }
            }
            return;
        }

        // 3.5. Building Interaction Priority
        if (hitBuilding && this.selectedUnit instanceof Worker) {
            const worker = this.selectedUnit as Worker;
            const building = hitBuilding;

            this.showTapIndicator(building.gridX, building.gridY);
            
            // Cancel any existing job before reassigning
            worker.cancelBuilding();
            worker.cancelHutAutomation();

            // CASE A: Unfinished building → manual build order
            if (!building.isCompleted) {
                this.entityManager.dispatchWorkerToBuilding(worker, building);
                return;
            }

            // CASE B: Drop-off building (Stronghold, Woodcutter Hut) → deposit + auto-chop
            if (building.isDropOff) {
                const startPos = { col: worker.gridX, row: worker.gridY };
                const adjTile = this.gridManager.findAdjacentWalkable(building.gridX, building.gridY, startPos);

                if (adjTile) {
                    this.gridManager.findPath(startPos, adjTile, (path) => {
                        if (path) {
                            worker.moveAlongPath(path, () => {
                                if (worker.carriedAmount > 0) {
                                    worker.depositResource();
                                }
                                
                                // Auto-gather loop: Find the nearest resource matching the drop-off
                                const currentPos = { col: worker.gridX, row: worker.gridY };
                                // Prioritize gold if it's a gold hut, else wood (since strongholds accept all, we default to wood unless they were mining)
                                const targetResourceType = building.buildingType === 'gold_hut' ? 'gold' : 'wood';
                                const nearestResource = this.entityManager.getNearestResource(currentPos, targetResourceType);
                                
                                if (nearestResource) {
                                    const resAdj = this.gridManager.findCardinalAdjacentWalkable(nearestResource.gridX, nearestResource.gridY, currentPos);
                                    if (resAdj) {
                                        this.gridManager.findPath(currentPos, resAdj, (resPath) => {
                                            if (resPath) {
                                                worker.moveAlongPath(resPath, () => {
                                                    worker.startGathering(nearestResource);
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
                return;
            }

            // CASE C: Completed non-drop-off building (e.g., finished House) → just walk to it
            const startPos = { col: worker.gridX, row: worker.gridY };
            const adjTile = this.gridManager.findAdjacentWalkable(building.gridX, building.gridY, startPos);
            if (adjTile) {
                this.gridManager.findPath(startPos, adjTile, (path) => {
                    if (path) {
                        worker.moveAlongPath(path);
                    }
                });
            }
            return;
        }

        // 4. Ground Click (Movement)
        if (this.selectedUnit) {
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const targetPos = this.gridManager.pixelToGrid(worldX, worldY);

            if (this.gridManager.isTileWalkable(targetPos.col, targetPos.row)) {
                this.showTapIndicator(targetPos.col, targetPos.row);
                
                // Cancel jobs if manually moving
                if (this.selectedUnit instanceof Worker) {
                    (this.selectedUnit as Worker).cancelBuilding();
                    (this.selectedUnit as Worker).cancelHutAutomation();
                }

                // PULL ROOMID AND FACTION FROM ZUSTAND
                const { roomId, faction } = useGameStore.getState();

                console.log("[Client Click] Ground clicked. Selected Unit:", this.selectedUnit?.id);
                console.log("[Client Click] Room ID status:", roomId, "Faction:", faction);

                if (!roomId || !this.selectedUnit) {
                    console.warn("[Client Click] Aborted. Missing Room ID or no Unit selected.");
                    return;
                }

                // Execute local movement pathfinding
                this.selectedUnit.moveToGrid(targetPos.col, targetPos.row);

                // Dynamically ensure we use the scene's inherited socket
                const activeSocket = (this.scene as any).socket || this.scene.game.registry.get('socket');

                if (activeSocket) {
                    console.log(`[InteractionManager Sync] Actively emitting via aligned Socket ID: ${activeSocket.id}`);
                    activeSocket.emit('client_unit_move', {
                        roomId: String(roomId).trim(),
                        entityId: this.selectedUnit.id,
                        targetCol: targetPos.col,
                        targetRow: targetPos.row
                    });
                } else {
                    console.error("[InteractionManager Fatal] No valid socket instance found on scene or registry!");
                }
            } else {
                this.deselectUnit();
            }
        }
    }

    private selectUnit(unit: BaseUnit) {
        if (this.selectedUnit === unit) {
            this.deselectUnit();
            return;
        }
        
        this.deselectUnit();
        this.selectedUnit = unit;
        unit.setSelected(true);

        // Sync to React store
        const unitType = unit instanceof Warrior ? 'warrior' : unit instanceof Worker ? 'worker' : 'unit';
        useGameStore.getState().setSelectedUnit(unit.id, unitType);
    }

    public deselectUnit() {
        if (this.selectedUnit) {
            // Guard: only call setSelected if the object hasn't been destroyed
            try { this.selectedUnit.setSelected(false); } catch (_e) { /* destroyed */ }
            this.selectedUnit = null;
        }
        useGameStore.getState().setSelectedUnit(null, null);
    }

    private showTapIndicator(col: number, row: number) {
        const pixelPos = this.gridManager.getTileCenter(col, row);
        
        this.tapIndicator.clear();
        this.tapIndicator.lineStyle(2, 0xffd700, 0.9);
        this.tapIndicator.strokeCircle(pixelPos.x, pixelPos.y, 12);
        this.tapIndicator.fillStyle(0xffd700, 0.3);
        this.tapIndicator.fillCircle(pixelPos.x, pixelPos.y, 8);

        this.scene.tweens.add({
            targets: this.tapIndicator,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                this.tapIndicator.clear();
                this.tapIndicator.setAlpha(1);
            }
        });
    }

    /**
     * Handle resource collection: find nearest DROP-OFF building (isDropOff=true) to deposit.
     * Uses isDropOff flag instead of hardcoded building type.
     */
    private handleResourceCollected(worker: Worker, nextTargetResource?: BaseResource) {
        const currentPos = { col: worker.gridX, row: worker.gridY };
        const rType = worker.carriedResourceType || 'wood';
        
        // Find nearest drop-off point, prioritizing assigned hut if automating
        const dropOff = worker.assignedHut || this.entityManager.getNearestDropOff(currentPos, rType, worker.faction);
        if (!dropOff) return;

        const adjTile = this.gridManager.findAdjacentWalkable(dropOff.gridX, dropOff.gridY, currentPos);
        if (adjTile) {
            this.gridManager.findPath(currentPos, adjTile, (path) => {
                if (path) {
                    worker.moveAlongPath(path, () => {
                        worker.depositResource();

                        // Auto-gather loop: Find the next resource
                        const resToGather = nextTargetResource || this.entityManager.getNearestResource({ col: worker.gridX, row: worker.gridY }, rType);
                        if (resToGather) {
                            const newStart = { col: worker.gridX, row: worker.gridY };
                            const resAdj = this.gridManager.findCardinalAdjacentWalkable(resToGather.gridX, resToGather.gridY, newStart);
                            if (resAdj) {
                                this.gridManager.findPath(newStart, resAdj, (resPath) => {
                                    if (resPath) {
                                        worker.moveAlongPath(resPath, () => {
                                            worker.startGathering(resToGather);
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    }

    // ── Public getters ──
    public get isInBuildMode(): boolean {
        return this.isBuildMode;
    }
}
