import { StateCreator } from 'zustand';

export interface FactionResources {
    wood: number;
    gold: number;
    currentPopulation: number;
    maxPopulation: number;
    availableWorkersCount: number;
    workerCount: number;
    warriorCount: number;
}

export interface ResourceSlice {
    wood: number;
    gold: number;
    resources: {
        blue: FactionResources;
        red: FactionResources;
    };
    addWood: (amount: number, faction?: 'blue' | 'red') => void;
    addGold: (amount: number, faction?: 'blue' | 'red') => void;
    deductWood: (amount: number, faction?: 'blue' | 'red') => void;
    deductGold: (amount: number, faction?: 'blue' | 'red') => void;
    addFactionWood: (faction: 'blue' | 'red', amount: number) => void;
    addFactionGold: (faction: 'blue' | 'red', amount: number) => void;
}

export const createResourceSlice: StateCreator<ResourceSlice> = (set) => ({
    wood: 300,
    gold: 300,
    resources: {
        blue: {
            wood: 300,
            gold: 300,
            currentPopulation: 0,
            maxPopulation: 5,
            availableWorkersCount: 0,
            workerCount: 0,
            warriorCount: 0
        },
        red: {
            wood: 300,
            gold: 300,
            currentPopulation: 0,
            maxPopulation: 5,
            availableWorkersCount: 0,
            workerCount: 0,
            warriorCount: 0
        }
    },
    addWood: (amount: number, faction?: 'blue' | 'red') => set((state: any) => {
        const targetFaction = faction || state.faction || 'blue';
        const newResources = {
            ...state.resources,
            [targetFaction]: {
                ...state.resources[targetFaction],
                wood: state.resources[targetFaction].wood + amount
            }
        };
        const localFaction = state.faction || 'blue';
        return {
            resources: newResources,
            wood: newResources[localFaction].wood
        };
    }),
    addGold: (amount: number, faction?: 'blue' | 'red') => set((state: any) => {
        const targetFaction = faction || state.faction || 'blue';
        const newResources = {
            ...state.resources,
            [targetFaction]: {
                ...state.resources[targetFaction],
                gold: state.resources[targetFaction].gold + amount
            }
        };
        const localFaction = state.faction || 'blue';
        return {
            resources: newResources,
            gold: newResources[localFaction].gold
        };
    }),
    deductWood: (amount: number, faction?: 'blue' | 'red') => set((state: any) => {
        const targetFaction = faction || state.faction || 'blue';
        const newResources = {
            ...state.resources,
            [targetFaction]: {
                ...state.resources[targetFaction],
                wood: Math.max(0, state.resources[targetFaction].wood - amount)
            }
        };
        const localFaction = state.faction || 'blue';
        return {
            resources: newResources,
            wood: newResources[localFaction].wood
        };
    }),
    deductGold: (amount: number, faction?: 'blue' | 'red') => set((state: any) => {
        const targetFaction = faction || state.faction || 'blue';
        const newResources = {
            ...state.resources,
            [targetFaction]: {
                ...state.resources[targetFaction],
                gold: Math.max(0, state.resources[targetFaction].gold - amount)
            }
        };
        const localFaction = state.faction || 'blue';
        return {
            resources: newResources,
            gold: newResources[localFaction].gold
        };
    }),
    addFactionWood: (faction: 'blue' | 'red', amount: number) => set((state: any) => {
        const newResources = {
            ...state.resources,
            [faction]: {
                ...state.resources[faction],
                wood: state.resources[faction].wood + amount
            }
        };
        const localFaction = state.faction || 'blue';
        return {
            resources: newResources,
            wood: newResources[localFaction].wood
        };
    }),
    addFactionGold: (faction: 'blue' | 'red', amount: number) => set((state: any) => {
        const newResources = {
            ...state.resources,
            [faction]: {
                ...state.resources[faction],
                gold: state.resources[faction].gold + amount
            }
        };
        const localFaction = state.faction || 'blue';
        return {
            resources: newResources,
            gold: newResources[localFaction].gold
        };
    }),
});
