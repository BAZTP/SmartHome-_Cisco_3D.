import { create } from "zustand";
export type View = "Isométrica" | "Superior" | "Interior";
export const useScene = create<{
  view: View;
  walls: boolean;
  selected: string | null;
  setView: (v: View) => void;
  toggleWalls: () => void;
  select: (s: string) => void;
}>((set) => ({
  view: "Isométrica",
  walls: true,
  selected: null,
  setView: (view) => set({ view }),
  toggleWalls: () => set((s) => ({ walls: !s.walls })),
  select: (selected) => set({ selected }),
}));
