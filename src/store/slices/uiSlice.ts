import { StateCreator } from 'zustand';

export interface UISlice {
    isBuildMenuOpen: boolean;
    toggleBuildMenu: () => void;
    isPlacingBuilding: string | null;
    setPlacingBuilding: (type: string | null) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    isBuildMenuOpen: false,
    toggleBuildMenu: () => set((state) => ({ isBuildMenuOpen: !state.isBuildMenuOpen })),
    isPlacingBuilding: null,
    setPlacingBuilding: (type: string | null) => set({ isPlacingBuilding: type, isBuildMenuOpen: false }),
});
