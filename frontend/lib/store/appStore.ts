import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  userName: string;
  ragEnabled: boolean;
  setUserName: (name: string) => void;
  setRagEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userName: 'Steve',
      ragEnabled: true,
      setUserName: (name: string) => set({ userName: name }),
      setRagEnabled: (enabled: boolean) => set({ ragEnabled: enabled }),
    }),
    {
      name: 'the-code-room-storage',
      partialize: (state) => ({
        userName: state.userName,
        ragEnabled: state.ragEnabled,
      }),
    }
  )
); 