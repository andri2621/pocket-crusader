import { Scene } from 'phaser';
import * as EasyStar from 'easystarjs';
import { GridPosition } from '../../types/game';

export const TILE_SIZE = 64;
export const GRID_COLS = 32;
export const GRID_ROWS = 18;
const TILE_WALKABLE = 0;
const TILE_BLOCKED = 1;

export class GridManager {
    private scene: Scene;
    private easystar: EasyStar.js;
    private walkGrid: number[][] = [];

    constructor(scene: Scene) {
        this.scene = scene;
        this.easystar = new EasyStar.js();
        this.initGrid();
    }

    private initGrid() {
        for (let row = 0; row < GRID_ROWS; row++) {
            const rowArr: number[] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                rowArr.push(TILE_WALKABLE);
            }
            this.walkGrid.push(rowArr);
        }

        this.easystar.setGrid(this.walkGrid);
        this.easystar.setAcceptableTiles([TILE_WALKABLE]);
        this.easystar.enableDiagonals();
        this.easystar.disableCornerCutting();
        this.easystar.setIterationsPerCalculation(1000);
    }

    public update() {
        this.easystar.calculate();
    }

    public blockTile(col: number, row: number) {
        if (this.isValidGridPos(col, row)) {
            this.walkGrid[row][col] = TILE_BLOCKED;
            this.easystar.setGrid(this.walkGrid);
        }
    }

    public unblockTile(col: number, row: number) {
        if (this.isValidGridPos(col, row)) {
            this.walkGrid[row][col] = TILE_WALKABLE;
            this.easystar.setGrid(this.walkGrid);
        }
    }

    public blockArea(startCol: number, startRow: number, width: number, height: number) {
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                this.blockTile(startCol + c, startRow + r);
            }
        }
    }

    public isTileWalkable(col: number, row: number): boolean {
        if (!this.isValidGridPos(col, row)) return false;
        return this.walkGrid[row][col] === TILE_WALKABLE;
    }

    public isValidGridPos(col: number, row: number): boolean {
        return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
    }

    public findPath(start: GridPosition, end: GridPosition, callback: (path: GridPosition[] | null) => void) {
        this.easystar.findPath(start.col, start.row, end.col, end.row, (path) => {
            if (path) {
                // EasyStar path objects have x,y properties instead of col,row
                const mappedPath = path.map(p => ({ col: p.x, row: p.y }));
                callback(mappedPath);
            } else {
                callback(null);
            }
        });
    }

    public findAdjacentWalkable(col: number, row: number, startPos: GridPosition): GridPosition | null {
        const directions = [
            { dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
            { dc: -1, dr: -1 }, { dc: 1, dr: -1 }, { dc: -1, dr: 1 }, { dc: 1, dr: 1 },
        ];

        let bestTile: GridPosition | null = null;
        let bestDist = Infinity;

        for (const dir of directions) {
            const nc = col + dir.dc;
            const nr = row + dir.dr;

            if (this.isTileWalkable(nc, nr)) {
                const dist = Math.abs(nc - startPos.col) + Math.abs(nr - startPos.row);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTile = { col: nc, row: nr };
                }
            }
        }

        return bestTile;
    }

    // Coordinates helpers
    public getTileCenter(col: number, row: number) {
        return {
            x: col * TILE_SIZE + TILE_SIZE / 2,
            y: row * TILE_SIZE + TILE_SIZE / 2,
        };
    }

    public getTileBottomCenter(col: number, row: number) {
        return {
            x: col * TILE_SIZE + TILE_SIZE / 2,
            y: row * TILE_SIZE + TILE_SIZE,
        };
    }

    public pixelToGrid(x: number, y: number): GridPosition {
        return {
            col: Math.floor(x / TILE_SIZE),
            row: Math.floor(y / TILE_SIZE),
        };
    }


}
