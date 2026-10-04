import { create } from 'zustand';
import type { Preferences } from '@/db/repos/preferences';

interface AppState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  prefs: Preferences | null;
  textScale: number;
  setReady: (prefs: Preferences) => void;
  setError: (message: string) => void;
  setPrefs: (prefs: Preferences) => void;
  setTextScale: (scale: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: 'loading',
  error: null,
  prefs: null,
  textScale: 1,
  setReady: (prefs) => set({ status: 'ready', prefs, error: null }),
  setError: (message) => set({ status: 'error', error: message }),
  setPrefs: (prefs) => set({ prefs }),
  setTextScale: (textScale) => set({ textScale }),
}));
