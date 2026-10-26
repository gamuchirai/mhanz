import { create } from "zustand";
import type { FullscreenViewMode, OverlayType } from "../types/overlays";
import { useSettingsStore } from "./useSettingsStore";
import { usePlayerStore } from "./usePlayerStore";

interface OverlayState {
  activeOverlay: OverlayType;
  fullscreenViewMode: FullscreenViewMode;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
  toggleOverlay: (overlay: OverlayType) => void;
  setFullscreenViewMode: (mode: FullscreenViewMode) => void;
}

export const useOverlayStore = create<OverlayState>()((set) => ({
  activeOverlay: "none",
  fullscreenViewMode: "artwork",

  openOverlay: (overlay) => {
    if (overlay === "fullscreen") {
      const currentTrack = usePlayerStore.getState().currentTrack;
      if (!currentTrack) return;
      const defaultView = useSettingsStore.getState().settings.fullscreenDefaultView || "artwork";
      set({ activeOverlay: "fullscreen", fullscreenViewMode: defaultView });
      return;
    }
    set({ activeOverlay: overlay });
  },

  closeOverlay: () => {
    set({ activeOverlay: "none" });
  },

  toggleOverlay: (overlay) => {
    set((state) => {
      if (state.activeOverlay === overlay) {
        return { activeOverlay: "none" };
      }
      if (overlay === "fullscreen") {
        const currentTrack = usePlayerStore.getState().currentTrack;
        if (!currentTrack) return state;
        const defaultView = useSettingsStore.getState().settings.fullscreenDefaultView || "artwork";
        return { activeOverlay: "fullscreen", fullscreenViewMode: defaultView };
      }
      return { activeOverlay: overlay };
    });
  },

  setFullscreenViewMode: (mode) => {
    set({ fullscreenViewMode: mode });
  },
}));

// Typed selector hooks
export const useActiveOverlay = () => useOverlayStore((state) => state.activeOverlay);
export const useIsOverlayOpen = (overlay: OverlayType) =>
  useOverlayStore((state) => state.activeOverlay === overlay);
export const useFullscreenViewMode = () => useOverlayStore((state) => state.fullscreenViewMode);
