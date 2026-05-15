import { BaseEntity } from './BaseEntity';
import { ResourceConfig } from '../../../types/entity.types';
import { ResourceType } from '../../../types/game';

export abstract class BaseResource extends BaseEntity {
    public resourceType: ResourceType;
    public maxHealth: number;
    public currentHealth: number;
    public yieldPerHit: number;

    constructor(config: ResourceConfig) {
        super(config);
        // Cast since ResourceType is a specific union string type
        this.resourceType = config.resourceType as ResourceType; 
        this.maxHealth = config.maxHp;
        this.currentHealth = this.maxHealth;
        this.yieldPerHit = config.yieldPerHit;
    }

    public takeDamage(amount: number): number {
        if (this.currentHealth <= 0) return 0;

        this.currentHealth -= amount;
        
        // Shake effect on the local mainSprite
        this.scene.tweens.add({
            targets: this.mainSprite,
            x: 4, // local offset
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.mainSprite.x = 0; // Container local space reset
            }
        });

        if (this.currentHealth <= 0) {
            this.onDepleted();
        }

        return this.yieldPerHit;
    }

    protected abstract onDepleted(): void;

    public override update(time: number, delta: number): void {
        // resource update logic
    }
}
