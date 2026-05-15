import { BaseResource } from './base/BaseResource';
import { ResourceConfig } from '../../types/entity.types';

export class ResourceEntity extends BaseResource {

    constructor(config: ResourceConfig) {
        super(config);
        
        if (this.resourceType === 'wood') {
            this.mainSprite.play('tree-sway');
            // Adjust origin based on tree sprite specifics
            this.mainSprite.setOrigin(0.5, 0.95);
        }
        
        // Setup hitbox for Resource in local container space.
        // Container origin is bottom-center of the tile (0,0).
        // 64x64 hitbox above the bottom center: X: -32 to 32, Y: -64 to 0
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );
        this.scene.input.enableDebug(this, 0xff0000);
    }

    protected override onDepleted(): void {
        if (this.resourceType === 'wood') {
            this.mainSprite.stop();
            this.mainSprite.setTexture('stump');
            this.mainSprite.setOrigin(0.5, 0.95);
        } else if (this.resourceType === 'gold') {
            this.mainSprite.setVisible(false);
        }
        
        // Emit event so EntityManager can update walk grid or references
        this.emit('depleted', this);
    }
}
