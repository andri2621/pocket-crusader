import { BaseBuilding } from './base/BaseBuilding';
import { EntityConfig } from '../../types/entity.types';
import Phaser from 'phaser';
import { useGameStore } from '../../store/useGameStore';

export class Barracks extends BaseBuilding {
    public isTraining: boolean = false;
    private trainingTimer: Phaser.Time.TimerEvent | null = null;
    
    // Queue System
    public trainingQueue: string[] = [];
    public currentTrainingProgress: number = 0;
    
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

    public addToQueue(unitType: string) {
        if (!this.isCompleted) return;
        
        // Cost is handled before calling this, or handle here. 
        // We handle deduct in App.tsx but let's make sure it syncs.
        // Actually, since we deduct in App.tsx (💰20), we don't deduct here.
        this.trainingQueue.push(unitType);
        
        // Sync to UI if selected
        this.syncQueueToStore();
    }

    public cancelQueueItem(index: number) {
        if (index < 0 || index >= this.trainingQueue.length) return;

        // Refund Gold
        useGameStore.getState().addGold(20);

        if (index === 0) {
            // Cancel current training
            if (this.trainingTimer) {
                this.trainingTimer.destroy();
                this.trainingTimer = null;
            }
            this.isTraining = false;
            this.currentTrainingProgress = 0;
            this.trainingProgressBarBg.setVisible(false);
            this.trainingProgressBarFill.setVisible(false);
        }

        this.trainingQueue.splice(index, 1);
        this.syncQueueToStore();
    }

    private syncQueueToStore() {
        const store = useGameStore.getState();
        if (store.selectedBuildingId === this.id) {
            store.setTrainingState([...this.trainingQueue], this.currentTrainingProgress);
        }
    }

    private onTrainingComplete() {
        this.isTraining = false;
        this.trainingTimer = null;
        this.currentTrainingProgress = 0;
        this.trainingProgressBarBg.setVisible(false);
        this.trainingProgressBarFill.setVisible(false);
        
        const trainedUnit = this.trainingQueue.shift(); // Remove completed item
        if (trainedUnit === 'warrior') {
            this.scene.events.emit('warrior_trained', this);
        }
        
        this.syncQueueToStore();
    }

    public override update(time: number, delta: number): void {
        super.update(time, delta);
        
        // Queue processing
        if (this.trainingQueue.length > 0 && !this.isTraining && this.isCompleted) {
            this.isTraining = true;
            this.trainingProgressBarBg.setVisible(true);
            this.trainingProgressBarFill.setVisible(true);
            
            const trainingDuration = 10000;
            
            this.trainingTimer = this.scene.time.addEvent({
                delay: trainingDuration,
                callback: this.onTrainingComplete,
                callbackScope: this
            });
        }
        
        if (this.isTraining && this.trainingTimer) {
            this.currentTrainingProgress = this.trainingTimer.getOverallProgress();
            this.updateTrainingBar(this.currentTrainingProgress);
            
            // Periodically sync progress (maybe not every frame to save performance, but we can do it for smooth UI)
            const store = useGameStore.getState();
            if (store.selectedBuildingId === this.id) {
                // To avoid React re-renders every frame, we only update store if progress changed significantly
                // OR we can just rely on Phaser update. For now, sync.
                store.setTrainingState([...this.trainingQueue], this.currentTrainingProgress);
            }
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
