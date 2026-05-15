import { BaseEntity } from './BaseEntity';
import { ResourceConfig } from '../../../types/entity.types';
import { ResourceType } from '../../../types/game';

export abstract class BaseResource extends BaseEntity {
    public resourceType: ResourceType;
    public yieldPerHit: number;

    constructor(config: ResourceConfig) {
        super(config);
        // Cast since ResourceType is a specific union string type
        this.resourceType = config.resourceType as ResourceType; 
        this.maxHealth = config.maxHp;
        this.currentHealth = this.maxHealth;
        this.yieldPerHit = config.yieldPerHit;
    }

    protected override onDeath(): void {
        this.onDepleted();
    }

    protected abstract onDepleted(): void;

    public override update(time: number, delta: number): void {
        // resource update logic
    }
}
