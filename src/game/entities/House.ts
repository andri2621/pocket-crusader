import { BaseBuilding } from './base/BaseBuilding';
import { EntityConfig } from '../../types/entity.types';
import Phaser from 'phaser';

export class House extends BaseBuilding {
    constructor(config: EntityConfig) {
        super({
            ...config,
            texture: 'house1',
            buildingType: 'house',
            footprintWidth: 2,
            footprintHeight: 2,
        });

        // House is NOT a resource drop-off point (default false, explicit for clarity)
        this.isDropOff = false;

        // Sprite origin for 2x2 footprint alignment
        // Bottom-center of a 2-tile-wide footprint
        this.mainSprite.setOrigin(0.5, 0.9);

        // Interactive hitbox: 2x2 tiles = 128x128 pixels
        this.setInteractive(
            new Phaser.Geom.Rectangle(-64, -128, 128, 128),
            Phaser.Geom.Rectangle.Contains
        );

        // Apply WIP (Work In Progress) visuals
        this.applyWipVisuals();
    }

    /**
     * Apply "under construction" visuals:
     * - Lower alpha for transparency
     * - Grey tint to indicate incomplete state
     */
    private applyWipVisuals() {
        if (!this.isCompleted) {
            this.setAlpha(0.6);
            this.mainSprite.setTint(0x888888);
        }
    }

    public override completeConstruction() {
        super.completeConstruction();
        // super already handles: isCompleted=true, clearTint, setAlpha(1.0), emit event
    }

    /**
     * Override pixel position for 2x2 footprint:
     * The anchor sits at the bottom-center of the 2-tile-wide area.
     */
    protected override updatePixelPosition() {
        // Bottom-center of the 2x2 footprint area
        this.x = this.gridX * 64 + 64;   // center of 2 tiles horizontally
        this.y = this.gridY * 64 + 128;  // bottom of 2 tiles vertically
        this.setDepth(this.y);
    }

    public override update(time: number, delta: number): void {
        // Future: construction timer, etc.
    }
}
