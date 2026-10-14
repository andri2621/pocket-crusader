import { BaseUnit } from './base/BaseUnit';
import { BaseEntity } from './base/BaseEntity';
import { UnitConfig } from '../../types/entity.types';
import { WorkerState, GridPosition } from '../../types/game';
import Phaser from 'phaser';

import { BALANCE_CONFIG } from '../config/BalanceConfig';

export class Warrior extends BaseUnit {
    public targetEntity: BaseEntity | null = null;
    public attackCooldown: number = 0;
    public readonly attackInterval: number = BALANCE_CONFIG.units.warrior.attackInterval;
    public readonly attackDamage: number = BALANCE_CONFIG.units.warrior.attackDamage;

    constructor(config: UnitConfig) {
        super(config);
        
        this.maxHealth = BALANCE_CONFIG.units.warrior.maxHealth;
        this.currentHealth = BALANCE_CONFIG.units.warrior.maxHealth;
        this.speed = BALANCE_CONFIG.units.warrior.speed; // Slower but tougher than Workers

        this.mainSprite.play(`${this.texturePrefix}-idle`);
        
        // Warrior sprites are 192x192 with the character in the center 64x64.
        this.mainSprite.setOrigin(0.5, 128 / 192);
        
        // Setup hitbox for warrior in local container space.
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );

        // Warriors patrol with longer intervals and wider radius
        this.resetWanderDelay(8000, 15000);
    }

    public override get canWander(): boolean {
        return this.workerState === 'IDLE' && !this.targetEntity;
    }

    public attackTarget(target: BaseEntity): void {
        if (!target || !target.active || target.currentHealth <= 0) {
            this.cancelAttack();
            return;
        }

        this.targetEntity = target;
        const inRange = Math.max(Math.abs(this.gridX - target.gridX), Math.abs(this.gridY - target.gridY)) <= 1;

        if (inRange) {
            this.cancelMovement();
            this.faceTarget(target);
            this.setWorkerState('ATTACK');
            this.attackCooldown = 200; // Quick initial strike
        } else {
            this.moveAdjacentToTarget(target);
        }
    }

    public cancelAttack(): void {
        this.targetEntity = null;
        if (this.workerState === 'ATTACK') {
            this.setWorkerState('IDLE');
        }
    }

    public faceTarget(target: BaseEntity): void {
        if (target.gridX < this.gridX) {
            this.mainSprite.setFlipX(true);
        } else if (target.gridX > this.gridX) {
            this.mainSprite.setFlipX(false);
        }
    }

    private moveAdjacentToTarget(target: BaseEntity): void {
        const scene = this.scene as any;
        if (!scene || !scene.gridManager) return;

        const startPos = { col: this.gridX, row: this.gridY };
        const adjTile = scene.gridManager.findAdjacentWalkable(target.gridX, target.gridY, startPos);

        if (adjTile) {
            scene.gridManager.findPath(startPos, adjTile, (path: GridPosition[]) => {
                if (path && path.length > 0) {
                    this.moveAlongPath(path, () => {
                        if (this.targetEntity === target && target.active && target.currentHealth > 0) {
                            const inRange = Math.max(Math.abs(this.gridX - target.gridX), Math.abs(this.gridY - target.gridY)) <= 1;
                            if (inRange) {
                                this.faceTarget(target);
                                this.setWorkerState('ATTACK');
                                this.attackCooldown = 200;
                            } else {
                                this.setWorkerState('IDLE');
                            }
                        }
                    });
                }
            });
        }
    }

    protected override onStateChange(newState: WorkerState): void {
        switch (newState) {
            case 'IDLE':
                this.mainSprite.play(`${this.texturePrefix}-idle`);
                break;
            case 'MOVING':
                this.mainSprite.play(`${this.texturePrefix}-run`);
                break;
            case 'ATTACK':
                this.mainSprite.play(`${this.texturePrefix}-attack`);
                break;
        }
    }

    public override update(time: number, delta: number): void {
        super.update(time, delta);

        if (this.targetEntity) {
            if (!this.targetEntity.active || this.targetEntity.currentHealth <= 0) {
                this.cancelAttack();
                return;
            }

            const inRange = Math.max(Math.abs(this.gridX - this.targetEntity.gridX), Math.abs(this.gridY - this.targetEntity.gridY)) <= 1;

            if (inRange) {
                if (this.isMoving) {
                    this.cancelMovement();
                }
                this.faceTarget(this.targetEntity);

                if (this.workerState !== 'ATTACK') {
                    this.setWorkerState('ATTACK');
                }

                this.attackCooldown -= delta;
                if (this.attackCooldown <= 0) {
                    this.attackCooldown = this.attackInterval;
                    this.targetEntity.takeDamage(this.attackDamage);
                    if (!this.targetEntity || !this.targetEntity.active || this.targetEntity.currentHealth <= 0) {
                        this.cancelAttack();
                    }
                }
            } else if (!this.isMoving) {
                // If target moved out of range and we are not moving, re-pathfind to it
                this.moveAdjacentToTarget(this.targetEntity);
            }
        }
    }
}
