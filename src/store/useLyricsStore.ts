/**
 * Reactive Zustand store for managing track lyrics state, caching, and timing offsets.
 */

import { create } from "zustand";
import type { TrackLyricsDto } from "../types/lyrics";
import {
  lyricsGetForTrack,
  lyricsSetUserOffset,
  lyricsRescanForTrack,
} from "../services/lyrics";

export interface LyricsState {
  /**
   * Currently active track lyrics payload.
   */
  currentLyrics: TrackLyricsDto | null;
  /**
   * Whether a lyrics fetch or rescan is actively in progress.
   */
  isLoading: boolean;
  /**
   * Error message if retrieval failed.
   */
  error: string | null;
  /**
   * In memory cache of loaded lyrics keyed by track identifier.
   */
  lyricsCache: Record<string, TrackLyricsDto>;
  /**
   * Fetches lyrics for a track, utilizing the cache when available.
   */
  fetchLyrics: (trackId: string, title?: string, artist?: string) => Promise<void>;
  /**
   * Nudges the user timing offset by deltaMs (e.g. +100ms or -100ms), debouncing backend writes.
   */
  nudgeUserOffset: (deltaMs: number) => Promise<void>;
  /**
   * Resets the user timing offset to zero.
   */
  resetUserOffset: () => Promise<void>;
  /**
   * Forces a fresh disk scan and parsing for a track.
   */
  rescanLyrics: (trackId: string, title?: string, artist?: string) => Promise<void>;
}

let offsetDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useLyricsStore = create<LyricsState>()((set, get) => ({
  currentLyrics: null,
  isLoading: false,
  error: null,
  lyricsCache: {},

  fetchLyrics: async (trackId: string, title?: string, artist?: string) => {
    if (!trackId) {
      set({ currentLyrics: null, isLoading: false, error: null });
      return;
    }

    const { lyricsCache, currentLyrics } = get();

    // If already current and loaded, avoid redundant loading spinners
    if (currentLyrics && currentLyrics.trackId === trackId) {
      return;
    }

    if (lyricsCache[trackId]) {
      set({
        currentLyrics: lyricsCache[trackId],
        isLoading: false,
        error: null,
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const lyrics = await lyricsGetForTrack(trackId, title, artist);
      set((state) => ({
        currentLyrics: lyrics,
        isLoading: false,
        error: null,
        lyricsCache: {
          ...state.lyricsCache,
          [trackId]: lyrics,
        },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  nudgeUserOffset: async (deltaMs: number) => {
    const { currentLyrics } = get();
    if (!currentLyrics) return;

    const trackId = currentLyrics.trackId;
    const newOffsetMs = (currentLyrics.userOffsetMs || 0) + deltaMs;

    const updatedLyrics: TrackLyricsDto = {
      ...currentLyrics,
      userOffsetMs: newOffsetMs,
    };

    // Optimistically update store state and cache
    set((state) => ({
      currentLyrics: updatedLyrics,
      lyricsCache: {
        ...state.lyricsCache,
        [trackId]: updatedLyrics,
      },
    }));

    // Debounce the SQLite write by 300 milliseconds (AC-7)
    if (offsetDebounceTimer) {
      clearTimeout(offsetDebounceTimer);
    }

    offsetDebounceTimer = setTimeout(async () => {
      try {
        await lyricsSetUserOffset(trackId, newOffsetMs);
      } catch (err) {
        console.error(`Failed to persist user offset for track ${trackId}:`, err);
      }
    }, 300);
  },

  resetUserOffset: async () => {
    const { currentLyrics } = get();
    if (!currentLyrics) return;

    const trackId = currentLyrics.trackId;
    const updatedLyrics: TrackLyricsDto = {
      ...currentLyrics,
      userOffsetMs: 0,
    };

    set((state) => ({
      currentLyrics: updatedLyrics,
      lyricsCache: {
        ...state.lyricsCache,
        [trackId]: updatedLyrics,
      },
    }));

    if (offsetDebounceTimer) {
      clearTimeout(offsetDebounceTimer);
      offsetDebounceTimer = null;
    }

    try {
      await lyricsSetUserOffset(trackId, 0);
    } catch (err) {
      console.error(`Failed to reset user offset for track ${trackId}:`, err);
    }
  },

  rescanLyrics: async (trackId: string, title?: string, artist?: string) => {
    if (!trackId) return;

    set({ isLoading: true, error: null });

    try {
      const freshLyrics = await lyricsRescanForTrack(trackId, title, artist);
      set((state) => ({
        currentLyrics: freshLyrics,
        isLoading: false,
        error: null,
        lyricsCache: {
          ...state.lyricsCache,
          [trackId]: freshLyrics,
        },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },
}));
