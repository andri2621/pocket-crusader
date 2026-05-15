import { BaseBuilding } from './base/BaseBuilding';
import { BuildingConfig } from '../../types/entity.types';

export class BuildingEntity extends BaseBuilding {
    constructor(config: BuildingConfig) {
        super(config);
        
        // Woodcutter's Hut is a resource drop-off point
        this.isDropOff = true;

        // Adjust origin based on house3 sprite specifics
        this.mainSprite.setOrigin(0.5, 0.83);

        // Setup hitbox for Building in local container space.
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );

        // Emit an event so GridManager/EntityManager knows a building was placed
        this.scene.events.emit('building_placed', this);
    }
}
