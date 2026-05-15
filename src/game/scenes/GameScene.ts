import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import * as EasyStar from 'easystarjs';
import { useGameStore } from '../../store/useGameStore';

// ── Grid Constants ──────────────────────────────────────────────
const TILE_SIZE = 64;
const GRID_COLS = 32;
const GRID_ROWS = 18;
const MAP_WIDTH = GRID_COLS * TILE_SIZE;   // 2048
const MAP_HEIGHT = GRID_ROWS * TILE_SIZE;  // 1152

// ── Tile Types ──────────────────────────────────────────────────
const TILE_WALKABLE = 0;
const TILE_BLOCKED = 1;

// ── Worker States ───────────────────────────────────────────────
type WorkerState = 'IDLE' | 'MOVING' | 'CHOPPING' | 'CARRYING' | 'DEPOSITING';

// ── Tree / Building Constants ───────────────────────────────────
const TREE_MAX_HP = 3;
const WOOD_PER_HIT = 5;
const CHOP_INTERVAL = 2000;
const BUILDING_COST_WOOD = 50;

// ── Obstacle Layout ─────────────────────────────────────────────
// L-shaped forest wall + small cluster for A* pathfinding testing
const OBSTACLE_TILES: { col: number; row: number }[] = [
    // Vertical wall: column 15, rows 3 to 12
    ...Array.from({ length: 10 }, (_, i) => ({ col: 15, row: 3 + i })),
    // Horizontal branch: row 8, columns 15 to 22
    ...Array.from({ length: 8 }, (_, i) => ({ col: 15 + i, row: 8 })),
    // Small cluster: scattered trees near bottom-right
    { col: 24, row: 13 }, { col: 25, row: 13 }, { col: 24, row: 14 }, { col: 25, row: 14 },
    { col: 26, row: 13 }, { col: 26, row: 14 },
];

// ── Camera Constants ────────────────────────────────────────────
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const TAP_THRESHOLD = 10;

export class GameScene extends Scene
{
    // ── Grid & Pathfinding ──────────────────────────────────
    private walkGrid: number[][];
    private easystar: EasyStar.js;

    // ── Worker ──────────────────────────────────────────────
    private worker: Phaser.GameObjects.Sprite;
    private workerGridX: number = 2;
    private workerGridY: number = 2;
    private workerState: WorkerState = 'IDLE';
    private isMoving: boolean = false;
    private isCarrying: boolean = false;
    private carriedWood: number = 0;
    private currentTweenChain: Phaser.Tweens.TweenChain | null = null;

    // ── Chopping ────────────────────────────────────────────
    private chopTimer: Phaser.Time.TimerEvent | null = null;
    private chopTargetTree: Phaser.GameObjects.Sprite | null = null;
    private chopTargetKey: string = '';
    private lastChopTreeCol: number = -1;
    private lastChopTreeRow: number = -1;

    // ── Tree Health ─────────────────────────────────────────
    private treeHealth: Map<string, number> = new Map();

    // ── Unit Selection ──────────────────────────────────────
    private selectedUnit: Phaser.GameObjects.Sprite | null = null;
    private selectionRing: Phaser.GameObjects.Graphics;

    // ── Tree Tracking ───────────────────────────────────────
    private treeSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

    // ── Buildings ────────────────────────────────────────────
    private buildings: { type: string; sprite: Phaser.GameObjects.Image; col: number; row: number }[] = [];
    private ghostBuilding: Phaser.GameObjects.Image | null = null;
    private isPlacingBuilding: string | null = null;

    // ── Visual Feedback ─────────────────────────────────────
    private gridGraphics: Phaser.GameObjects.Graphics;
    private tapIndicator: Phaser.GameObjects.Graphics;

    // ── Pinch-to-Zoom ───────────────────────────────────────
    private pinchStartDistance: number = 0;
    private pinchStartZoom: number = 1;

    constructor ()
    {
        super('GameScene');
    }

