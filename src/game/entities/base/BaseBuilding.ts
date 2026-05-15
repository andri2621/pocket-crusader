import { BaseEntity } from './BaseEntity';
import { BuildingConfig } from '../../../types/entity.types';

export abstract class BaseBuilding extends BaseEntity {
    public buildingType: string;
    public footprint: { width: number; height: number };
    public isCompleted: boolean = false;
    public isDropOff: boolean = false;

    // Construction Limits
    public maxBuilders: number = 3;
    public currentBuilders: string[] = [];

    // ── Construction Progress ──────────────────────────────
    public progress: number = 0;
    public isUnderConstruction: boolean = true;
    private progressBarBg: Phaser.GameObjects.Graphics;
    private progressBarFill: Phaser.GameObjects.Graphics;

    private static readonly BAR_WIDTH = 40;
    private static readonly BAR_HEIGHT = 6;
    private static readonly BAR_OFFSET_Y = -80; // Above the building's roof

    constructor(config: BuildingConfig) {
        super(config);
        this.buildingType = config.buildingType;
        this.footprint = {
            width: config.footprintWidth ?? 1,
            height: config.footprintHeight ?? 1
        };

        // ── Progress Bar (drawn in container-local space) ──
        this.progressBarBg = this.scene.add.graphics();
        this.add(this.progressBarBg);

        this.progressBarFill = this.scene.add.graphics();
        this.add(this.progressBarFill);

        // Initially hidden — shown only when 0 < progress < 100
        this.progressBarBg.setVisible(false);
        this.progressBarFill.setVisible(false);
    }

    public get availableBuilderSpots(): number {
        return Math.max(0, this.maxBuilders - this.currentBuilders.length);
    }

    public addBuilder(workerId: string): boolean {
        if (this.currentBuilders.length < this.maxBuilders && !this.currentBuilders.includes(workerId)) {
            this.currentBuilders.push(workerId);
            return true;
        }
        return false;
    }

    public removeBuilder(workerId: string) {
        this.currentBuilders = this.currentBuilders.filter(id => id !== workerId);
    }

    /**
     * Add progress to the building's construction.
     * Multiple workers can call this simultaneously to speed up.
     */
    public addProgress(amount: number) {
        if (this.isCompleted) return;

        this.progress = Math.min(this.progress + amount, 100);
        this.updateProgressBar();

        if (this.progress >= 100) {
            this.completeConstruction();
        }
    }

    /**
     * Draw/update the progress bar visuals.
     */
    private updateProgressBar() {
        const show = this.progress > 0 && this.progress < 100;
        this.progressBarBg.setVisible(show);
        this.progressBarFill.setVisible(show);

        if (!show) return;

        const w = BaseBuilding.BAR_WIDTH;
        const h = BaseBuilding.BAR_HEIGHT;
        const y = BaseBuilding.BAR_OFFSET_Y;
        const x = -w / 2;

        // Background
        this.progressBarBg.clear();
        this.progressBarBg.fillStyle(0x222222, 0.8);
        this.progressBarBg.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 2);

        // Fill
        const fillWidth = (this.progress / 100) * w;
        this.progressBarFill.clear();

        // Color gradient: red → yellow → green based on progress
        let fillColor: number;
        if (this.progress < 50) {
            fillColor = 0xffaa00; // orange-yellow for early progress
        } else {
            fillColor = 0x00ff00; // green for later progress
        }

        this.progressBarFill.fillStyle(fillColor, 1);
        this.progressBarFill.fillRoundedRect(x, y, fillWidth, h, 2);
    }

    public completeConstruction() {
        this.isCompleted = true;
        this.isUnderConstruction = false;
        this.progress = 100;
        this.currentBuilders = []; // Clear builders
        this.mainSprite.clearTint();
        this.setAlpha(1.0);

        // Hide progress bar
        this.progressBarBg.setVisible(false);
        this.progressBarFill.setVisible(false);

        // Notify the system that this building finished construction
        this.scene.events.emit('building_completed', this);
    }

    public override update(time: number, delta: number): void {
        // Base update logic
    }
}
