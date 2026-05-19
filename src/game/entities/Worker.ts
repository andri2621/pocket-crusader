import { BaseUnit } from './base/BaseUnit';
import { UnitConfig } from '../../types/entity.types';
import { WorkerState } from '../../types/game';
import { BaseResource } from './base/BaseResource';
import { BaseBuilding } from './base/BaseBuilding';
import { BuildingEntity } from './BuildingEntity';
import { useGameStore } from '../../store/useGameStore';

export class Worker extends BaseUnit {
    private isCarrying: boolean = false;
    public carriedResourceType: 'wood' | 'gold' | null = null;
    public carriedAmount: number = 0;
    private gatherTimer: Phaser.Time.TimerEvent | null = null;
    private targetResource: BaseResource | null = null;

    // ── Construction State ─────────────────────────────────
    private buildTimer: Phaser.Time.TimerEvent | null = null;
    private targetBuilding: BaseBuilding | null = null;
    public assignedBuildingId: string | null = null;
    public isConstructionJob: boolean = false;

    // ── Automation State ───────────────────────────────────
    public assignedHut: BuildingEntity | null = null;

    public get isCarryingWood(): boolean {
        return this.isCarrying;
    }

    public override get canWander(): boolean {
        // Workers should not wander if they are assigned to a construction job,
        // carrying wood, assigned to automate a hut, or walking to barracks.
        return this.workerState === 'IDLE' && !this.isConstructionJob && !this.isCarrying && !this.assignedHut;
    }

    public getTargetResource(): BaseResource | null {
        return this.targetResource;
    }

    public getTargetBuilding(): BaseBuilding | null {
        return this.targetBuilding;
    }

    public setTargetResource(res: BaseResource | null): void {
        this.targetResource = res;
    }

    public setTargetBuilding(b: BaseBuilding | null): void {
        this.targetBuilding = b;
    }

    public cancelGathering(): void {
        if (this.gatherTimer) {
            this.gatherTimer.destroy();
            this.gatherTimer = null;
        }
        this.targetResource = null;
    }

    public override moveToGrid(targetCol: number, targetRow: number, onArrival?: () => void): void {
        this.cancelBuilding();
        this.cancelGathering();
        super.moveToGrid(targetCol, targetRow, onArrival);
    }

    public override update(time: number, delta: number): void {
        super.update(time, delta);

        if (this.isMoving) {
            return;
        }

        // Force active animations to play to prevent standing still bugs
        if (this.workerState === 'CONSTRUCTING') {
            const animKey = `${this.texturePrefix}-build`;
            if (this.mainSprite.anims.currentAnim?.key !== animKey) {
                this.mainSprite.play(animKey, true);
            }
        } else if (this.workerState === 'CHOPPING') {
            const animKey = `${this.texturePrefix}-chop`;
            if (this.mainSprite.anims.currentAnim?.key !== animKey) {
                this.mainSprite.play(animKey, true);
            }
        } else if (this.workerState === 'MINING') {
            const animKey = `${this.texturePrefix}-mine`;
            if (this.mainSprite.anims.currentAnim?.key !== animKey) {
                this.mainSprite.play(animKey, true);
            }
        }
    }

    constructor(config: UnitConfig) {
        super(config);
        
        // Randomize speed slightly (145 to 165)
        this.speed = 145 + Math.random() * 20;

        this.mainSprite.play(`${this.texturePrefix}-idle`);
        
        // Pawn sprites are 192x192 with the character in the center 64x64.
        // To place their feet at the bottom of the container (Y=0), origin must be 128/192
        this.mainSprite.setOrigin(0.5, 128 / 192);
        
        // Setup hitbox for worker in local container space.
        // Container origin is bottom-center of the tile (0,0).
        // 64x64 hitbox above the bottom center: X: -32 to 32, Y: -64 to 0
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );

