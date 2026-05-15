import { BaseEntity } from './BaseEntity';
import { BuildingConfig } from '../../../types/entity.types';

export abstract class BaseBuilding extends BaseEntity {
    public buildingType: string;
    public footprint: { width: number; height: number };
    public isCompleted: boolean = false;

    constructor(config: BuildingConfig) {
        super(config);
        this.buildingType = config.buildingType;
        this.footprint = {
            width: config.footprintWidth ?? 1,
            height: config.footprintHeight ?? 1
        };
    }

    public completeConstruction() {
        this.isCompleted = true;
        this.mainSprite.clearTint();
    }

    public override update(time: number, delta: number): void {
        // Base update logic
    }
}
