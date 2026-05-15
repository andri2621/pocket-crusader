export type WorkerState =
    | "IDLE"
    | "MOVING"
    | "CHOPPING"
    | "CARRYING"
    | "DEPOSITING";

export type ResourceType = "wood" | "gold" | "stone";

export type BuildingType = "castle" |"woodcutter_hut" | "house" | "tower";

export interface GridPosition {
    col: number;
    row: number;
}

