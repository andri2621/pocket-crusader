import { BaseUnit } from './base/BaseUnit';
import { UnitConfig } from '../../types/entity.types';
import { WorkerState } from '../../types/game';
import { BaseResource } from './base/BaseResource';
import { useGameStore } from '../../store/useGameStore';

export class Worker extends BaseUnit {
    private isCarrying: boolean = false;
    private carriedWood: number = 0;
    private chopTimer: Phaser.Time.TimerEvent | null = null;
    private targetResource: BaseResource | null = null;

    public get isCarryingWood(): boolean {
        return this.isCarrying;
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
        this.scene.input.enableDebug(this, 0xff0000);
    }

    protected override onStateChange(newState: WorkerState): void {
        // Stop phantom chopping if we change state
        if (newState !== 'CHOPPING' && this.chopTimer) {
            this.chopTimer.destroy();
            this.chopTimer = null;
            this.targetResource = null;
        }

        switch (newState) {
            case 'IDLE':
                this.mainSprite.play(this.isCarrying ? 'pawn-idle-wood' : 'pawn-idle');
                break;
            case 'MOVING':
                // GameScene uses pawn-run and pawn-run-wood
                this.mainSprite.play(this.isCarrying ? 'pawn-run-wood' : 'pawn-run');
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
        }
    }

    public startChopping(resource: BaseResource): void {
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
                
                const yieldAmount = this.targetResource.takeDamage(1);
                this.carriedWood += yieldAmount;
                
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
}