    create ()
    {
        // ── 1. Create Animations ────────────────────────────
        this.createAnimations();

        // ── 2. Draw the Tile Grid ───────────────────────────
        this.drawTileGrid();

        // ── 3. Draw debug grid lines ────────────────────────
        this.drawGridLines();

        // ── 4. Initialize Collision Grid & Pathfinding ──────
        this.initPathfinding();

        // ── 5. Render Obstacles (trees) ─────────────────────
        this.placeObstacles();

        // ── 6. Place the Worker ─────────────────────────────
        this.placeWorker();

        // ── 7. Setup visual feedback layers ─────────────────
        this.selectionRing = this.add.graphics();
        this.selectionRing.setDepth(9);

        this.tapIndicator = this.add.graphics();
        this.tapIndicator.setDepth(5);

        // ── 8. Setup Camera ─────────────────────────────────
        this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        this.cameras.main.setScroll(0, 0);

        // ── 9. Enable multi-touch (for pinch-to-zoom) ───────
        this.input.addPointer(2);

        // ── 10. Setup Input (Pan, Tap, Pinch, Wheel) ────────
        this.setupInput();

        // ── 11. Notify React bridge ─────────────────────────
        EventBus.emit('current-scene-ready', this);
    }

    update ()
    {
        this.easystar.calculate();
        this.handlePinchZoom();
        this.drawSelectionRing();
        this.updateBuildingGhost();
    }

    // ═══════════════════════════════════════════════════════════
    //  ANIMATIONS
    // ═══════════════════════════════════════════════════════════

