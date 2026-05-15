import { BaseUnit } from './base/BaseUnit';
import { UnitConfig } from '../../types/entity.types';
import { WorkerState } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';
import Phaser from 'phaser';

export class King extends BaseUnit {
    constructor(config: UnitConfig) {
        super(config);
        
        this.maxHealth = 500;
        this.currentHealth = 500;

        // Scale up the king and add golden tint
        this.mainSprite.setScale(1.3);
        this.mainSprite.setTint(0xfff000); // Memberikan efek kilau emas tipis
        this.mainSprite.play('pawn-idle');
        this.mainSprite.setOrigin(0.5, 128 / 192);

        // Setup hitbox for worker in local container space.
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );

        // Golden Aura
        const aura = this.scene.add.graphics();
        aura.fillStyle(0xFFD700, 0.3);
        aura.fillEllipse(0, -10, 40, 20);
        this.add(aura);
        this.moveTo(aura, 0); // Move to back

        // Crown
        const crown = this.scene.add.graphics();
        crown.fillStyle(0xFFD700, 1);
        crown.beginPath();
        crown.moveTo(-10, -70);
        crown.lineTo(-15, -85);
        crown.lineTo(-5, -75);
        crown.lineTo(0, -90);
        crown.lineTo(5, -75);
        crown.lineTo(15, -85);
        crown.lineTo(10, -70);
        crown.closePath();
        crown.fillPath();
        this.add(crown);

        // Label
        const label = this.scene.add.text(0, -100, 'THE KING', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.add(label);
    }

    protected override onStateChange(newState: WorkerState): void {
        switch (newState) {
            case 'IDLE':
                this.mainSprite.play('pawn-idle');
                break;
            case 'MOVING':
                this.mainSprite.play('pawn-run');
                break;
        }
    }

    protected override onDeath(): void {
        useGameStore.getState().setGameOver(true);
        this.mainSprite.setTint(0xff0000);
        this.mainSprite.setAlpha(0.5);
    }
}
