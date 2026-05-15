import { BaseBuilding } from './base/BaseBuilding';
import { EntityConfig } from '../../types/entity.types';
import Phaser from 'phaser';

export class Stronghold extends BaseBuilding {
    constructor(config: EntityConfig) {
        super({
            ...config,
            buildingType: 'stronghold',
            footprintWidth: 5,
            footprintHeight: 2
        });

        // The castle asset is large, adjust origin as needed
        this.mainSprite.setOrigin(0.5, 0.9);
        
        // Setup hitbox for interaction (5x2 tiles = 320x128)
        this.setInteractive(
            new Phaser.Geom.Rectangle(-160, -128, 320, 128),
            Phaser.Geom.Rectangle.Contains
        );
        
        this.completeConstruction();
        this.isDropOff = true; // Stronghold is a universal resource drop-off
    }
}
