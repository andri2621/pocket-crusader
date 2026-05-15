import { StateCreator } from 'zustand';

export interface ResourceSlice {
    wood: number;
    gold: number;
    addWood: (amount: number) => void;
    addGold: (amount: number) => void;
}

export const createResourceSlice: StateCreator<ResourceSlice> = (set) => ({
    wood: 100,
    gold: 100,
    addWood: (amount: number) => set((state) => ({ wood: state.wood + amount })),
    addGold: (amount: number) => set((state) => ({ gold: state.gold + amount })),
});
