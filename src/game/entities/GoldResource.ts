import { BaseResource } from './base/BaseResource';
import { ResourceConfig } from '../../types/entity.types';

export class GoldResource extends BaseResource {
    public currentMiners: string[] = [];

    constructor(config: ResourceConfig) {
        super({
            ...config,
            resourceType: 'gold',
            texture: 'gold_stone_6', // Start at max level
        });
        
        this.mainSprite.setOrigin(0.5, 0.75);
        
        // Setup hitbox for Resource in local container space.
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );
        this.scene.input.enableDebug(this, 0xff0000);
        
        this.updateTextureStage();
    }

    public override takeDamage(amount: number) {
        super.takeDamage(amount);
        this.updateTextureStage();
    }

    private updateTextureStage() {
        if (this.currentHealth <= 0) return;

        // Map health to a 1-6 stage
        let stage = Math.ceil((this.currentHealth / this.maxHealth) * 6);
        stage = Phaser.Math.Clamp(stage, 1, 6);
        
        this.mainSprite.setTexture(`gold_stone_${stage}`);
    }

    public get maxMinersAllowed(): number {
        // Levels 4-6: Max 2 miners
        // Levels 1-3: Max 1 miner
        let stage = Math.ceil((this.currentHealth / this.maxHealth) * 6);
        stage = Phaser.Math.Clamp(stage, 1, 6);
        return stage >= 4 ? 2 : 1;
    }

    public addMiner(workerId: string): boolean {
        if (this.currentMiners.length < this.maxMinersAllowed && !this.currentMiners.includes(workerId)) {
            this.currentMiners.push(workerId);
            return true;
        }
        return false;
    }

    public removeMiner(workerId: string) {
        this.currentMiners = this.currentMiners.filter(id => id !== workerId);
    }

    protected override onDepleted(): void {
        this.mainSprite.setVisible(false);
        this.currentMiners = [];
        this.emit('depleted', this);
        this.destroy(); // Remove entity from scene
    }
}
