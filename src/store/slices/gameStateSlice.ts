import { StateCreator } from 'zustand';

export interface GameStateSlice {
    isGameOver: boolean;
    setGameOver: (isOver: boolean) => void;
    currentPopulation: number;
    maxPopulation: number;
    availableWorkersCount: number;
    workerCount: number;
    warriorCount: number;
    
    // Multiplayer State
    roomId: string | null;
    isHost: boolean;
    faction: 'blue' | 'red';
    setMultiplayerState: (roomId: string, isHost: boolean, faction: 'blue' | 'red') => void;
    
    setPopulation: (current: number, max: number, availableWorkers: number, workers: number, warriors: number) => void;
    setFactionPopulation: (faction: 'blue' | 'red', current: number, max: number, availableWorkers: number, workers: number, warriors: number) => void;
}

export const createGameStateSlice: StateCreator<GameStateSlice> = (set) => ({
    isGameOver: false,
    setGameOver: (isOver: boolean) => set({ isGameOver: isOver }),
    currentPopulation: 0,
    maxPopulation: 5,
    availableWorkersCount: 0,
    workerCount: 0,
    warriorCount: 0,
    
    roomId: null,
    isHost: false,
    faction: 'blue',
    setMultiplayerState: (roomId: string, isHost: boolean, faction: 'blue' | 'red') => 
        set({ roomId, isHost, faction }),
        
    setPopulation: (current: number, max: number, availableWorkers: number, workers: number, warriors: number) => set((state: any) => {
        const faction = state.faction || 'blue';
        const newResources = {
            ...state.resources,
            [faction]: {
                ...state.resources[faction],
                currentPopulation: current,
                maxPopulation: max,
                availableWorkersCount: availableWorkers,
                workerCount: workers,
                warriorCount: warriors
            }
        };
        return {
            resources: newResources,
            currentPopulation: newResources[faction].currentPopulation,
            maxPopulation: newResources[faction].maxPopulation,
            availableWorkersCount: newResources[faction].availableWorkersCount,
            workerCount: newResources[faction].workerCount,
            warriorCount: newResources[faction].warriorCount
        } as any;
    }),

    setFactionPopulation: (faction: 'blue' | 'red', current: number, max: number, availableWorkers: number, workers: number, warriors: number) => set((state: any) => {
        const newResources = {
            ...state.resources,
            [faction]: {
                ...state.resources[faction],
                currentPopulation: current,
                maxPopulation: max,
                availableWorkersCount: availableWorkers,
                workerCount: workers,
                warriorCount: warriors
            }
        };
        const localFaction = state.faction || 'blue';
        return {
            resources: newResources,
            currentPopulation: newResources[localFaction].currentPopulation,
            maxPopulation: newResources[localFaction].maxPopulation,
            availableWorkersCount: newResources[localFaction].availableWorkersCount,
            workerCount: newResources[localFaction].workerCount,
            warriorCount: newResources[localFaction].warriorCount
        } as any;
    }),
});