    private createAnimations (): void
    {
        // Pawn Idle — 8 frames
        this.anims.create({
            key: 'pawn-idle',
            frames: this.anims.generateFrameNumbers('pawn-idle', { start: 0, end: 7 }),
            frameRate: 8,
            repeat: -1,
        });

        // Pawn Run — 6 frames
        this.anims.create({
            key: 'pawn-run',
            frames: this.anims.generateFrameNumbers('pawn-run', { start: 0, end: 5 }),
            frameRate: 10,
            repeat: -1,
        });

        // Pawn Chop — 6 frames
        this.anims.create({
            key: 'pawn-chop',
            frames: this.anims.generateFrameNumbers('pawn-chop', { start: 0, end: 5 }),
            frameRate: 8,
            repeat: -1,
        });

        // Tree sway — 8 frames (slow, ambient)
        this.anims.create({
            key: 'tree-sway',
            frames: this.anims.generateFrameNumbers('tree', { start: 0, end: 7 }),
            frameRate: 4,
            repeat: -1,
        });

        // Pawn Idle with Wood — 8 frames
        this.anims.create({
            key: 'pawn-idle-wood',
            frames: this.anims.generateFrameNumbers('pawn-idle-wood', { start: 0, end: 7 }),
            frameRate: 8,
            repeat: -1,
        });

        // Pawn Run with Wood — 6 frames
        this.anims.create({
            key: 'pawn-run-wood',
            frames: this.anims.generateFrameNumbers('pawn-run-wood', { start: 0, end: 5 }),
            frameRate: 10,
            repeat: -1,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  INPUT SYSTEM — Pan, Tap, Pinch, Wheel
    // ═══════════════════════════════════════════════════════════

    private setupInput (): void
    {
        // ── Camera Panning (single-finger drag) ─────────────
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) return;

            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        });

        // ── Tap Detection (on pointer up) ───────────────────
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const distance = Phaser.Math.Distance.Between(
                pointer.downX, pointer.downY,
                pointer.upX, pointer.upY
            );

            if (distance < TAP_THRESHOLD) {
                this.handleTap(pointer);
            }
        });

        // ── Mouse Wheel Zoom (desktop support) ──────────────
        this.input.on('wheel', (
            pointer: Phaser.Input.Pointer,
            _gameObjects: Phaser.GameObjects.GameObject[],
            _deltaX: number,
            deltaY: number
        ) => {
            const worldBefore = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

            const newZoom = Phaser.Math.Clamp(
                this.cameras.main.zoom - deltaY * 0.001,
                ZOOM_MIN,
                ZOOM_MAX
            );
            this.cameras.main.setZoom(newZoom);

            const worldAfter = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

            this.cameras.main.scrollX += worldBefore.x - worldAfter.x;
            this.cameras.main.scrollY += worldBefore.y - worldAfter.y;
        });
    }

    // ── Pinch-to-Zoom ───────────────────────────────────────
    private handlePinchZoom (): void
    {
        const pointer1 = this.input.pointer1;
        const pointer2 = this.input.pointer2;

        if (!pointer1.isDown || !pointer2.isDown) {
            this.pinchStartDistance = 0;
            return;
        }

        const currentDist = Phaser.Math.Distance.Between(
            pointer1.x, pointer1.y,
            pointer2.x, pointer2.y
        );

        if (this.pinchStartDistance === 0) {
            this.pinchStartDistance = currentDist;
            this.pinchStartZoom = this.cameras.main.zoom;
        } else {
            const zoomDelta = currentDist / this.pinchStartDistance;
            const newZoom = Phaser.Math.Clamp(
                this.pinchStartZoom * zoomDelta,
                ZOOM_MIN,
                ZOOM_MAX
            );
            this.cameras.main.setZoom(newZoom);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  GRID RENDERING
    // ═══════════════════════════════════════════════════════════

    private drawTileGrid (): void
    {
        for (let row = 0; row < GRID_ROWS; row++)
        {
            for (let col = 0; col < GRID_COLS; col++)
            {
                const x = col * TILE_SIZE + TILE_SIZE / 2;
                const y = row * TILE_SIZE + TILE_SIZE / 2;

                const tile = this.add.image(x, y, 'grass');
                tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
                tile.setDepth(0);
            }
        }
    }

    private drawGridLines (): void
    {
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, 0x000000, 0.15);
        this.gridGraphics.setDepth(1);

        for (let col = 0; col <= GRID_COLS; col++)
        {
            this.gridGraphics.lineBetween(
                col * TILE_SIZE, 0,
                col * TILE_SIZE, MAP_HEIGHT
            );
        }

        for (let row = 0; row <= GRID_ROWS; row++)
        {
            this.gridGraphics.lineBetween(
                0, row * TILE_SIZE,
                MAP_WIDTH, row * TILE_SIZE
            );
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  PATHFINDING
    // ═══════════════════════════════════════════════════════════

    private initPathfinding (): void
    {
        this.walkGrid = [];
        for (let row = 0; row < GRID_ROWS; row++)
        {
            const rowArr: number[] = [];
            for (let col = 0; col < GRID_COLS; col++)
            {
                rowArr.push(TILE_WALKABLE);
            }
            this.walkGrid.push(rowArr);
        }

        for (const obs of OBSTACLE_TILES)
        {
            if (obs.row >= 0 && obs.row < GRID_ROWS && obs.col >= 0 && obs.col < GRID_COLS)
            {
                this.walkGrid[obs.row][obs.col] = TILE_BLOCKED;
            }
        }

        this.easystar = new EasyStar.js();
        this.easystar.setGrid(this.walkGrid);
        this.easystar.setAcceptableTiles([TILE_WALKABLE]);
        this.easystar.enableDiagonals();
        this.easystar.disableCornerCutting();
        this.easystar.setIterationsPerCalculation(1000);
    }

    /**
     * Places animated tree sprites on every blocked tile.
     * Each tree is tracked in a Map keyed by "col,row" for lookup during chopping.
     */
    private placeObstacles (): void
    {
        for (const obs of OBSTACLE_TILES)
        {
            if (obs.row >= 0 && obs.row < GRID_ROWS && obs.col >= 0 && obs.col < GRID_COLS)
            {
                const pos = this.gridToPixel(obs.col, obs.row);

                // Tree sprite is 192x256 — anchor it to sit on the tile
                // Center horizontally, but offset vertically so the trunk sits on the tile
                const tree = this.add.sprite(pos.x, pos.y - 28, 'tree');
                tree.setDisplaySize(TILE_SIZE * 1.2, TILE_SIZE * 1.6);
                tree.setDepth(2);
                tree.play('tree-sway');

                // Store reference for chopping interaction
                this.treeSprites.set(`${obs.col},${obs.row}`, tree);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  WORKER
    // ═══════════════════════════════════════════════════════════

    private placeWorker (): void
    {
        const pixelPos = this.gridToPixel(this.workerGridX, this.workerGridY);

        this.worker = this.add.sprite(pixelPos.x, pixelPos.y, 'pawn-idle');
        this.worker.setDisplaySize(TILE_SIZE, TILE_SIZE);
        this.worker.setDepth(10);
        this.worker.setInteractive({ useHandCursor: true });
        this.worker.play('pawn-idle');
        this.workerState = 'IDLE';
    }

    // ═══════════════════════════════════════════════════════════
    //  WORKER STATE MACHINE
    // ═══════════════════════════════════════════════════════════

    private setWorkerState (state: WorkerState): void
    {
        this.workerState = state;

        switch (state) {
            case 'IDLE':
                this.worker.play(this.isCarrying ? 'pawn-idle-wood' : 'pawn-idle');
                break;
            case 'MOVING':
                this.worker.play(this.isCarrying ? 'pawn-run-wood' : 'pawn-run');
                break;
            case 'CHOPPING':
                this.worker.play('pawn-chop');
                break;
            case 'CARRYING':
                this.worker.play('pawn-idle-wood');
                break;
            case 'DEPOSITING':
                this.worker.play('pawn-idle-wood');
                break;
        }
    }

    /**
     * Cancels any active chopping timer and resets chopping state.
     */
    private cancelChopping (): void
    {
        if (this.chopTimer) {
            this.chopTimer.destroy();
            this.chopTimer = null;
        }
        this.chopTargetTree = null;
    }

    /**
     * Starts chopping a tree. Each hit decrements HP. When HP=0, tree becomes stump.
     */
    private startChopping (treeCol: number, treeRow: number): void
    {
        const treeKey = `${treeCol},${treeRow}`;
        const treeSprite = this.treeSprites.get(treeKey);

        if (!treeSprite) {
            // Tree already gone — find next tree
            this.findAndChopNextTree();
            return;
        }

        this.chopTargetTree = treeSprite;
        this.chopTargetKey = treeKey;
        this.lastChopTreeCol = treeCol;
        this.lastChopTreeRow = treeRow;

        // Initialize health if first time
        if (!this.treeHealth.has(treeKey)) {
            this.treeHealth.set(treeKey, TREE_MAX_HP);
        }

        // Face the tree
        const treePixel = this.gridToPixel(treeCol, treeRow);
        this.worker.setFlipX(treePixel.x < this.worker.x);

        this.setWorkerState('CHOPPING');

        // Chop timer — each tick is one "hit"
        this.chopTimer = this.time.addEvent({
            delay: CHOP_INTERVAL,
            loop: true,
            callback: () => {
                const hp = (this.treeHealth.get(treeKey) ?? 0) - 1;
                this.treeHealth.set(treeKey, hp);
                this.carriedWood += WOOD_PER_HIT;

                // Shake the tree on hit
                if (this.chopTargetTree) {
                    this.tweens.add({
                        targets: this.chopTargetTree,
                        x: this.chopTargetTree.x + 4,
                        duration: 50,
                        yoyo: true,
                        repeat: 3,
                    });
                }

                if (hp <= 0) {
                    this.fellTree(treeCol, treeRow);
                }
            },
        });
    }

    /**
     * Fells a tree: removes sprite, places stump, starts carry cycle.
     */
    private fellTree (col: number, row: number): void
    {
        const key = `${col},${row}`;
        this.cancelChopping();

        // Remove tree sprite
        const tree = this.treeSprites.get(key);
        if (tree) {
            tree.destroy();
            this.treeSprites.delete(key);
        }
        this.treeHealth.delete(key);

        // Place stump (tile stays blocked)
        const pos = this.gridToPixel(col, row);
        const stump = this.add.image(pos.x, pos.y + 8, 'stump');
        stump.setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 1.0);
        stump.setDepth(2);

        // Switch to carrying mode
        this.isCarrying = true;
        this.setWorkerState('CARRYING');

        // Try to deposit at nearest hut
        this.depositWoodAtNearestHut();
    }

    /**
     * Finds the nearest woodcutter_hut and walks there to deposit wood.
     * If no hut exists, deposits immediately (wood goes to Zustand directly).
     */
    private depositWoodAtNearestHut (): void
    {
        const huts = this.buildings.filter(b => b.type === 'woodcutter_hut');

        if (huts.length === 0) {
            // No hut — deposit immediately
            useGameStore.getState().addWood(this.carriedWood);
            this.carriedWood = 0;
            this.isCarrying = false;
            this.findAndChopNextTree();
            return;
        }

        // Find nearest hut
        let nearest = huts[0];
        let nearestDist = Infinity;
        for (const hut of huts) {
            const dist = Math.abs(hut.col - this.workerGridX) + Math.abs(hut.row - this.workerGridY);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = hut;
            }
        }

        // Find walkable tile adjacent to hut
        const adj = this.findAdjacentWalkable(nearest.col, nearest.row);
        if (!adj) {
            // Can't reach — deposit immediately
            useGameStore.getState().addWood(this.carriedWood);
            this.carriedWood = 0;
            this.isCarrying = false;
            this.findAndChopNextTree();
            return;
        }

        this.easystar.findPath(
            this.workerGridX, this.workerGridY,
            adj.col, adj.row,
            (path) => {
                if (path && path.length > 1) {
                    this.moveAlongPath(path, () => {
                        // Deposit!
                        useGameStore.getState().addWood(this.carriedWood);
                        this.carriedWood = 0;
                        this.isCarrying = false;
                        this.setWorkerState('IDLE');
                        // Auto-loop: find next tree
                        this.findAndChopNextTree();
                    });
                } else {
                    useGameStore.getState().addWood(this.carriedWood);
                    this.carriedWood = 0;
                    this.isCarrying = false;
                    this.findAndChopNextTree();
                }
            }
        );
    }

    /**
     * Auto-loop: finds the nearest remaining tree and starts chopping it.
     */
    private findAndChopNextTree (): void
    {
        let bestKey = '';
        let bestDist = Infinity;
        let bestCol = -1;
        let bestRow = -1;

        for (const [key] of this.treeSprites) {
            const [c, r] = key.split(',').map(Number);
            const dist = Math.abs(c - this.workerGridX) + Math.abs(r - this.workerGridY);
            if (dist < bestDist) {
                bestDist = dist;
                bestKey = key;
                bestCol = c;
                bestRow = r;
            }
        }

        if (!bestKey) {
            this.setWorkerState('IDLE');
            return;
        }

        const adj = this.findAdjacentWalkable(bestCol, bestRow);
        if (!adj) {
            this.setWorkerState('IDLE');
            return;
        }

        this.easystar.findPath(
            this.workerGridX, this.workerGridY,
            adj.col, adj.row,
            (path) => {
                if (path && path.length > 1) {
                    this.moveAlongPath(path, () => {
                        this.startChopping(bestCol, bestRow);
                    });
                } else if (path && path.length === 1) {
                    this.startChopping(bestCol, bestRow);
                } else {
                    this.setWorkerState('IDLE');
                }
            }
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  UNIT SELECTION
    // ═══════════════════════════════════════════════════════════

    private selectUnit (unit: Phaser.GameObjects.Sprite): void
    {
        this.selectedUnit = unit;
        unit.setTint(0x00ff00);
    }

    private deselectUnit (): void
    {
        if (this.selectedUnit) {
            this.selectedUnit.clearTint();
            this.selectedUnit = null;
        }
        this.selectionRing.clear();
    }

    private drawSelectionRing (): void
    {
        this.selectionRing.clear();

        if (!this.selectedUnit) return;

        const x = this.selectedUnit.x;
        const y = this.selectedUnit.y;

        const pulseAlpha = 0.5 + 0.3 * Math.sin(this.time.now / 200);

        this.selectionRing.lineStyle(2, 0x00ff00, pulseAlpha);
        this.selectionRing.strokeCircle(x, y, TILE_SIZE / 2 + 2);
    }

    // ═══════════════════════════════════════════════════════════
    //  TAP HANDLING & MOVEMENT
    // ═══════════════════════════════════════════════════════════

    private handleTap (pointer: Phaser.Input.Pointer): void
    {
        // ── Building Placement Mode intercept ───────────────
        if (this.isPlacingBuilding) {
            this.tryPlaceBuilding(pointer);
            return;
        }

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        // Check if we tapped on the worker sprite
        const hitWorker = this.worker.getBounds().contains(worldX, worldY);

        if (hitWorker) {
            if (this.selectedUnit === this.worker) {
                this.deselectUnit();
            } else {
                this.deselectUnit();
                this.selectUnit(this.worker);
            }
            return;
        }

        // Tapped on empty ground / obstacle
        if (!this.selectedUnit) {
            this.deselectUnit();
            return;
        }

        // A unit IS selected — determine action
        const gridPos = this.pixelToGrid(worldX, worldY);

        // Bounds check
        if (gridPos.col < 0 || gridPos.col >= GRID_COLS ||
            gridPos.row < 0 || gridPos.row >= GRID_ROWS)
        {
            return;
        }

        // ── Tapped on a TREE? → Navigate to adjacent tile & chop ──
        if (this.walkGrid[gridPos.row][gridPos.col] === TILE_BLOCKED)
        {
            const adjacentTile = this.findAdjacentWalkable(gridPos.col, gridPos.row);
            if (!adjacentTile) return;  // No walkable neighbor found

            // Cancel existing actions
            this.cancelMovement();
            this.cancelChopping();

            // Show indicator on the tree
            this.showTapIndicator(gridPos.col, gridPos.row);

            // Pathfind to the adjacent tile, then start chopping on arrival
            this.easystar.findPath(
                this.workerGridX,
                this.workerGridY,
                adjacentTile.col,
                adjacentTile.row,
                (path) => {
                    if (path && path.length > 1) {
                        this.moveAlongPath(path, () => {
                            this.startChopping(gridPos.col, gridPos.row);
                        });
                    } else if (path && path.length === 1) {
                        // Already adjacent
                        this.startChopping(gridPos.col, gridPos.row);
                    }
                }
            );
            return;
        }

        // ── Tapped on walkable ground → Move ──
        if (gridPos.col === this.workerGridX && gridPos.row === this.workerGridY && !this.isMoving)
        {
            return;
        }

        // Show tap indicator
        this.showTapIndicator(gridPos.col, gridPos.row);

        // Cancel existing actions (including auto-loop)
        this.cancelMovement();
        this.cancelChopping();
        this.isCarrying = false;
        this.carriedWood = 0;

        // Request path
        this.easystar.findPath(
            this.workerGridX,
            this.workerGridY,
            gridPos.col,
            gridPos.row,
            (path) => {
                if (path && path.length > 1)
                {
                    this.moveAlongPath(path);
                }
            }
        );
    }

    /**
     * Finds the nearest walkable tile adjacent to the given blocked tile.
     * Checks all 8 neighbors (cardinal + diagonal).
     */
    private findAdjacentWalkable (col: number, row: number): { col: number; row: number } | null
    {
        const directions = [
            { dc: 0, dr: -1 },  // up
            { dc: 0, dr: 1 },   // down
            { dc: -1, dr: 0 },  // left
            { dc: 1, dr: 0 },   // right
            { dc: -1, dr: -1 }, // top-left
            { dc: 1, dr: -1 },  // top-right
            { dc: -1, dr: 1 },  // bottom-left
            { dc: 1, dr: 1 },   // bottom-right
        ];

        let bestTile: { col: number; row: number } | null = null;
        let bestDist = Infinity;

        for (const dir of directions) {
            const nc = col + dir.dc;
            const nr = row + dir.dr;

            if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
            if (this.walkGrid[nr][nc] !== TILE_WALKABLE) continue;

            // Prefer the tile closest to the worker's current position
            const dist = Math.abs(nc - this.workerGridX) + Math.abs(nr - this.workerGridY);
            if (dist < bestDist) {
                bestDist = dist;
                bestTile = { col: nc, row: nr };
            }
        }

        return bestTile;
    }

    /**
     * Cancels any in-progress movement.
     */
    private cancelMovement (): void
    {
        if (this.isMoving && this.currentTweenChain) {
            this.currentTweenChain.stop();
            this.currentTweenChain = null;
            this.isMoving = false;

            // Snap to nearest grid position
            this.workerGridX = Math.round((this.worker.x - TILE_SIZE / 2) / TILE_SIZE);
            this.workerGridY = Math.round((this.worker.y - TILE_SIZE / 2) / TILE_SIZE);
        }
    }

    /**
     * Moves the worker along a path. Optional onArrival callback.
     */
    private moveAlongPath (path: { x: number; y: number }[], onArrival?: () => void): void
    {
        this.isMoving = true;
        this.setWorkerState('MOVING');

        const tweenConfigs: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

        for (let i = 1; i < path.length; i++)
        {
            const step = path[i];
            const pixelPos = this.gridToPixel(step.x, step.y);

            const prevStep = path[i - 1];
            const isDiagonal = (step.x !== prevStep.x) && (step.y !== prevStep.y);
            const duration = isDiagonal ? 220 : 160;

            tweenConfigs.push({
                targets: this.worker,
                x: pixelPos.x,
                y: pixelPos.y,
                duration: duration,
                ease: 'Linear',
                onStart: () => {
                    // Flip sprite based on movement direction
                    if (step.x < prevStep.x) {
                        this.worker.setFlipX(true);   // Moving left
                    } else if (step.x > prevStep.x) {
                        this.worker.setFlipX(false);  // Moving right
                    }
                },
                onComplete: () => {
                    this.workerGridX = step.x;
                    this.workerGridY = step.y;
                },
            });
        }

        this.currentTweenChain = this.tweens.chain({
            tweens: tweenConfigs,
            onComplete: () => {
                this.isMoving = false;
                this.currentTweenChain = null;

                if (onArrival) {
                    onArrival();
                } else {
                    this.setWorkerState('IDLE');
                }
            },
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  VISUAL FEEDBACK
    // ═══════════════════════════════════════════════════════════

    private showTapIndicator (col: number, row: number): void
    {
        const pixelPos = this.gridToPixel(col, row);

        this.tapIndicator.clear();

        this.tapIndicator.lineStyle(2, 0xffd700, 0.9);
        this.tapIndicator.strokeCircle(pixelPos.x, pixelPos.y, 12);

        this.tapIndicator.fillStyle(0xffd700, 0.3);
        this.tapIndicator.fillCircle(pixelPos.x, pixelPos.y, 8);

        this.tweens.add({
            targets: this.tapIndicator,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                this.tapIndicator.clear();
                this.tapIndicator.setAlpha(1);
            },
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  BUILDING PLACEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Polls Zustand each frame to sync building placement mode.
     * Renders ghost building at pointer position.
     */
    private updateBuildingGhost (): void
    {
        const storeState = useGameStore.getState();
        const placing = storeState.isPlacingBuilding;

        if (placing !== this.isPlacingBuilding) {
            this.isPlacingBuilding = placing;

            if (placing) {
                if (!this.ghostBuilding) {
                    this.ghostBuilding = this.add.image(0, 0, 'house3');
                    this.ghostBuilding.setDisplaySize(TILE_SIZE * 2, TILE_SIZE * 2.5);
                    this.ghostBuilding.setDepth(50);
                    this.ghostBuilding.setAlpha(0.5);
                }
            } else {
                if (this.ghostBuilding) {
                    this.ghostBuilding.destroy();
                    this.ghostBuilding = null;
                }
            }
        }

        // Update ghost position
        if (this.ghostBuilding && this.isPlacingBuilding) {
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const grid = this.pixelToGrid(worldPoint.x, worldPoint.y);

            // Snap to 2x2 origin (top-left of the footprint)
            const snappedCol = Math.max(0, Math.min(grid.col, GRID_COLS - 2));
            const snappedRow = Math.max(0, Math.min(grid.row, GRID_ROWS - 2));

            // Center sprite on 2x2 area
            const cx = snappedCol * TILE_SIZE + TILE_SIZE;
            const cy = snappedRow * TILE_SIZE + TILE_SIZE;
            this.ghostBuilding.setPosition(cx, cy - 8);

            // Validate 2x2 area
            const valid = this.canPlaceBuilding(snappedCol, snappedRow);
            this.ghostBuilding.setTint(valid ? 0x00ff00 : 0xff0000);
        }
    }

    private canPlaceBuilding (col: number, row: number): boolean
    {
        for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (r >= GRID_ROWS || c >= GRID_COLS) return false;
                if (this.walkGrid[r][c] !== TILE_WALKABLE) return false;
            }
        }
        return true;
    }

    /**
     * Called from handleTap when in placement mode.
     */
    private tryPlaceBuilding (pointer: Phaser.Input.Pointer): void
    {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const grid = this.pixelToGrid(worldPoint.x, worldPoint.y);
        const col = Math.max(0, Math.min(grid.col, GRID_COLS - 2));
        const row = Math.max(0, Math.min(grid.row, GRID_ROWS - 2));

        if (!this.canPlaceBuilding(col, row)) return;

        const store = useGameStore.getState();
        if (store.wood < BUILDING_COST_WOOD) return;

        // Deduct cost
        store.addWood(-BUILDING_COST_WOOD);

        // Place building sprite
        const cx = col * TILE_SIZE + TILE_SIZE;
        const cy = row * TILE_SIZE + TILE_SIZE;
        const building = this.add.image(cx, cy - 8, 'house3');
        building.setDisplaySize(TILE_SIZE * 2, TILE_SIZE * 2.5);
        building.setDepth(3);

        this.buildings.push({ type: 'woodcutter_hut', sprite: building, col, row });

        // Block 2x2 area in walkGrid
        for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
                this.walkGrid[row + dr][col + dc] = TILE_BLOCKED;
            }
        }
        this.easystar.setGrid(this.walkGrid);

        // Exit placement mode
        store.setPlacingBuilding(null);
    }

    // ═══════════════════════════════════════════════════════════
    //  COORDINATE HELPERS
    // ═══════════════════════════════════════════════════════════

    private gridToPixel (col: number, row: number): { x: number; y: number }
    {
        return {
            x: col * TILE_SIZE + TILE_SIZE / 2,
            y: row * TILE_SIZE + TILE_SIZE / 2,
        };
    }

    private pixelToGrid (x: number, y: number): { col: number; row: number }
    {
        return {
            col: Math.floor(x / TILE_SIZE),
            row: Math.floor(y / TILE_SIZE),
        };
    }
}
