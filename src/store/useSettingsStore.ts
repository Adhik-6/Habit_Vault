import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../design/tokens';

interface SettingsState {
  accentColor: string;
  setAccentColor: (color: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      accentColor: Colors.accent,
      setAccentColor: (color: string) => set({ accentColor: color }),
    }),
    {
      name: 'habitvault-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
