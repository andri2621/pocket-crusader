declare module 'easystarjs' {
    interface Position {
        x: number;
        y: number;
    }

    export class js {
        setGrid(grid: number[][]): void;
        setAcceptableTiles(tiles: number[]): void;
        enableDiagonals(): void;
        disableDiagonals(): void;
        setIterationsPerCalculation(iterations: number): void;
        avoidAdditionalPoint(x: number, y: number): void;
        stopAvoidingAdditionalPoint(x: number, y: number): void;
        stopAvoidingAllAdditionalPoints(): void;
        enableCornerCutting(): void;
        disableCornerCutting(): void;
        setTileCost(tileType: number, cost: number): void;
        setAdditionalPointCost(x: number, y: number, cost: number): void;
        removeAdditionalPointCost(x: number, y: number): void;
        removeAllAdditionalPointCosts(): void;
        setDirectionalCondition(
            x: number,
            y: number,
            allowedDirections: string[]
        ): void;
        removeAllDirectionalConditions(): void;
        findPath(
            startX: number,
            startY: number,
            endX: number,
            endY: number,
            callback: (path: Position[] | null) => void
        ): void;
        cancelPath(): void;
        calculate(): void;
    }
}
