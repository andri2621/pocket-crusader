import type { ResourceSlice } from './slices/resourceSlice';
import type { UISlice } from './slices/uiSlice';
import type { GameStateSlice } from './slices/gameStateSlice';

/**
 * Combined Zustand store type for Pocket Crusader.
 * Integrates resource state, UI controls, and match lifecycle state.
 */
export type GameStore = ResourceSlice & UISlice & GameStateSlice;
