import { create } from 'zustand';
import { ResourceSlice, createResourceSlice } from './slices/resourceSlice';
import { UISlice, createUISlice } from './slices/uiSlice';
import { GameStateSlice, createGameStateSlice } from './slices/gameStateSlice';
import { GameStore } from './types';

export type { GameStore };

export const useGameStore = create<GameStore>()((...args) => ({
    ...createResourceSlice(...args),
    ...createUISlice(...args),
    ...createGameStateSlice(...args),
}));
