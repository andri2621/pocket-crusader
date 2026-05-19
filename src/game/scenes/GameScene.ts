import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { GridManager, TILE_SIZE, GRID_COLS, GRID_ROWS } from '../managers/GridManager';
import { EntityManager } from '../managers/EntityManager';
import { InteractionManager } from '../managers/InteractionManager';
import { Worker } from '../entities/Worker';
import { ResourceEntity } from '../entities/ResourceEntity';
import { GoldResource } from '../entities/GoldResource';
import { Stronghold } from '../entities/Stronghold';
import { King } from '../entities/King';
import { Warrior } from '../entities/Warrior';
import { Barracks } from '../entities/Barracks';
import { House } from '../entities/House';
import { GoldHut } from '../entities/GoldHut';
import { BuildingEntity } from '../entities/BuildingEntity';

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
    private socket: any;

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

        // 5. Setup Events
        this.events.on('warrior_trained', (barracks: Barracks) => {
            // Find a walkable tile near the barracks entrance (bottom edge)
            const entranceCol = barracks.gridX; 
            const entranceRow = barracks.gridY + 1; // Since it's 2x2, bottom edge is gridY + 1, below is gridY + 2
            
            // Standard 8-direction adjacency for unit spawning
            const spawnPos = this.gridManager.findAdjacentWalkable(entranceCol, entranceRow + 1, { col: entranceCol, row: entranceRow + 1 })
                          || this.gridManager.getRandomAdjacentWalkable(entranceCol, entranceRow + 1);

            if (spawnPos) {
                const faction = barracks.faction || 'blue';
                const texturePrefix = faction === 'blue' ? 'warrior' : 'warrior-red';
                const texture = `${texturePrefix}-idle`;
                const warrior = new Warrior({ 
                    scene: this, 
                    col: spawnPos.col, 
                    row: spawnPos.row, 
                    texture: texture,
                    faction: faction,
                    texturePrefix: texturePrefix
                });
                this.entityManager.addUnit(warrior);
            }
        });

        // 6. Setup Socket.IO Event Syncing
        this.socket = this.game.registry.get('socket');
        if (this.socket) {
            console.log(`%c[Phaser Socket Connected] Successfully inherited Lobby Socket ID: ${this.socket.id}`, "color: #00ff00; font-weight: bold;");

            this.socket.off('server_unit_move');
            this.socket.on('server_unit_move', (data: { entityId: string, targetCol: number, targetRow: number }) => {
                console.log(`[Client Receive] Remote move requested for ${data.entityId} to ${data.targetCol}, ${data.targetRow}`);
                
                const remoteUnit = this.entityManager.findUnitById(data.entityId);
                if (remoteUnit) {
                    if (remoteUnit instanceof Worker) {
                        remoteUnit.cancelBuilding();
                        remoteUnit.cancelHutAutomation();
                    }
                    // Force the remote unit to execute its pathfinding move
                    remoteUnit.moveToGrid(data.targetCol, data.targetRow);
                } else {
                    console.warn(`[Client Warning] Action ignored. Could not find remote unit with ID: ${data.entityId}`);
                }
            });

            this.socket.off('server_build_structure');
            this.socket.on('server_build_structure', (data: { type: string, col: number, row: number, entityId: string, faction: 'blue' | 'red' }) => {
                console.log(`[Client Receive] Remote build requested: ${data.type} at [Col:${data.col}, Row:${data.row}] with ID ${data.entityId}`);
                
                // Prevent duplicate spawns
                if (this.entityManager.buildings.some(b => b.id === data.entityId)) {
                    console.log(`[Client Info] Building ${data.entityId} already exists locally. Skipping.`);
                    return;
                }

                const width = (data.type === 'house' || data.type === 'barracks') ? 2 : 1;
                const height = (data.type === 'house' || data.type === 'barracks') ? 2 : 1;

                let newBuilding;
                if (data.type === 'house') {
                    newBuilding = new House({ scene: this, col: data.col, row: data.row, texture: 'house1', faction: data.faction, id: data.entityId });
                } else if (data.type === 'woodcutter_hut') {
                    newBuilding = new BuildingEntity({
                        scene: this, col: data.col, row: data.row,
                        texture: 'hut',
                        buildingType: 'woodcutter_hut',
                        faction: data.faction,
                        id: data.entityId
                    });
                } else if (data.type === 'gold_hut') {
                    newBuilding = new GoldHut({
                        scene: this, col: data.col, row: data.row,
                        texture: 'gold_hut',
                        buildingType: 'gold_hut',
                        faction: data.faction,
                        id: data.entityId
                    });
                } else if (data.type === 'barracks') {
                    newBuilding = new Barracks({
                        scene: this, col: data.col, row: data.row,
                        texture: 'barracks',
                        faction: data.faction,
                        id: data.entityId
                    });
                }

                if (newBuilding) {
                    this.entityManager.addBuilding(newBuilding);
                    this.gridManager.blockArea(data.col, data.row, width, height);
                    console.log(`[Client Success] Successfully spawned remote building ${data.entityId} and blocked grid.`);
                }
            });
        } else {
            console.error("[Phaser Fatal] Failed to inherit the active socket from React registry!");
        }

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

        // Spawn Gold
        const GOLD_TILES = [
            { col: 10, row: 5 },
            { col: 11, row: 5 },
        ];

        for (const obs of GOLD_TILES) {
            const gold = new GoldResource({
                scene: this, col: obs.col, row: obs.row, texture: 'gold_stone_6',
                resourceType: 'gold', maxHp: 60, yieldPerHit: 10
            });
            this.entityManager.addResource(gold);
            this.gridManager.blockTile(obs.col, obs.row);
        }

        // Spawn Stronghold
        const stronghold = new Stronghold({ scene: this, col: 15, row: 9, texture: 'castle', id: 'stronghold_0', faction: 'blue' });
        this.entityManager.addBuilding(stronghold);
        
        // Block 5x2 area: col-2 to col+2, row-1 to row
        // So for col 15, row 9: startCol 13, startRow 8, width 5, height 2
        this.gridManager.blockArea(13, 8, 5, 2);

        // Spawn King
        const king = new King({ scene: this, col: 14, row: 9, texture: 'pawn-idle', id: 'king_0', faction: 'blue', texturePrefix: 'pawn' });
        this.entityManager.addUnit(king);

        // Spawn initial Workers (deterministic faction locking)
        const worker1 = new Worker({ 
            scene: this, 
            col: 14, 
            row: 10, 
            texture: 'pawn-idle', 
            id: 'pawn_0', 
            faction: 'blue', 
            texturePrefix: 'pawn' 
        });
        const worker2 = new Worker({ 
            scene: this, 
            col: 17, 
            row: 10, 
            texture: 'pawn-red-idle', 
            id: 'pawn_1', 
            faction: 'red', 
            texturePrefix: 'pawn-red' 
        });
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
        const factions = [
            { prefix: 'pawn' },
            { prefix: 'pawn-red' }
        ];

        factions.forEach(({ prefix }) => {
            this.anims.create({ key: `${prefix}-idle`, frames: this.anims.generateFrameNumbers(`${prefix}-idle`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-run`, frames: this.anims.generateFrameNumbers(`${prefix}-run`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: `${prefix}-chop`, frames: this.anims.generateFrameNumbers(`${prefix}-chop`, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-idle-axe`, frames: this.anims.generateFrameNumbers(`${prefix}-idle-axe`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-run-axe`, frames: this.anims.generateFrameNumbers(`${prefix}-run-axe`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: `${prefix}-idle-wood`, frames: this.anims.generateFrameNumbers(`${prefix}-idle-wood`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-run-wood`, frames: this.anims.generateFrameNumbers(`${prefix}-run-wood`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: `${prefix}-idle-gold`, frames: this.anims.generateFrameNumbers(`${prefix}-idle-gold`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-run-gold`, frames: this.anims.generateFrameNumbers(`${prefix}-run-gold`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: `${prefix}-idle-hammer`, frames: this.anims.generateFrameNumbers(`${prefix}-idle-hammer`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-run-hammer`, frames: this.anims.generateFrameNumbers(`${prefix}-run-hammer`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: `${prefix}-build`, frames: this.anims.generateFrameNumbers(`${prefix}-build`, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-idle-pickaxe`, frames: this.anims.generateFrameNumbers(`${prefix}-idle-pickaxe`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-run-pickaxe`, frames: this.anims.generateFrameNumbers(`${prefix}-run-pickaxe`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: `${prefix}-mine`, frames: this.anims.generateFrameNumbers(`${prefix}-mine`, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
        });

        const warriorFactions = [
            { prefix: 'warrior' },
            { prefix: 'warrior-red' }
        ];

        warriorFactions.forEach(({ prefix }) => {
            this.anims.create({ key: `${prefix}-idle`, frames: this.anims.generateFrameNumbers(`${prefix}-idle`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
            this.anims.create({ key: `${prefix}-run`, frames: this.anims.generateFrameNumbers(`${prefix}-run`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: `${prefix}-attack`, frames: this.anims.generateFrameNumbers(`${prefix}-attack`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
        });

        this.anims.create({ key: 'tree-sway', frames: this.anims.generateFrameNumbers('tree', { start: 0, end: 7 }), frameRate: 4, repeat: -1 });
    }
}
