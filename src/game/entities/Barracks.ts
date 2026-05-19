import { BaseBuilding } from './base/BaseBuilding';
import { EntityConfig } from '../../types/entity.types';
import Phaser from 'phaser';
import { useGameStore } from '../../store/useGameStore';

export class Barracks extends BaseBuilding {
    public isTraining: boolean = false;
    private trainingTimer: Phaser.Time.TimerEvent | null = null;
    
    // Queue System
    public trainingRecruits: { workerId: string, unitType: string, status: 'walking' | 'training' }[] = [];
    public currentTrainingProgress: number = 0;
    
    // UI Progress Bar for training
    private trainingProgressBarBg: Phaser.GameObjects.Graphics;
    private trainingProgressBarFill: Phaser.GameObjects.Graphics;
    private queueLabel: Phaser.GameObjects.Text;
    
    private static readonly TRAINING_BAR_WIDTH = 40;
    private static readonly TRAINING_BAR_HEIGHT = 6;
    private static readonly TRAINING_BAR_OFFSET_Y = -90; // High above the barracks

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

        // Queue Text Indicator
        this.queueLabel = this.scene.add.text(0, -105, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add(this.queueLabel);
        this.queueLabel.setVisible(false);
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

    public addWorkerToQueue(workerId: string, unitType: string) {
        if (!this.isCompleted) return;
        
        // Prevent duplicate entries for the same worker
        if (this.trainingRecruits.some(r => r.workerId === workerId)) return;
        
        this.trainingRecruits.push({ workerId, unitType, status: 'walking' });
        this.syncQueueToStore();
        this.updateQueueLabel();
    }

    public startTrainingWorker(workerId: string) {
        const recruit = this.trainingRecruits.find(r => r.workerId === workerId);
        if (recruit) {
            recruit.status = 'training';
            this.processQueue();
        }
    }

    public cancelQueueItem(index: number) {
        if (index < 0 || index >= this.trainingRecruits.length) return;

        const recruit = this.trainingRecruits[index];
        this.scene.events.emit('cancel_worker_training', recruit.workerId);

        // Refund Gold
        useGameStore.getState().addGold(20);

        if (index === 0 && recruit.status === 'training') {
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

        this.trainingRecruits.splice(index, 1);
        this.syncQueueToStore();
        this.updateQueueLabel();
    }

    private updateQueueLabel() {
        if (this.trainingRecruits.length > 0) {
            this.queueLabel.setText(`x${this.trainingRecruits.length}`);
            this.queueLabel.setVisible(true);
        } else {
            this.queueLabel.setVisible(false);
        }
    }

    private syncQueueToStore() {
        const store = useGameStore.getState();
        if (store.selectedBuildingId === this.id) {
            const uiQueue = this.trainingRecruits.map(r => r.unitType);
            store.setTrainingState(uiQueue, this.currentTrainingProgress);
        }
    }

    private onTrainingComplete() {
        this.isTraining = false;
        this.trainingTimer = null;
        this.currentTrainingProgress = 0;
        this.trainingProgressBarBg.setVisible(false);
        this.trainingProgressBarFill.setVisible(false);
        
        const trainedRecruit = this.trainingRecruits.shift(); // Remove completed item
        if (trainedRecruit) {
            // Tell EntityManager to completely destroy the worker, and spawn warrior
            this.scene.events.emit('worker_graduated', trainedRecruit.workerId);
            if (trainedRecruit.unitType === 'warrior') {
                this.scene.events.emit('warrior_trained', this);
            }
        }

        this.syncQueueToStore();
        this.updateQueueLabel();

        // Defer processQueue to next frame — Phaser TimerEvent callbacks cannot
        // reliably create a new TimerEvent in the same call stack.
        if (this.trainingRecruits.length > 0) {
            this.scene.time.delayedCall(0, () => {
                this.processQueue();
            });
        }
    }

    private processQueue() {
        if (this.trainingRecruits.length > 0 && !this.isTraining && this.isCompleted) {
            const firstRecruit = this.trainingRecruits[0];
            if (firstRecruit.status === 'training') {
                this.isTraining = true;
                this.currentTrainingProgress = 0;
                this.trainingProgressBarBg.setVisible(true);
                this.trainingProgressBarFill.setVisible(true);
                
                const trainingDuration = 10000;
                
                this.trainingTimer = this.scene.time.addEvent({
                    delay: trainingDuration,
                    callback: this.onTrainingComplete,
                    callbackScope: this
                });
            }
        }
    }

    public override update(time: number, delta: number): void {
        super.update(time, delta);
        
        this.processQueue();
        
        if (this.isTraining && this.trainingTimer) {
            this.currentTrainingProgress = this.trainingTimer.getOverallProgress();
            this.updateTrainingBar(this.currentTrainingProgress);
            
            // Periodically sync progress (maybe not every frame to save performance, but we can do it for smooth UI)
            const store = useGameStore.getState();
            if (store.selectedBuildingId === this.id) {
                // To avoid React re-renders every frame, we only update store if progress changed significantly
                // OR we can just rely on Phaser update. For now, sync.
                const uiQueue = this.trainingRecruits.map(r => r.unitType);
                store.setTrainingState(uiQueue, this.currentTrainingProgress);
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
