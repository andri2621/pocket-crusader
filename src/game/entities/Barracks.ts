import { BaseBuilding } from './base/BaseBuilding';
import { EntityConfig } from '../../types/entity.types';
import Phaser from 'phaser';

export class Barracks extends BaseBuilding {
    public isTraining: boolean = false;
    private trainingTimer: Phaser.Time.TimerEvent | null = null;
    
    // UI Progress Bar for training
    private trainingProgressBarBg: Phaser.GameObjects.Graphics;
    private trainingProgressBarFill: Phaser.GameObjects.Graphics;
    
    private static readonly TRAINING_BAR_WIDTH = 40;
    private static readonly TRAINING_BAR_HEIGHT = 6;
    private static readonly TRAINING_BAR_OFFSET_Y = -120; // High above the barracks

    constructor(config: EntityConfig) {
        super({
            ...config,
            buildingType: 'barracks',
            footprintWidth: 2,
            footprintHeight: 2
        });

        // The barracks asset is 2x2.
        this.mainSprite.setOrigin(0.5, 0.9);
        this.mainSprite.setScale(0.76);
        
        // Setup hitbox for interaction (2x2 tiles = 128x128)
        this.setInteractive(
            new Phaser.Geom.Rectangle(-64, -128, 128, 128),
            Phaser.Geom.Rectangle.Contains
        );

        // Setup Training Progress Bar
        this.trainingProgressBarBg = this.scene.add.graphics();
        this.add(this.trainingProgressBarBg);

        this.trainingProgressBarFill = this.scene.add.graphics();
        this.add(this.trainingProgressBarFill);

        this.trainingProgressBarBg.setVisible(false);
        this.trainingProgressBarFill.setVisible(false);
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

    public trainWarrior() {
        if (this.isTraining || !this.isCompleted) return;
        
        this.isTraining = true;
        this.trainingProgressBarBg.setVisible(true);
        this.trainingProgressBarFill.setVisible(true);
        
        // Train over 10 seconds
        const trainingDuration = 10000;
        
        this.trainingTimer = this.scene.time.addEvent({
            delay: trainingDuration,
            callback: this.onTrainingComplete,
            callbackScope: this
        });
    }

    private onTrainingComplete() {
        this.isTraining = false;
        this.trainingTimer = null;
        this.trainingProgressBarBg.setVisible(false);
        this.trainingProgressBarFill.setVisible(false);
        
        this.scene.events.emit('warrior_trained', this);
    }

    public override update(time: number, delta: number): void {
        super.update(time, delta);
        
        if (this.isTraining && this.trainingTimer) {
            const progress = this.trainingTimer.getOverallProgress();
            this.updateTrainingBar(progress);
        }
    }

    private updateTrainingBar(progress: number) {
        const w = Barracks.TRAINING_BAR_WIDTH;
        const h = Barracks.TRAINING_BAR_HEIGHT;
        const y = Barracks.TRAINING_BAR_OFFSET_Y;
        const x = -w / 2;

        this.trainingProgressBarBg.clear();
        this.trainingProgressBarBg.fillStyle(0x222222, 0.8);
        this.trainingProgressBarBg.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 2);

        const fillWidth = progress * w;
        this.trainingProgressBarFill.clear();
        this.trainingProgressBarFill.fillStyle(0x00aaff, 1); // Blue for training
        this.trainingProgressBarFill.fillRoundedRect(x, y, fillWidth, h, 2);
    }
}
