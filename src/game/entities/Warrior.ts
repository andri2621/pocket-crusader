import { BaseUnit } from './base/BaseUnit';
import { UnitConfig } from '../../types/entity.types';
import { WorkerState } from '../../types/game';
import Phaser from 'phaser';

export class Warrior extends BaseUnit {
    constructor(config: UnitConfig) {
        super(config);
        
        this.maxHealth = 200;
        this.currentHealth = 200;
        this.speed = 130; // Slower but tougher than Workers

        this.mainSprite.play(`${this.texturePrefix}-idle`);
        
        // Warrior sprites are 192x192 with the character in the center 64x64.
        this.mainSprite.setOrigin(0.5, 128 / 192);
        
        // Setup hitbox for warrior in local container space.
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );

        // Warriors patrol with longer intervals and wider radius
        this.resetWanderDelay(8000, 15000);
    }

    public override get canWander(): boolean {
        return this.workerState === 'IDLE';
    }

    protected override onStateChange(newState: WorkerState): void {
        switch (newState) {
            case 'IDLE':
                this.mainSprite.play(`${this.texturePrefix}-idle`);
                break;
            case 'MOVING':
                this.mainSprite.play(`${this.texturePrefix}-run`);
                break;
            case 'ATTACK':
                this.mainSprite.play(`${this.texturePrefix}-attack`);
                break;
        }
    }
}