        // Workers wander every 5-10 seconds
        this.resetWanderDelay(5000, 10000);
    }

    protected override onStateChange(newState: WorkerState): void {
        // Stop phantom gathering if we change state away from CHOPPING or MINING
        if (newState !== 'CHOPPING' && newState !== 'MINING' && this.gatherTimer) {
            this.gatherTimer.destroy();
            this.gatherTimer = null;
            this.targetResource = null;
        }

        // Stop construction if we change state away from CONSTRUCTING
        if (newState !== 'CONSTRUCTING' && this.buildTimer) {
            this.buildTimer.destroy();
            this.buildTimer = null;
            this.targetBuilding = null;
        }

        // Clear construction job flag when going fully idle (not transitioning)
        if (newState === 'IDLE' && !this.isConstructionJob) {
            // Normal idle
        }

        switch (newState) {
            case 'IDLE':
                if (this.isConstructionJob) {
                    this.mainSprite.play(`${this.texturePrefix}-idle-hammer`);
                } else if (this.isCarrying && this.carriedResourceType === 'wood') {
                    this.mainSprite.play(`${this.texturePrefix}-idle-wood`);
                } else if (this.isCarrying && this.carriedResourceType === 'gold') {
                    this.mainSprite.play(`${this.texturePrefix}-idle-gold`);
                } else if (this.assignedHut) {
                    // Check hut type if we have multiple hut types later, for now axe/pickaxe
                    if (this.assignedHut.buildingType === 'gold_hut') {
                        this.mainSprite.play(`${this.texturePrefix}-idle-pickaxe`);
                    } else {
                        this.mainSprite.play(`${this.texturePrefix}-idle-axe`);
                    }
                } else {
                    this.mainSprite.play(`${this.texturePrefix}-idle`);
                }
                break;
            case 'MOVING':
                if (this.isConstructionJob) {
                    this.mainSprite.play(`${this.texturePrefix}-run-hammer`);
                } else if (this.isCarrying && this.carriedResourceType === 'wood') {
                    this.mainSprite.play(`${this.texturePrefix}-run-wood`);
                } else if (this.isCarrying && this.carriedResourceType === 'gold') {
                    this.mainSprite.play(`${this.texturePrefix}-run-gold`);
                } else if (this.assignedHut) {
                    if (this.assignedHut.buildingType === 'gold_hut') {
                        this.mainSprite.play(`${this.texturePrefix}-run-pickaxe`);
                    } else {
                        this.mainSprite.play(`${this.texturePrefix}-run-axe`);
                    }
                } else {
                    this.mainSprite.play(`${this.texturePrefix}-run`);
                }
                break;
            case 'MOVING_TO_TRAIN':
                this.mainSprite.play(`${this.texturePrefix}-run`);
                this.disableInteractive(); // Draft lock
                break;
            case 'CHOPPING':
                this.mainSprite.play(`${this.texturePrefix}-chop`);
                break;
            case 'MINING':
                this.mainSprite.play(`${this.texturePrefix}-mine`);
                break;
            case 'CARRYING':
            case 'DEPOSITING':
                if (this.carriedResourceType === 'gold') {
                    this.mainSprite.play(`${this.texturePrefix}-idle-gold`);
                } else {
                    this.mainSprite.play(`${this.texturePrefix}-idle-wood`);
                }
                break;
            case 'CONSTRUCTING':
                this.mainSprite.play(`${this.texturePrefix}-build`);
                break;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  RESOURCE GATHERING (Chopping / Mining)
    // ══════════════════════════════════════════════════════════

    public clearInventory(): void {
        this.carriedAmount = 0;
        this.carriedResourceType = null;
        this.isCarrying = false;
    }

    public startGathering(resource: BaseResource): void {
        // Cancel any construction job
        this.cancelBuilding();

        // If carrying a different resource type, drop it
        if (this.isCarrying && this.carriedResourceType !== resource.resourceType) {
            this.clearInventory();
        }

        if (this.gatherTimer) {
            this.gatherTimer.destroy();
        }
        
        this.targetResource = resource;
        this.setWorkerState(resource.resourceType === 'gold' ? 'MINING' : 'CHOPPING');
        
        // Face the resource
        if (resource.gridX < this.gridX) {
            this.mainSprite.setFlipX(true);
        } else if (resource.gridX > this.gridX) {
            this.mainSprite.setFlipX(false);
        }

        this.gatherTimer = this.scene.time.addEvent({
            delay: 2000, // GATHER_INTERVAL
            loop: true,
            callback: () => {
                if (!this.targetResource) return;

                const store = useGameStore.getState();
                // Faction Guard: Only apply local resource node damage and credits if this is OUR worker!
                if (this.faction !== store.faction) {
                    return;
                }
                
                const damage = 1;
                this.targetResource.takeDamage(damage);
                this.carriedAmount += this.targetResource.yieldPerHit;
                this.carriedResourceType = this.targetResource.resourceType as 'wood' | 'gold';
                
                // Network Sync: Emit resource harvested if this is our worker
                const activeSocket = this.scene.game.registry.get('socket');
                if (activeSocket && store.roomId) {
                    activeSocket.emit('client_resource_harvested', {
                        roomId: String(store.roomId).trim(),
                        resourceId: this.targetResource.id,
                        amountHarvested: damage
                    });
                }

                // Stop gathering if resource depleted OR inventory full (e.g., 10 capacity)
                if (this.targetResource.currentHealth <= 0 || this.carriedAmount >= 10) {
                    this.collectResource();
                }
            }
        });
    }

    // For backwards compatibility with external calls, though we can use startGathering directly
    public startChopping(resource: BaseResource): void {
        this.startGathering(resource);
    }
    
    public startMining(resource: BaseResource): void {
        this.startGathering(resource);
    }

    private collectResource(): void {
        if (this.gatherTimer) {
            this.gatherTimer.destroy();
            this.gatherTimer = null;
        }
        this.targetResource = null;
        this.isCarrying = true;
        this.setWorkerState('CARRYING');
        
        // Emit an event so InteractionManager/EntityManager can route the worker to deposit
        this.scene.events.emit('resource_collected', this);
    }

    public depositResource(): void {
        if (this.carriedAmount > 0) {
            const faction = this.faction || 'blue';
            if (this.carriedResourceType === 'wood') {
                useGameStore.getState().addWood(this.carriedAmount, faction);
            } else if (this.carriedResourceType === 'gold') {
                useGameStore.getState().addGold(this.carriedAmount, faction);
            }
            this.clearInventory();
        }
        this.setWorkerState('IDLE');
    }

    // ══════════════════════════════════════════════════════════
    //  CONSTRUCTING (Building)
    // ══════════════════════════════════════════════════════════

    /**
     * Start building a target building.
     * Worker must already be adjacent to the building.
     */
    public startBuilding(building: BaseBuilding): void {
        // Cancel any gathering
        if (this.gatherTimer) {
            this.gatherTimer.destroy();
            this.gatherTimer = null;
            this.targetResource = null;
        }

        this.targetBuilding = building;
        this.isConstructionJob = true;
        this.assignedBuildingId = building.id;
        building.addBuilder(this.id);
        
        this.setWorkerState('CONSTRUCTING');

        // Multiplayer Sync
        const store = useGameStore.getState();
        const activeSocket = this.scene.game.registry.get('socket');
        if (activeSocket && store.roomId && this.faction === store.faction) {
            console.log(`[Build Sync] Emitting client_start_constructing for ${this.id} to building ${building.id}`);
            activeSocket.emit('client_start_constructing', {
                roomId: String(store.roomId).trim(),
                entityId: this.id,
                buildingId: building.id
            });
        }

        // Face the building
        if (building.gridX < this.gridX) {
            this.mainSprite.setFlipX(true);
        } else if (building.gridX > this.gridX) {
            this.mainSprite.setFlipX(false);
        }

        this.buildTimer = this.scene.time.addEvent({
            delay: 1500, // BUILD_INTERVAL: each tick adds 10 progress → 15s solo
            loop: true,
            callback: () => {
                if (!this.targetBuilding || this.targetBuilding.isCompleted) {
                    this.cancelBuilding();
                    this.setWorkerState('IDLE');
                    return;
                }

                const currentBuilding = this.targetBuilding;
                currentBuilding.addProgress(10);

                // Multiplayer Sync
                const store = useGameStore.getState();
                const activeSocket = this.scene.game.registry.get('socket');
                if (activeSocket && store.roomId && this.faction === store.faction && currentBuilding) {
                    activeSocket.emit('client_construction_progress', {
                        roomId: String(store.roomId).trim(),
                        buildingId: currentBuilding.id,
                        progress: currentBuilding.progress
                    });
                }

                // Check if building completed after this tick
                if (currentBuilding.isCompleted || this.targetBuilding === null) {
                    this.cancelBuilding();
                    this.setWorkerState('IDLE');
                }
            }
        });
    }

    /**
     * Cancel the current construction job.
     * Cleanly resets hammer animation state.
     */
    public cancelBuilding(): void {
        if (this.buildTimer) {
            this.buildTimer.destroy();
            this.buildTimer = null;
        }
        if (this.targetBuilding) {
            this.targetBuilding.removeBuilder(this.id);
        }
        this.targetBuilding = null;
        this.assignedBuildingId = null;
        this.isConstructionJob = false;
    }

    // ══════════════════════════════════════════════════════════
    //  HUT AUTOMATION
    // ══════════════════════════════════════════════════════════

    public startHutAutomation(hut: BuildingEntity): void {
        this.cancelBuilding();
        this.cancelHutAutomation();

        this.assignedHut = hut;
        hut.addWorker(this.id);
        // The actual loop logic (find tree, chop, return to hut) is managed 
        // by EntityManager or InteractionManager routing, but we record the state here.
    }

    public cancelHutAutomation(): void {
        if (this.assignedHut) {
            this.assignedHut.removeWorker(this.id);
            this.assignedHut = null;
        }
    }

    /**
     * Check if this worker is currently assigned to build a specific building.
     */
    public isAssignedToBuilding(building: BaseBuilding): boolean {
        return this.targetBuilding === building && this.isConstructionJob;
    }

    // ══════════════════════════════════════════════════════════
    //  MILITARY TRANSFORMATION & DRAFTING
    // ══════════════════════════════════════════════════════════

    public clearCarriedResource(): void {
        this.clearInventory();
    }

    public hideForTraining(): void {
        this.setActive(true);
        this.setVisible(true);
        this.disableInteractive();
    }

    public showFromTraining(): void {
        this.setActive(true);
        this.setVisible(true);
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );
    }
}
