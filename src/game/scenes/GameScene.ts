import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { GridManager, TILE_SIZE, GRID_COLS, GRID_ROWS } from '../managers/GridManager';
import { EntityManager } from '../managers/EntityManager';
import { InteractionManager } from '../managers/InteractionManager';
import { Worker } from '../entities/Worker';
import { ResourceEntity } from '../entities/ResourceEntity';
import { Stronghold } from '../entities/Stronghold';
import { King } from '../entities/King';

const MAP_WIDTH = GRID_COLS * TILE_SIZE;
const MAP_HEIGHT = GRID_ROWS * TILE_SIZE;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

export class GameScene extends Scene {
    private gridManager: GridManager;
    private entityManager: EntityManager;
    private interactionManager: InteractionManager;

    private gridGraphics: Phaser.GameObjects.Graphics;
    private pinchStartDistance: number = 0;
    private pinchStartZoom: number = 1;

    constructor() {
        super('GameScene');
    }

    create() {
        this.createAnimations();
        this.drawTileGrid();
        this.drawGridLines();

        // 1. Initialize Managers
        this.gridManager = new GridManager(this);
        this.entityManager = new EntityManager(this, this.gridManager);
        this.interactionManager = new InteractionManager(this, this.entityManager, this.gridManager);

        // 2. Spawn Initial State
        this.spawnInitialWorld();

        // 3. Setup Camera
        this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        this.cameras.main.setScroll(0, 0);

        // 4. Setup Input
        this.input.addPointer(2);
        this.setupCameraInput();

        EventBus.emit('current-scene-ready', this);
    }

    update(time: number, delta: number) {
        this.handlePinchZoom();
        this.interactionManager.updateGhost();
        this.gridManager.update();
        this.entityManager.update(time, delta);
    }

    private spawnInitialWorld() {
        // Spawn Trees
        const OBSTACLE_TILES = [
            { col: 15, row: 5 },
            { col: 16, row: 5 },
            { col: 17, row: 5 },
        ];

        for (const obs of OBSTACLE_TILES) {
            const tree = new ResourceEntity({
                scene: this, col: obs.col, row: obs.row, texture: 'tree',
                resourceType: 'wood', maxHp: 3, yieldPerHit: 5
            });
            this.entityManager.addResource(tree);
            this.gridManager.blockTile(obs.col, obs.row);
        }

        // Spawn Stronghold
        const stronghold = new Stronghold({ scene: this, col: 15, row: 9, texture: 'castle' });
        this.entityManager.addBuilding(stronghold);
        
        // Block 5x2 area: col-2 to col+2, row-1 to row
        // So for col 15, row 9: startCol 13, startRow 8, width 5, height 2
        this.gridManager.blockArea(13, 8, 5, 2);

        // Spawn King
        const king = new King({ scene: this, col: 14, row: 9, texture: 'pawn-idle' });
        this.entityManager.addUnit(king);

        // Spawn initial Workers
        const worker1 = new Worker({ scene: this, col: 14, row: 10, texture: 'pawn-idle' });
        const worker2 = new Worker({ scene: this, col: 17, row: 10, texture: 'pawn-idle' });
        this.entityManager.addUnit(worker1);
        this.entityManager.addUnit(worker2);
    }

    // --- Visuals & Input ---

    private drawTileGrid() {
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * TILE_SIZE + TILE_SIZE / 2;
                const y = row * TILE_SIZE + TILE_SIZE / 2;
                this.add.image(x, y, 'grass_tiles', 10).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0);
            }
        }
    }

    private drawGridLines() {
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, 0x000000, 0.15);
        this.gridGraphics.setDepth(1);

        for (let col = 0; col <= GRID_COLS; col++) {
            this.gridGraphics.lineBetween(col * TILE_SIZE, 0, col * TILE_SIZE, MAP_HEIGHT);
        }
        for (let row = 0; row <= GRID_ROWS; row++) {
            this.gridGraphics.lineBetween(0, row * TILE_SIZE, MAP_WIDTH, row * TILE_SIZE);
        }
    }

    private setupCameraInput() {
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) return;
            // Don't pan camera while in build mode with pointer down (mobile drag)
            if (this.interactionManager.isInBuildMode) return;
            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        });

        this.input.on('wheel', (pointer: Phaser.Input.Pointer, _: any[], _dx: number, dy: number) => {
            const worldBefore = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.001, ZOOM_MIN, ZOOM_MAX);
            this.cameras.main.setZoom(newZoom);
            const worldAfter = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.cameras.main.scrollX += worldBefore.x - worldAfter.x;
            this.cameras.main.scrollY += worldBefore.y - worldAfter.y;
        });
    }

    private handlePinchZoom() {
        const pointer1 = this.input.pointer1;
        const pointer2 = this.input.pointer2;

        if (!pointer1.isDown || !pointer2.isDown) {
            this.pinchStartDistance = 0;
            return;
        }

        const currentDist = Phaser.Math.Distance.Between(pointer1.x, pointer1.y, pointer2.x, pointer2.y);
        if (this.pinchStartDistance === 0) {
            this.pinchStartDistance = currentDist;
            this.pinchStartZoom = this.cameras.main.zoom;
        } else {
            const zoomDelta = currentDist / this.pinchStartDistance;
            const newZoom = Phaser.Math.Clamp(this.pinchStartZoom * zoomDelta, ZOOM_MIN, ZOOM_MAX);
            this.cameras.main.setZoom(newZoom);
        }
    }

    private createAnimations() {
        // ── Standard Pawn Animations ──
        this.anims.create({ key: 'pawn-idle', frames: this.anims.generateFrameNumbers('pawn-idle', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'pawn-run', frames: this.anims.generateFrameNumbers('pawn-run', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'pawn-chop', frames: this.anims.generateFrameNumbers('pawn-chop', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'tree-sway', frames: this.anims.generateFrameNumbers('tree', { start: 0, end: 7 }), frameRate: 4, repeat: -1 });

        // ── Axe Worker Animations ──
        this.anims.create({ key: 'pawn-idle-axe', frames: this.anims.generateFrameNumbers('pawn-idle-axe', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'pawn-run-axe', frames: this.anims.generateFrameNumbers('pawn-run-axe', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });

        // ── Wood Carrying Animations ──
        this.anims.create({ key: 'pawn-idle-wood', frames: this.anims.generateFrameNumbers('pawn-idle-wood', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'pawn-run-wood', frames: this.anims.generateFrameNumbers('pawn-run-wood', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });

        // ── Hammer / Construction Animations ──
        this.anims.create({ key: 'pawn-idle-hammer', frames: this.anims.generateFrameNumbers('pawn-idle-hammer', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'pawn-run-hammer', frames: this.anims.generateFrameNumbers('pawn-run-hammer', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'pawn-build', frames: this.anims.generateFrameNumbers('pawn-build', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
    }
}
