import { StateCreator } from 'zustand';

export interface GameStateSlice {
    isGameOver: boolean;
    setGameOver: (isOver: boolean) => void;
    currentPopulation: number;
    maxPopulation: number;
    availableWorkersCount: number;
    workerCount: number;
    warriorCount: number;
    setPopulation: (current: number, max: number, availableWorkers: number, workers: number, warriors: number) => void;
}

export const createGameStateSlice: StateCreator<GameStateSlice> = (set) => ({
    isGameOver: false,
    setGameOver: (isOver: boolean) => set({ isGameOver: isOver }),
    currentPopulation: 0,
    maxPopulation: 5,
    availableWorkersCount: 0,
    workerCount: 0,
    warriorCount: 0,
    setPopulation: (current: number, max: number, availableWorkers: number, workers: number, warriors: number) => 
        set({ currentPopulation: current, maxPopulation: max, availableWorkersCount: availableWorkers, workerCount: workers, warriorCount: warriors }),
});
