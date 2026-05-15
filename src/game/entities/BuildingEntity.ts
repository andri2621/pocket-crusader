import { BaseBuilding } from './base/BaseBuilding';
import { BuildingConfig } from '../../types/entity.types';

export class BuildingEntity extends BaseBuilding {
    constructor(config: BuildingConfig) {
        super(config);
        
        // Adjust origin based on house3 sprite specifics
        this.mainSprite.setOrigin(0.5, 0.83);

        // Setup hitbox for Building in local container space.
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );
        this.scene.input.enableDebug(this, 0xff0000);

        // Emit an event so GridManager/EntityManager knows a building was placed
        this.scene.events.emit('building_placed', this);
    }

    // Placeholder method to interface with GridManager later
    public applyFootprintToGrid(gridManager: any) {
        // Pseudo-code for next step:
        // gridManager.blockArea(this.gridX, this.gridY, this.footprint.width, this.footprint.height);
    }
}
