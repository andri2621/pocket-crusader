import { Scene } from 'phaser';
import { EntityManager } from './EntityManager';
import { GridManager, TILE_SIZE, GRID_COLS, GRID_ROWS } from './GridManager';
import { BaseUnit } from '../entities/base/BaseUnit';
import { BaseResource } from '../entities/base/BaseResource';
import { BaseBuilding } from '../entities/base/BaseBuilding';
import { Worker } from '../entities/Worker';
import { House } from '../entities/House';
import { BuildingEntity } from '../entities/BuildingEntity';
import { useGameStore } from '../../store/useGameStore';

// Building definitions for ghost creation
const BUILDING_DEFS: Record<string, { texture: string; width: number; height: number; cost: number }> = {
    house: { texture: 'house1', width: 2, height: 2, cost: 30 },
    woodcutter_hut: { texture: 'house3', width: 1, height: 1, cost: 50 },
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
        
        if (def.width === 2 && def.height === 2) {
            this.ghostSprite.setOrigin(0.5, 0.9);
        } else {
            this.ghostSprite.setOrigin(0.5, 0.83);
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
        if (store.wood < def.cost) return false;
        store.addWood(-def.cost);

        if (this.buildType === 'house') {
            const house = new House({ scene: this.scene, col, row, texture: 'house1' });
            this.entityManager.addBuilding(house);
        } else if (this.buildType === 'woodcutter_hut') {
            const hut = new BuildingEntity({
                scene: this.scene, col, row,
                texture: 'house3',
                buildingType: 'woodcutter_hut'
            });
            this.entityManager.addBuilding(hut);
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

        // 1. Hit Test UI / Scene Elements
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

        // 2. Unit Selection Priority
        if (hitUnit) {
            this.selectUnit(hitUnit);
            return;
        }

        // 3. Resource Interaction Priority
        if (hitResource && this.selectedUnit instanceof Worker) {
            const resource = hitResource;
            const worker = this.selectedUnit as Worker;

            this.showTapIndicator(resource.gridX, resource.gridY);
            
            if (worker.isCarryingWood) {
                this.handleResourceCollected(worker, resource);
                return;
            }

            // Cancel any construction job or hut automation
            worker.cancelBuilding();
            worker.cancelHutAutomation();

            const startPos = { col: worker.gridX, row: worker.gridY };
            const isAdjacent = Math.abs(worker.gridX - resource.gridX) <= 1 && Math.abs(worker.gridY - resource.gridY) <= 1;

            if (isAdjacent) {
                worker.startChopping(resource);
            } else {
                const adjTile = this.gridManager.findAdjacentWalkable(resource.gridX, resource.gridY, startPos);
                if (adjTile) {
                    this.gridManager.findPath(startPos, adjTile, (path) => {
                        if (path) {
                            worker.moveAlongPath(path, () => {
                                worker.startChopping(resource);
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
                                if (worker.isCarryingWood) {
                                    worker.depositResource();
                                }
                                
                                // Auto-chop loop: Find the nearest tree and chop it
                                const currentPos = { col: worker.gridX, row: worker.gridY };
                                const nearestTree = this.entityManager.getNearestResource(currentPos, 'wood');
                                
                                if (nearestTree) {
                                    const treeAdj = this.gridManager.findAdjacentWalkable(nearestTree.gridX, nearestTree.gridY, currentPos);
                                    if (treeAdj) {
                                        this.gridManager.findPath(currentPos, treeAdj, (treePath) => {
                                            if (treePath) {
                                                worker.moveAlongPath(treePath, () => {
                                                    worker.startChopping(nearestTree);
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

                const startPos = { col: this.selectedUnit.gridX, row: this.selectedUnit.gridY };
                this.gridManager.findPath(startPos, targetPos, (path) => {
                    if (path && this.selectedUnit) {
                        this.selectedUnit.moveAlongPath(path);
                    }
                });
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
    }

    public deselectUnit() {
        if (this.selectedUnit) {
            this.selectedUnit.setSelected(false);
            this.selectedUnit = null;
        }
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
    private handleResourceCollected(worker: Worker, nextTargetTree?: BaseResource) {
        const currentPos = { col: worker.gridX, row: worker.gridY };
        
        // Find nearest drop-off point, prioritizing assigned hut if automating
        const dropOff = worker.assignedHut || this.entityManager.getNearestDropOff(currentPos);
        if (!dropOff) return;

        const adjTile = this.gridManager.findAdjacentWalkable(dropOff.gridX, dropOff.gridY, currentPos);
        if (adjTile) {
            this.gridManager.findPath(currentPos, adjTile, (path) => {
                if (path) {
                    worker.moveAlongPath(path, () => {
                        worker.depositResource();

                        // Auto-chop loop: Find the next tree to chop
                        const treeToChop = nextTargetTree || this.entityManager.getNearestResource({ col: worker.gridX, row: worker.gridY }, 'wood');
                        if (treeToChop) {
                            const newStart = { col: worker.gridX, row: worker.gridY };
                            const treeAdj = this.gridManager.findAdjacentWalkable(treeToChop.gridX, treeToChop.gridY, newStart);
                            if (treeAdj) {
                                this.gridManager.findPath(newStart, treeAdj, (treePath) => {
                                    if (treePath) {
                                        worker.moveAlongPath(treePath, () => {
                                            worker.startChopping(treeToChop);
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
