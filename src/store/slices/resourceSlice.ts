import { StateCreator } from 'zustand';

export interface ResourceSlice {
    wood: number;
    addWood: (amount: number) => void;
}

export const createResourceSlice: StateCreator<ResourceSlice> = (set) => ({
    wood: 0,
    addWood: (amount: number) => set((state) => ({ wood: state.wood + amount })),
});
