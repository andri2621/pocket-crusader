import { BaseBuilding } from './base/BaseBuilding';
import { BuildingConfig } from '../../types/entity.types';

export class GoldHut extends BaseBuilding {
    public maxWorkers: number = 2;
    public assignedWorkers: string[] = [];
    private occupancyLabel: Phaser.GameObjects.Text;

    constructor(config: BuildingConfig) {
        super({
            ...config,
            buildingType: 'gold_hut'
        });
        
        // Only becomes a drop-off when construction is complete
        this.isDropOff = false;
        this.acceptedResources = ['gold'];

        // Adjust origin based on gold_hut sprite specifics
        this.mainSprite.setOrigin(0.5, 0.9);
        this.mainSprite.setScale(0.6);

        // Setup hitbox for Building in local container space.
        this.setInteractive(
            new Phaser.Geom.Rectangle(-32, -64, 64, 64),
            Phaser.Geom.Rectangle.Contains
        );

        // Emit an event so GridManager/EntityManager knows a building was placed
        this.scene.events.emit('building_placed', this);
    }

    public addWorker(workerId: string): boolean {
        if (this.assignedWorkers.length < this.maxWorkers && !this.assignedWorkers.includes(workerId)) {
            this.assignedWorkers.push(workerId);
            this.updateOccupancyUI();
            return true;
        }
        return false;
    }

    public removeWorker(workerId: string) {
        this.assignedWorkers = this.assignedWorkers.filter(id => id !== workerId);
        this.updateOccupancyUI();
    }

    private updateOccupancyUI() {
        if (!this.isCompleted) return;

        if (!this.occupancyLabel) {
            // Position above the roof
            this.occupancyLabel = this.scene.add.text(0, -90, '', {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: '#000000aa',
                padding: { left: 4, right: 4, top: 2, bottom: 2 }
            }).setOrigin(0.5);
            this.add(this.occupancyLabel);
        }

        this.occupancyLabel.setText(`👤 ${this.assignedWorkers.length}/${this.maxWorkers}`);
    }

    public override completeConstruction() {
        super.completeConstruction();
        this.isDropOff = true;
        this.updateOccupancyUI();
    }
}
