import { StateCreator } from 'zustand';

export interface UISlice {
    isBuildMenuOpen: boolean;
    toggleBuildMenu: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    isBuildMenuOpen: false,
    toggleBuildMenu: () => set((state) => ({ isBuildMenuOpen: !state.isBuildMenuOpen })),
});
