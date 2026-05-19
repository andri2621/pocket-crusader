import { StateCreator } from 'zustand';

export interface UISlice {
    isBuildMenuOpen: boolean;
    toggleBuildMenu: () => void;
    isPlacingBuilding: string | null;
    setPlacingBuilding: (type: string | null) => void;
    selectedBuildingId: string | null;
    selectedBuildingType: string | null;
    setSelectedBuilding: (id: string | null, type: string | null) => void;
    
    // Training Queue State
    trainingQueue: string[];
    trainingProgress: number;
    setTrainingState: (queue: string[], progress: number) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    isBuildMenuOpen: false,
    toggleBuildMenu: () => set((state) => ({ isBuildMenuOpen: !state.isBuildMenuOpen })),
    isPlacingBuilding: null,
    setPlacingBuilding: (type: string | null) => set({ isPlacingBuilding: type, isBuildMenuOpen: false }),
    selectedBuildingId: null,
    selectedBuildingType: null,
    setSelectedBuilding: (id: string | null, type: string | null) => set({ selectedBuildingId: id, selectedBuildingType: type }),
    
    trainingQueue: [],
    trainingProgress: 0,
    setTrainingState: (queue: string[], progress: number) => set({ trainingQueue: queue, trainingProgress: progress }),
});
