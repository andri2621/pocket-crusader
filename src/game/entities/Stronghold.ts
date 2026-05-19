import { BaseBuilding } from './base/BaseBuilding';
import { EntityConfig } from '../../types/entity.types';
import Phaser from 'phaser';

export class Stronghold extends BaseBuilding {
    private spawnProgressBarBg: Phaser.GameObjects.Graphics;
    private spawnProgressBarFill: Phaser.GameObjects.Graphics;
    
    private static readonly SPAWN_BAR_WIDTH = 50;
    private static readonly SPAWN_BAR_HEIGHT = 4;
    private static readonly SPAWN_BAR_OFFSET_Y = -60;

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

        // Setup Spawn Progress Bar
        this.spawnProgressBarBg = this.scene.add.graphics();
        this.add(this.spawnProgressBarBg);

        this.spawnProgressBarFill = this.scene.add.graphics();
        this.add(this.spawnProgressBarFill);

        this.spawnProgressBarBg.setVisible(false);
        this.spawnProgressBarFill.setVisible(false);
    }

    public updateSpawnBar(progress: number, isSpawning: boolean) {
        if (!isSpawning) {
            this.spawnProgressBarBg.setVisible(false);
            this.spawnProgressBarFill.setVisible(false);
            return;
        }

        this.spawnProgressBarBg.setVisible(true);
        this.spawnProgressBarFill.setVisible(true);

        const w = Stronghold.SPAWN_BAR_WIDTH;
        const h = Stronghold.SPAWN_BAR_HEIGHT;
        const y = Stronghold.SPAWN_BAR_OFFSET_Y;
        const x = -w / 2;

        this.spawnProgressBarBg.clear();
        this.spawnProgressBarBg.fillStyle(0x222222, 0.8);
        this.spawnProgressBarBg.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 2);

        const fillWidth = progress * w;
        this.spawnProgressBarFill.clear();
        this.spawnProgressBarFill.fillStyle(0x4ade80, 1); // Green for spawning
        this.spawnProgressBarFill.fillRoundedRect(x, y, fillWidth, h, 2);
    }
}
