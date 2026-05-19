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
import { useGameStore } from '../../store/useGameStore';

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
        this.events.on('warrior_trained', (barracks: Barracks, oldWorkerId: string) => {
            const store = useGameStore.getState();
            const faction = barracks.faction || 'blue';

            // Only spawn/emit if this barracks belongs to our faction!
            if (faction === store.faction) {
                // Strict matching check: Ensure target pawn matches barracks faction
                const targetPawn = this.entityManager.findUnitById(oldWorkerId);
                if (!targetPawn || targetPawn.faction !== faction) {
                    console.warn(`[Barracks Strict Spawn] Aborted: target pawn ${oldWorkerId} faction does not match barracks faction ${faction}`);
                    return;
                }

                // Find a walkable tile near the barracks entrance (bottom edge)
                const entranceCol = barracks.gridX; 
                const entranceRow = barracks.gridY + 1; // Since it's 2x2, bottom edge is gridY + 1, below is gridY + 2
                
                // Standard 8-direction adjacency for unit spawning
                const spawnPos = this.gridManager.findAdjacentWalkable(entranceCol, entranceRow + 1, { col: entranceCol, row: entranceRow + 1 })
                              || this.gridManager.getRandomAdjacentWalkable(entranceCol, entranceRow + 1);

                if (spawnPos) {
                    const newWarriorId = `warrior_${faction}_${Date.now()}`;
                    this.entityManager.spawnWarrior(spawnPos.col, spawnPos.row, faction, newWarriorId);

                    // Emit unit transformation sync
                    if (this.socket && store.roomId) {
                        console.log(`[Transform Sync] Emitting transformation of pawn ${oldWorkerId} -> warrior ${newWarriorId}`);
                        this.socket.emit('client_unit_transformed', {
                            roomId: String(store.roomId).trim(),
                            oldEntityId: oldWorkerId,
                            newEntityId: newWarriorId,
                            type: 'warrior',
                            col: spawnPos.col,
                            row: spawnPos.row,
                            faction
                        });
                    }
                }
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

            this.socket.off('server_start_gathering');
            this.socket.on('server_start_gathering', (data: { entityId: string, resourceX: number, resourceY: number, resourceType: string }) => {
                console.log(`[Client Receive] Remote start gathering: worker ${data.entityId} at resource [${data.resourceX}, ${data.resourceY}]`);
                const remoteUnit = this.entityManager.findUnitById(data.entityId);
                if (remoteUnit && remoteUnit instanceof Worker) {
                    const worker = remoteUnit as Worker;
                    worker.cancelBuilding();
                    worker.cancelHutAutomation();

                    const resource = this.entityManager.resources.find(r => r.gridX === data.resourceX && r.gridY === data.resourceY);
                    if (resource) {
                        const startPos = { col: worker.gridX, row: worker.gridY };
                        const adjTile = this.gridManager.findCardinalAdjacentWalkable(resource.gridX, resource.gridY, startPos);
                        if (adjTile) {
                            worker.setTargetResource(resource);
                            this.gridManager.findPath(startPos, adjTile, (path) => {
                                if (path) {
                                    worker.moveAlongPath(path, () => {
                                        worker.startGathering(resource);
                                    });
                                }
                            });
                        } else {
                            // Already adjacent?
                            const dx = Math.abs(worker.gridX - resource.gridX);
                            const dy = Math.abs(worker.gridY - resource.gridY);
                            if (dx + dy === 1) {
                                worker.startGathering(resource);
                            }
                        }
                    }
                }
            });

            this.socket.off('server_start_constructing');
            this.socket.on('server_start_constructing', (data: { entityId: string, buildingId: string }) => {
                console.log(`[Client Receive] Remote start constructing: worker ${data.entityId} for building ${data.buildingId}`);
                const remoteUnit = this.entityManager.findUnitById(data.entityId);
                if (remoteUnit && remoteUnit instanceof Worker) {
                    const worker = remoteUnit as Worker;
                    worker.cancelBuilding();
                    worker.cancelHutAutomation();

                    const building = this.entityManager.buildings.find(b => b.id === data.buildingId);
                    if (building) {
                        const startPos = { col: worker.gridX, row: worker.gridY };
                        const adjTile = this.entityManager.findAdjacentToBuilding(building, startPos);
                        if (adjTile) {
                            worker.isConstructionJob = true;
                            worker.setTargetBuilding(building);
                            this.gridManager.findPath(startPos, adjTile, (path) => {
                                if (path) {
                                    worker.moveAlongPath(path, () => {
                                        if (!building.isCompleted) {
                                            worker.startBuilding(building);
                                        } else {
                                            worker.cancelBuilding();
                                            worker.setWorkerState('IDLE');
                                        }
                                    });
                                }
                            });
                        } else {
                            // Already adjacent?
                            if (this.entityManager.isAdjacentToBuilding(worker, building)) {
                                worker.startBuilding(building);
                            }
                        }
                    }
                }
            });

            this.socket.off('server_resource_depleted');
            this.socket.on('server_resource_depleted', (data: { resourceX: number, resourceY: number, amount: number }) => {
                console.log(`[Client Receive] Remote resource depletion at [${data.resourceX}, ${data.resourceY}] by amount ${data.amount}`);
                const resource = this.entityManager.resources.find(r => r.gridX === data.resourceX && r.gridY === data.resourceY);
                if (resource) {
                    resource.takeDamage(data.amount);
                }
            });
            this.socket.off('server_spawn_unit');
            this.socket.on('server_spawn_unit', (data: { type: string, col: number, row: number, entityId: string, faction: 'blue' | 'red' }) => {
                console.log(`[Client Receive] Remote unit spawn requested: ${data.type} with ID ${data.entityId}`);
                if (this.entityManager.findUnitById(data.entityId)) return; // Prevent duplicate

                const texturePrefix = data.faction === 'blue' ? 'pawn' : 'pawn-red';
                const texture = `${texturePrefix}-idle`;

                if (data.type === 'worker') {
                    const worker = new Worker({
                        scene: this,
                        col: data.col,
                        row: data.row,
                        texture: texture,
                        faction: data.faction,
                        texturePrefix: texturePrefix,
                        id: data.entityId
                    });
                    this.entityManager.addUnit(worker);
                }
            });

            this.socket.off('server_unit_transformed');
            this.socket.on('server_unit_transformed', (data: { oldEntityId: string, newEntityId: string, col: number, row: number, faction: 'blue' | 'red', barracksId: string }) => {
                console.log("[Receiver Swap Triggered]", data);
                
                // 1. Destroy the remote copy of the pawn
                const remotePawn = this.entityManager.getUnitById(data.oldEntityId);
                if (remotePawn) {
                    // Safely unselect from interaction handlers
                    this.events.emit('force_deselect_unit', data.oldEntityId);
                    
                    remotePawn.destroy();
                    this.entityManager.removeUnitFromList(data.oldEntityId);
                }
                
                // 2. Wipe the placeholder queue indicator above the barracks
                const barracks = this.entityManager.getBuildingById(data.barracksId) as Barracks;
                if (barracks) {
                    barracks.wipeRemoteRecruitPlaceholder();
                }
                
                // 3. Spawn the synced Warrior sprite
                this.entityManager.spawnWarrior(data.col, data.row, data.faction, data.newEntityId);
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

            this.socket.off('server_resource_harvested');
            this.socket.on('server_resource_harvested', (data: { resourceId: string, amountHarvested: number }) => {
                console.log(`[Client Receive] Remote resource harvest: ${data.resourceId} by amount ${data.amountHarvested}`);
                const resource = this.entityManager.resources.find(r => r.id === data.resourceId);
                if (resource) {
                    resource.takeDamage(data.amountHarvested);
                }
            });

            this.socket.off('server_start_training');
            this.socket.on('server_start_training', (data: { barracksId: string, unitType: string }) => {
                console.log(`[Client Receive] Remote start training: barracks ${data.barracksId}, type ${data.unitType}`);
                const barracks = this.entityManager.buildings.find(b => b.id === data.barracksId) as Barracks;
                if (barracks) {
                    barracks.addRemoteWorkerToQueue(data.unitType);
                }
            });

            this.socket.off('server_construction_progress');
            this.socket.on('server_construction_progress', (data: { buildingId: string, progress: number }) => {
                console.log(`[Client Receive] Remote construction progress: building ${data.buildingId} is at ${data.progress}%`);
                const building = this.entityManager.buildings.find(b => b.id === data.buildingId);
                if (building) {
                    building.progress = data.progress;
                    building.updateProgressBar();
                    building.updateConstructionVisuals();

                    if (building.progress >= 100 && !building.isCompleted) {
                        building.completeConstruction();
                    }
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

        // ── Zone Blue (Left Starting Base) ──────────────────────
        const strongholdBlue = new Stronghold({ scene: this, col: 6, row: 9, texture: 'castle', id: 'stronghold_blue', faction: 'blue' });
        this.entityManager.addBuilding(strongholdBlue);
        this.gridManager.blockArea(4, 8, 5, 2);

        const kingBlue = new King({ scene: this, col: 5, row: 9, texture: 'pawn-idle', id: 'king_blue', faction: 'blue', texturePrefix: 'pawn' });
        this.entityManager.addUnit(kingBlue);

        const bluePawn0 = new Worker({ scene: this, col: 5, row: 10, texture: 'pawn-idle', id: 'pawn_blue_0', faction: 'blue', texturePrefix: 'pawn' });
        const bluePawn1 = new Worker({ scene: this, col: 6, row: 11, texture: 'pawn-idle', id: 'pawn_blue_1', faction: 'blue', texturePrefix: 'pawn' });
        const bluePawn2 = new Worker({ scene: this, col: 7, row: 10, texture: 'pawn-idle', id: 'pawn_blue_2', faction: 'blue', texturePrefix: 'pawn' });
        this.entityManager.addUnit(bluePawn0);
        this.entityManager.addUnit(bluePawn1);
        this.entityManager.addUnit(bluePawn2);

        // ── Zone Red (Right Starting Base) ─────────────────────
        const strongholdRed = new Stronghold({ scene: this, col: 25, row: 9, texture: 'castle', id: 'stronghold_red', faction: 'red' });
        this.entityManager.addBuilding(strongholdRed);
        this.gridManager.blockArea(23, 8, 5, 2);

        const kingRed = new King({ scene: this, col: 24, row: 9, texture: 'pawn-red-idle', id: 'king_red', faction: 'red', texturePrefix: 'pawn-red' });
        this.entityManager.addUnit(kingRed);

        const redPawn0 = new Worker({ scene: this, col: 24, row: 10, texture: 'pawn-red-idle', id: 'pawn_red_0', faction: 'red', texturePrefix: 'pawn-red' });
        const redPawn1 = new Worker({ scene: this, col: 25, row: 11, texture: 'pawn-red-idle', id: 'pawn_red_1', faction: 'red', texturePrefix: 'pawn-red' });
        const redPawn2 = new Worker({ scene: this, col: 26, row: 10, texture: 'pawn-red-idle', id: 'pawn_red_2', faction: 'red', texturePrefix: 'pawn-red' });
        this.entityManager.addUnit(redPawn0);
        this.entityManager.addUnit(redPawn1);
        this.entityManager.addUnit(redPawn2);
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
