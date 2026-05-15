import { Scene } from 'phaser';

export interface EntityConfig {
    scene: Scene;
    x?: number; // Optional if using col/row instead
    y?: number; // Optional if using col/row instead
    col?: number;
    row?: number;
    texture: string;
}

export interface UnitConfig extends EntityConfig {
    speed?: number;
}

export interface BuildingConfig extends EntityConfig {
    buildingType: string;
    footprintWidth?: number;
    footprintHeight?: number;
}

export interface ResourceConfig extends EntityConfig {
    resourceType: string;
    maxHp: number;
    yieldPerHit: number;
}
