import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import type {
  HomeRecommendationCollection,
  HomeRecommendationsData,
} from "../types/discovery";
import { initialRecommendations } from "../data/homeFixtures";
import { dbGetHomeRecommendations } from "../services/db";
import { usePlayerStore } from "./usePlayerStore";

interface RecommendationsState {
  recommendations: HomeRecommendationsData | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  initializeRecommendations: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  playRecommendationCollection: (collection: HomeRecommendationCollection) => void;
  resetRecommendations: () => void;
}

export const useRecommendationsStore = create<RecommendationsState>()((set, get) => ({
  recommendations: isTauri() ? null : initialRecommendations,
  isLoading: false,
  isLoaded: !isTauri(),
  error: null,

  initializeRecommendations: async () => {
    // Only load if not yet loaded, not currently loading, and no existing error
    if (get().isLoaded || get().isLoading || get().error) {
      return;
    }
    await get().refreshRecommendations();
  },

  refreshRecommendations: async () => {
    if (!isTauri()) {
      set({
        recommendations: initialRecommendations,
        isLoading: false,
        isLoaded: true,
        error: null,
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const data = await dbGetHomeRecommendations();
      set({
        recommendations: data,
        isLoading: false,
        isLoaded: true,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to load home recommendations from SQLite:", err);
      // Query error fails the aggregate call and does not trigger fallback (AC-6, AC-10)
      set({
        isLoading: false,
        isLoaded: false,
        error: message || "Failed to load recommendations",
      });
    }
  },

  playRecommendationCollection: (collection: HomeRecommendationCollection) => {
    if (!collection.tracks || collection.tracks.length === 0) {
      return;
    }
    // Replaces the queue with listed tracks in displayed order and sets playback context (AC-7)
    usePlayerStore.getState().setPlaybackContext({
      type: collection.kind,
      title: collection.title,
    });
    usePlayerStore.getState().playTrack(collection.tracks[0], collection.tracks);
  },

  resetRecommendations: () => {
    set({
      recommendations: isTauri() ? null : initialRecommendations,
      isLoading: false,
      isLoaded: !isTauri(),
      error: null,
    });
  },
}));

export function useRecommendations(): HomeRecommendationsData | null {
  return useRecommendationsStore((state) => state.recommendations);
}

export function useIsRecommendationsLoading(): boolean {
  return useRecommendationsStore((state) => state.isLoading);
}

export function useIsRecommendationsLoaded(): boolean {
  return useRecommendationsStore((state) => state.isLoaded);
}

export function useRecommendationsError(): string | null {
  return useRecommendationsStore((state) => state.error);
}
