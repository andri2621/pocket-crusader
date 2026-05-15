export type WorkerState =
    | "IDLE"
    | "MOVING"
    | "CHOPPING"
    | "CARRYING"
    | "DEPOSITING"
    | "CONSTRUCTING"
    | "MINING";

export type ResourceType = "wood" | "gold" | "stone";

export type BuildingType = "castle" |"woodcutter_hut" | "house" | "tower" | "gold_hut";

export interface GridPosition {
    col: number;
    row: number;
}

