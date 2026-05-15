import { Scene } from 'phaser';
import { EntityManager } from './EntityManager';
import { GridManager } from './GridManager';
import { BaseUnit } from '../entities/base/BaseUnit';
import { BaseResource } from '../entities/base/BaseResource';
import { BaseBuilding } from '../entities/base/BaseBuilding';
import { Worker } from '../entities/Worker';
import { useGameStore } from '../../store/useGameStore';
import { GameScene } from '../scenes/GameScene';

export class InteractionManager {
    private scene: Scene;
    private entityManager: EntityManager;
    private gridManager: GridManager;
    
    private selectedUnit: BaseUnit | null = null;
    private tapIndicator: Phaser.GameObjects.Graphics;

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
    }

    private setupInput() {
        const TAP_THRESHOLD = 10;
        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const distance = Phaser.Math.Distance.Between(
                pointer.downX, pointer.downY,
                pointer.upX, pointer.upY
            );

            if (distance < TAP_THRESHOLD) {
                this.handleTap(pointer);
            }
        });
    }

    private handleTap(pointer: Phaser.Input.Pointer) {
        // 0. Intercept Building Placement
        const store = useGameStore.getState();
        if (store.isPlacingBuilding) {
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const targetPos = this.gridManager.pixelToGrid(worldX, worldY);
            if (this.scene instanceof GameScene) {
                (this.scene as GameScene).tryPlaceBuilding(targetPos.col, targetPos.row);
            }
            return;
        }

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
                // If carrying wood, deposit first, then chop this specific tree
                this.handleResourceCollected(worker, resource);
                return;
            }

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

            // Optional: Check if the worker is carrying wood or just want to walk to the building
            this.showTapIndicator(building.gridX, building.gridY);
            
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

        // 4. Ground Click (Movement)
        if (this.selectedUnit) {
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const targetPos = this.gridManager.pixelToGrid(worldX, worldY);

            if (this.gridManager.isTileWalkable(targetPos.col, targetPos.row)) {
                this.showTapIndicator(targetPos.col, targetPos.row);
                
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

    private handleResourceCollected(worker: Worker, nextTargetTree?: BaseResource) {
        const currentPos = { col: worker.gridX, row: worker.gridY };
        const hut = this.entityManager.getNearestBuilding(currentPos, 'woodcutter_hut');
        if (!hut) return; // No hut to deposit

        const hutAdj = this.gridManager.findAdjacentWalkable(hut.gridX, hut.gridY, currentPos);
        if (hutAdj) {
            this.gridManager.findPath(currentPos, hutAdj, (path) => {
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
}
