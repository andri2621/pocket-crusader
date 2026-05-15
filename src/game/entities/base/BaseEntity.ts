import Phaser from 'phaser';
import { EntityConfig } from '../../../types/entity.types';

export abstract class BaseEntity extends Phaser.GameObjects.Container {
    public readonly id: string;
    public gridX: number = 0;
    public gridY: number = 0;
    public isSelected: boolean = false;
    
    public mainSprite: Phaser.GameObjects.Sprite;
    public selectionCircle: Phaser.GameObjects.Graphics;

    public maxHealth: number = 0;
    public currentHealth: number = 0;

    constructor(config: EntityConfig) {
        super(config.scene, config.x ?? 0, config.y ?? 0);
        
        this.id = Phaser.Math.RND.uuid();

        // Add to scene
        this.scene.add.existing(this);

        // Selection Ring (hidden by default)
        this.selectionCircle = this.scene.add.graphics();
        this.add(this.selectionCircle);
        
        // Main Sprite
        this.mainSprite = this.scene.add.sprite(0, 0, config.texture);
        this.mainSprite.setOrigin(0.5, 0.95); // Grounded appearance
        this.add(this.mainSprite);

        // Setup Grid Pos
        if (config.col !== undefined && config.row !== undefined) {
            this.setGridPosition(config.col, config.row);
        } else {
            // Calculate grid pos from x, y
            this.gridX = Math.floor(this.x / 64);
            this.gridY = Math.floor(this.y / 64);
            this.updatePixelPosition();
        }

        this.drawSelectionCircle();
        this.selectionCircle.setVisible(false);
    }

    public setGridPosition(col: number, row: number) {
        this.gridX = col;
        this.gridY = row;
        this.updatePixelPosition();
    }

    protected updatePixelPosition() {
        this.x = this.gridX * 64 + 32;
        this.y = this.gridY * 64 + 64;
        this.setDepth(this.y);
    }

    public setSelected(selected: boolean) {
        this.isSelected = selected;
        this.selectionCircle.setVisible(selected);
        if (selected) {
            this.mainSprite.setTint(0x00ff00);
        } else {
            this.mainSprite.clearTint();
        }
    }

    private drawSelectionCircle() {
        this.selectionCircle.clear();
        this.selectionCircle.lineStyle(2, 0x00ff00, 0.8);
        // Draw the circle inside the 64x64 tile
        this.selectionCircle.strokeCircle(0, -32, 18);
    }

    public takeDamage(amount: number) {
        if (this.currentHealth <= 0) return;
        
        this.currentHealth -= amount;
        
        // Generic shake effect on hit
        this.scene.tweens.add({
            targets: this.mainSprite,
            x: 4, // local offset
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.mainSprite.x = 0; // Container local space reset
            }
        });

        if (this.currentHealth <= 0) {
            this.onDeath();
        }
    }

    protected onDeath() {
        // Optional override for child classes
    }

    // Abstract method to be implemented by child classes
    public abstract update(time: number, delta: number): void;
}
