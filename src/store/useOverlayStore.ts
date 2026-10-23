import { create } from "zustand";
import type { OverlayType } from "../types/overlays";

interface OverlayState {
  activeOverlay: OverlayType;
  openOverlay: (overlay: "queue" | "lyrics" | "settings") => void;
  closeOverlay: () => void;
  toggleOverlay: (overlay: "queue" | "lyrics" | "settings") => void;
}

export const useOverlayStore = create<OverlayState>()((set) => ({
  activeOverlay: "none",

  openOverlay: (overlay) => {
    set({ activeOverlay: overlay });
  },

  closeOverlay: () => {
    set({ activeOverlay: "none" });
  },

  toggleOverlay: (overlay) => {
    set((state) => ({
      activeOverlay: state.activeOverlay === overlay ? "none" : overlay,
    }));
  },
}));

// Typed selector hooks
export const useActiveOverlay = () => useOverlayStore((state) => state.activeOverlay);
export const useIsOverlayOpen = (overlay: "queue" | "lyrics" | "settings") =>
  useOverlayStore((state) => state.activeOverlay === overlay);
