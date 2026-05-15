import { Scene } from 'phaser';
import { BaseUnit } from '../entities/base/BaseUnit';
import { BaseBuilding } from '../entities/base/BaseBuilding';
import { BaseResource } from '../entities/base/BaseResource';
import { GridPosition, BuildingType } from '../../types/game';

export class EntityManager {
    private scene: Scene;
    public units: BaseUnit[] = [];
    public buildings: BaseBuilding[] = [];
    public resources: BaseResource[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public addUnit(unit: BaseUnit) {
        this.units.push(unit);
    }

    public addBuilding(building: BaseBuilding) {
        this.buildings.push(building);
    }

    public addResource(resource: BaseResource) {
        this.resources.push(resource);
    }

    public update(time: number, delta: number) {
        for (const unit of this.units) {
            unit.update(time, delta);
        }
        for (const building of this.buildings) {
            building.update(time, delta);
        }
        for (const resource of this.resources) {
            resource.update(time, delta);
        }
    }

    public getResourceAt(col: number, row: number): BaseResource | undefined {
        return this.resources.find(r => r.gridX === col && r.gridY === row);
    }

    public getNearestBuilding(fromPos: GridPosition, type: BuildingType): BaseBuilding | undefined {
        const matching = this.buildings.filter(b => b.buildingType === type);
        if (matching.length === 0) return undefined;

        let nearest = matching[0];
        let minDist = Infinity;

        for (const b of matching) {
            const dist = Math.abs(b.gridX - fromPos.col) + Math.abs(b.gridY - fromPos.row);
            if (dist < minDist) {
                minDist = dist;
                nearest = b;
            }
        }
        return nearest;
    }

    public getNearestResource(fromPos: GridPosition, resourceType?: string): BaseResource | undefined {
        const matching = resourceType ? this.resources.filter(r => r.resourceType === resourceType && r.currentHealth > 0) : this.resources.filter(r => r.currentHealth > 0);
        if (matching.length === 0) return undefined;

        let nearest = matching[0];
        let minDist = Infinity;

        for (const r of matching) {
            const dist = Math.abs(r.gridX - fromPos.col) + Math.abs(r.gridY - fromPos.row);
            if (dist < minDist) {
                minDist = dist;
                nearest = r;
            }
        }
        return nearest;
    }
}
