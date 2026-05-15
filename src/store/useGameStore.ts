import { create } from 'zustand';
import { ResourceSlice, createResourceSlice } from './slices/resourceSlice';
import { UISlice, createUISlice } from './slices/uiSlice';
import { GameStateSlice, createGameStateSlice } from './slices/gameStateSlice';

// Combined store type — all slices merged into one flat store
type GameStore = ResourceSlice & UISlice & GameStateSlice;

export const useGameStore = create<GameStore>()((...args) => ({
    ...createResourceSlice(...args),
    ...createUISlice(...args),
    ...createGameStateSlice(...args),
}));
