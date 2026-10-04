import { create } from 'zustand';

/** Version counter bumped after every write; live queries reload when it changes. */
export const useDataStore = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
