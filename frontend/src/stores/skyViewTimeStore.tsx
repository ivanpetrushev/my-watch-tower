import { create } from "zustand";

export const useSkyViewTimeStore = create<{
  currentTime: Date;
  setCurrentTime: (date: Date) => void;
  isRealtime: boolean;
  setIsRealtime: (isRealtime: boolean) => void;
}>((set) => ({
  currentTime: new Date(),
  setCurrentTime: (date) => set({ currentTime: date }),
  isRealtime: true,
  setIsRealtime: (isRealtime) => set({ isRealtime }),
}));
