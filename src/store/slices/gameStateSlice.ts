import { StateCreator } from 'zustand';

export interface GameStateSlice {
    isGameOver: boolean;
    setGameOver: (isOver: boolean) => void;
    currentPopulation: number;
    maxPopulation: number;
    setPopulation: (current: number, max: number) => void;
}

export const createGameStateSlice: StateCreator<GameStateSlice> = (set) => ({
    isGameOver: false,
    setGameOver: (isOver: boolean) => set({ isGameOver: isOver }),
    currentPopulation: 0,
    maxPopulation: 5,
    setPopulation: (current: number, max: number) => set({ currentPopulation: current, maxPopulation: max }),
});
