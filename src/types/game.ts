export type WorkerState =
    | "IDLE"
    | "MOVING"
    | "CHOPPING"
    | "CARRYING"
    | "DEPOSITING"
    | "CONSTRUCTING"
    | "MINING"
    | "ATTACK"
    | "MOVING_TO_TRAIN";

export type ResourceType = "wood" | "gold" | "stone";

export type BuildingType = "castle" |"woodcutter_hut" | "house" | "tower" | "gold_hut" | "barracks";

export interface GridPosition {
    col: number;
    row: number;
}

