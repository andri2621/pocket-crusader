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
    public currentTrainingPawnId: string | null = null;
    
    private entityManager: any;
    
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

        this.entityManager = (config.scene as any).entityManager;

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
            this.currentTrainingPawnId = workerId;
            this.processQueue();

            // Multiplayer Sync: Emit client_start_training when training actually STARTS!
            const store = useGameStore.getState();
            const activeSocket = this.scene.game.registry.get('socket');
            if (activeSocket && store.roomId && this.faction === store.faction) {
                console.log(`[Train Sync] Emitting client_start_training for barracks ${this.id}, type ${recruit.unitType}`);
                activeSocket.emit('client_start_training', {
                    roomId: String(store.roomId).trim(),
                    barracksId: this.id,
                    unitType: recruit.unitType
                });
            }
        }
    }

    public addRemoteWorkerToQueue(unitType: string) {
        if (!this.isCompleted) return;
        const workerId = `remote_recruit_${Date.now()}`;
        this.trainingRecruits.push({ workerId, unitType, status: 'training' });
        this.syncQueueToStore();
        this.updateQueueLabel();
        this.processQueue();
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
        const store = useGameStore.getState();
        const isMultiplayer = !!store.roomId;
        if (isMultiplayer && this.faction !== store.faction) {
            // Remote Barracks countdown complete: hold at 100% and wait for server_unit_transformed
            this.currentTrainingProgress = 1;
            this.updateTrainingBar(1);
            this.syncQueueToStore();
            return;
        }

        this.isTraining = false;
        this.trainingTimer = null;
        this.currentTrainingProgress = 0;
        this.trainingProgressBarBg.setVisible(false);
        this.trainingProgressBarFill.setVisible(false);
        
        const trainedRecruit = this.trainingRecruits.shift(); // Remove completed item
        if (trainedRecruit) {
            try {
                const consumedPawnId = this.currentTrainingPawnId || trainedRecruit.workerId;
                const finalWarriorId = `warrior_${this.faction}_${Date.now()}`;
                
                console.log(`[Authoritative Completion] Queue hit 100%. Swapping ${consumedPawnId} to ${finalWarriorId}`);
                
                // 1. Locate and destroy the pawn ONLY NOW
                const localPawn = this.entityManager.getUnitById(consumedPawnId);
                if (localPawn) {
                    // Safely unselect from interaction handlers
                    this.scene.events.emit('force_deselect_unit', consumedPawnId);
                    
                    localPawn.destroy(); // Safely kill the sprite
                    this.entityManager.removeUnitFromList(consumedPawnId); // Clean from array bounds
                } else {
                    console.warn(`[Authoritative Warning] Could not find pawn ${consumedPawnId} at completion frame!`);
                }

                // 2. Spawn the new local Warrior sprite instantly near the entrance
                const scene = this.scene as any;
                const entranceCol = this.gridX;
                const entranceRow = this.gridY + 1;
                const spawnPos = scene.gridManager.findAdjacentWalkable(entranceCol, entranceRow + 1, { col: entranceCol, row: entranceRow + 1 })
                              || scene.gridManager.getRandomAdjacentWalkable(entranceCol, entranceRow + 1)
                              || { col: entranceCol, row: entranceRow + 2 };
                const spawnCol = spawnPos.col;
                const spawnRow = spawnPos.row;

                this.entityManager.spawnWarrior(spawnCol, spawnRow, this.faction, finalWarriorId);

                // 3. Inform the network to execute the exact same twin swap
                const activeSocket = this.scene.game.registry.get('socket');
                if (isMultiplayer && activeSocket) {
                    activeSocket.emit('client_unit_transformed', {
                        roomId: store.roomId,
                        oldEntityId: consumedPawnId,
                        newEntityId: finalWarriorId,
                        col: spawnCol,
                        row: spawnRow,
                        faction: this.faction,
                        barracksId: this.id
                    });
                }
            } catch (error) {
                console.error("[Authoritative Crash] Critical swap failure:", error);
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

    public wipeRemoteRecruitPlaceholder() {
        const index = this.trainingRecruits.findIndex(r => r.workerId.startsWith('remote_recruit_'));
        if (index !== -1) {
            this.trainingRecruits.splice(index, 1);
        } else if (this.trainingRecruits.length > 0) {
            this.trainingRecruits.shift();
        }
        
        // Reset training progress/timer if the queue is now empty
        if (this.trainingRecruits.length === 0) {
            this.isTraining = false;
            if (this.trainingTimer) {
                this.trainingTimer.destroy();
                this.trainingTimer = null;
            }
            this.currentTrainingProgress = 0;
            this.trainingProgressBarBg.setVisible(false);
            this.trainingProgressBarFill.setVisible(false);
        } else {
            // Restart progress on the next item if we just shifted the active one
            this.isTraining = false;
            if (this.trainingTimer) {
                this.trainingTimer.destroy();
                this.trainingTimer = null;
            }
            this.currentTrainingProgress = 0;
            this.trainingProgressBarBg.setVisible(false);
            this.trainingProgressBarFill.setVisible(false);
            this.scene.time.delayedCall(0, () => {
                this.processQueue();
            });
        }
        
        this.syncQueueToStore();
        this.updateQueueLabel();
    }

    private processQueue() {
        if (this.trainingRecruits.length > 0 && !this.isTraining && this.isCompleted) {
            const firstRecruit = this.trainingRecruits[0];
            if (firstRecruit.status === 'training') {
                this.isTraining = true;
                this.currentTrainingPawnId = firstRecruit.workerId;
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
