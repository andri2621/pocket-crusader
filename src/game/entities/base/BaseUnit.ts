import { BaseEntity } from './BaseEntity';
import { UnitConfig } from '../../../types/entity.types';
import { WorkerState, GridPosition } from '../../../types/game';
import { useGameStore } from '../../../store/useGameStore';

export abstract class BaseUnit extends BaseEntity {
    public workerState: WorkerState = 'IDLE';
    public speed: number;
    public currentPath: GridPosition[] = [];
    protected isMoving: boolean = false;
    protected currentTweenChain: Phaser.Tweens.TweenChain | null = null;

    // ── Wandering AI ───────────────────────────────────────
    public idleTimer: number = 0;
    public wanderDelay: number = 0;

    public get canWander(): boolean {
        return this.workerState === 'IDLE';
    }

    constructor(config: UnitConfig) {
        super(config);
        this.speed = config.speed ?? 150;
        this.workerState = 'IDLE';

        // Add a persistent visual jitter (-8 to +8) to the sprite
        // so multiple units on the same tile don't perfectly overlap
        const jitterX = (Math.random() - 0.5) * 16;
        const jitterY = (Math.random() - 0.5) * 16;
        this.mainSprite.x += jitterX;
        this.mainSprite.y += jitterY;
    }

    public setWorkerState(newState: WorkerState) {
        if (this.workerState !== newState) {
            this.idleTimer = 0; // Reset idle timer on state change
        }
        this.workerState = newState;
        this.onStateChange(newState);
    }

    public resetWanderDelay(minMs: number, maxMs: number) {
        this.wanderDelay = Phaser.Math.Between(minMs, maxMs);
    }

    // Hook for concrete classes to override for animations
    protected abstract onStateChange(newState: WorkerState): void;

    public cancelMovement() {
        if (this.isMoving && this.currentTweenChain) {
            this.currentTweenChain.stop();
            this.currentTweenChain = null;
            this.isMoving = false;
            this.currentPath = [];
            
            // Re-snap to nearest grid position based on current x, y
            this.gridX = Math.floor(this.x / 64);
            // Since y is bottom edge, subtract slightly to snap properly
            this.gridY = Math.floor((this.y - 1) / 64);
            
            this.setGridPosition(this.gridX, this.gridY);
            this.setWorkerState('IDLE');
        }
    }

    public moveAlongPath(path: GridPosition[], onArrival?: () => void) {
        this.cancelMovement();
        
        if (!path || path.length <= 1) {
            if (onArrival) onArrival();
            return;
        }

        this.isMoving = true;
        this.currentPath = path;
        this.setWorkerState('MOVING');

        const tweenConfigs: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

        for (let i = 1; i < path.length; i++) {
            const step = path[i];
            const prevStep = path[i - 1];
            
            const targetX = step.col * 64 + 32;
            const targetY = step.row * 64 + 64;
            
            const isDiagonal = (step.col !== prevStep.col) && (step.row !== prevStep.row);
            const duration = isDiagonal ? this.speed * 1.4 : this.speed;

            tweenConfigs.push({
                targets: this,
                x: targetX,
                y: targetY,
                duration: duration,
                ease: 'Linear',
                onStart: () => {
                    if (step.col < prevStep.col) {
                        this.mainSprite.setFlipX(true);
                    } else if (step.col > prevStep.col) {
                        this.mainSprite.setFlipX(false);
                    }
                },
                onUpdate: () => {
                    this.setDepth(this.y);
                },
                onComplete: () => {
                    this.gridX = step.col;
                    this.gridY = step.row;
                }
            });
        }

        this.currentTweenChain = this.scene.tweens.chain({
            tweens: tweenConfigs,
            onComplete: () => {
                this.isMoving = false;
                this.currentTweenChain = null;
                this.currentPath = [];
                
                if (onArrival) {
                    onArrival();
                } else {
                    // Check if this unit is a Worker dynamically to avoid circular import issues
                    const worker = this as any;
                    if (typeof worker.getTargetResource === 'function' && worker.getTargetResource()) {
                        const resource = worker.getTargetResource();
                        worker.startGathering(resource);
                    } else if (typeof worker.getTargetBuilding === 'function' && worker.getTargetBuilding()) {
                        const building = worker.getTargetBuilding();
                        if (!building.isCompleted) {
                            worker.startBuilding(building);
                        } else {
                            worker.cancelBuilding();
                            worker.setWorkerState('IDLE');
                        }
                    } else {
                        this.setWorkerState('IDLE');
                    }
                }
            }
        });
    }

    public moveToGrid(targetCol: number, targetRow: number, onArrival?: () => void) {
        const scene = this.scene as any;
        if (scene && scene.gridManager) {
            const startPos = { col: this.gridX, row: this.gridY };
            const targetPos = { col: targetCol, row: targetRow };
            scene.gridManager.findPath(startPos, targetPos, (path: GridPosition[]) => {
                if (path) {
                    this.moveAlongPath(path, onArrival);
                }
            });
        }
    }

    public override update(time: number, delta: number): void {
        const store = useGameStore.getState();
        const isMultiplayer = !!store.roomId;
        if (isMultiplayer && this.faction !== store.faction) {
            this.idleTimer = 0;
            return;
        }

        // Track idle time for wandering
        if (this.workerState === 'IDLE') {
            this.idleTimer += delta;
        } else {
            this.idleTimer = 0;
        }
    }
}
