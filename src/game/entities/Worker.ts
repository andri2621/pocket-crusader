import { BaseUnit } from './base/BaseUnit';
import { UnitConfig } from '../../types/entity.types';
import { WorkerState } from '../../types/game';
import { BaseResource } from './base/BaseResource';
import { BaseBuilding } from './base/BaseBuilding';
import { useGameStore } from '../../store/useGameStore';

export class Worker extends BaseUnit {
    private isCarrying: boolean = false;
    private carriedWood: number = 0;
    private chopTimer: Phaser.Time.TimerEvent | null = null;
    private targetResource: BaseResource | null = null;

    // ── Construction State ─────────────────────────────────
    private buildTimer: Phaser.Time.TimerEvent | null = null;
    private targetBuilding: BaseBuilding | null = null;
    public isConstructionJob: boolean = false;

    public get isCarryingWood(): boolean {
        return this.isCarrying;
    }

    public override get canWander(): boolean {
        // Workers should not wander if they are assigned to a construction job
        // or currently carrying wood to deposit.
        return this.workerState === 'IDLE' && !this.isConstructionJob && !this.isCarrying;
    }

    constructor(config: UnitConfig) {
        super(config);
        this.mainSprite.play('pawn-idle');
        
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
        // Stop phantom chopping if we change state away from CHOPPING
        if (newState !== 'CHOPPING' && this.chopTimer) {
            this.chopTimer.destroy();
            this.chopTimer = null;
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
                    this.mainSprite.play('pawn-idle-hammer');
                } else {
                    this.mainSprite.play(this.isCarrying ? 'pawn-idle-wood' : 'pawn-idle');
                }
                break;
            case 'MOVING':
                if (this.isConstructionJob) {
                    this.mainSprite.play('pawn-run-hammer');
                } else {
                    this.mainSprite.play(this.isCarrying ? 'pawn-run-wood' : 'pawn-run');
                }
                break;
            case 'CHOPPING':
                this.mainSprite.play('pawn-chop');
                break;
            case 'CARRYING':
                this.mainSprite.play('pawn-idle-wood');
                break;
            case 'DEPOSITING':
                this.mainSprite.play('pawn-idle-wood');
                break;
            case 'CONSTRUCTING':
                this.mainSprite.play('pawn-build');
                break;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  CHOPPING (Resource Gathering)
    // ══════════════════════════════════════════════════════════

    public startChopping(resource: BaseResource): void {
        // Cancel any construction job
        this.cancelBuilding();

        if (this.chopTimer) {
            this.chopTimer.destroy();
        }
        
        this.targetResource = resource;
        this.setWorkerState('CHOPPING');
        
        // Face the resource
        if (resource.gridX < this.gridX) {
            this.mainSprite.setFlipX(true);
        } else if (resource.gridX > this.gridX) {
            this.mainSprite.setFlipX(false);
        }

        this.chopTimer = this.scene.time.addEvent({
            delay: 2000, // CHOP_INTERVAL
            loop: true,
            callback: () => {
                if (!this.targetResource) return;
                
                this.targetResource.takeDamage(1);
                this.carriedWood += this.targetResource.yieldPerHit;
                
                if (this.targetResource.currentHealth <= 0) {
                    this.collectResource();
                }
            }
        });
    }

    private collectResource(): void {
        if (this.chopTimer) {
            this.chopTimer.destroy();
            this.chopTimer = null;
        }
        this.targetResource = null;
        this.isCarrying = true;
        this.setWorkerState('CARRYING');
        
        // Emit an event so InteractionManager/EntityManager can route the worker to deposit
        this.scene.events.emit('resource_collected', this);
    }

    public depositResource(): void {
        if (this.carriedWood > 0) {
            // Using Zustand store directly as per integration requirement
            useGameStore.getState().addWood(this.carriedWood);
            this.carriedWood = 0;
            this.isCarrying = false;
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
        // Cancel any chopping
        if (this.chopTimer) {
            this.chopTimer.destroy();
            this.chopTimer = null;
            this.targetResource = null;
        }

        this.targetBuilding = building;
        this.isConstructionJob = true;
        this.setWorkerState('CONSTRUCTING');

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

                this.targetBuilding.addProgress(10);

                // Check if building completed after this tick
                if (this.targetBuilding.isCompleted) {
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
        this.targetBuilding = null;
        this.isConstructionJob = false;
    }

    /**
     * Check if this worker is currently assigned to build a specific building.
     */
    public isAssignedToBuilding(building: BaseBuilding): boolean {
        return this.targetBuilding === building && this.isConstructionJob;
    }
}
