import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import type { LikedSortColumn, LikedSortState, LikedTrack, LikedSongsState } from "../types/liked";
import type { Track } from "../types/discovery";
import type { TrackDto } from "../types/database";
import { initialLikedTracks } from "../data/likedFixtures";
import { findCatalogTrackById } from "../data/playlistFixtures";
import { dbGetTracks } from "../services/db";
import { favoritesSync } from "../services/favoritesSync";
import { usePlayerStore } from "./usePlayerStore";
import { useLibraryStore } from "./useLibraryStore";

/**
 * Pure helper function to filter and sort liked songs.
 */
export function getFilteredAndSortedLikedTracks(
  tracks: LikedTrack[],
  filterQuery: string,
  sortState: LikedSortState
): LikedTrack[] {
  let result = [...tracks];

  const query = filterQuery.trim().toLowerCase();
  if (query.length > 0) {
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album.toLowerCase().includes(query)
    );
  }

  const { column, direction } = sortState;
  result.sort((a, b) => {
    let comparison = 0;
    if (column === "durationSeconds") {
      comparison = a.durationSeconds - b.durationSeconds;
    } else if (column === "dateLiked") {
      const timeA = new Date(a.dateLiked).getTime() || 0;
      const timeB = new Date(b.dateLiked).getTime() || 0;
      comparison = timeA - timeB;
    } else if (column === "title") {
      comparison = a.title.localeCompare(b.title);
    } else if (column === "artist") {
      comparison = a.artist.localeCompare(b.artist);
    } else if (column === "album") {
      comparison = a.album.localeCompare(b.album);
    }

    if (comparison !== 0) {
      return direction === "asc" ? comparison : -comparison;
    }

    // Stable secondary sorting by dateLiked descending
    const timeA = new Date(a.dateLiked).getTime() || 0;
    const timeB = new Date(b.dateLiked).getTime() || 0;
    return timeB - timeA;
  });

  return result;
}

/**
 * Converts a LikedTrack to the player's Track entity format.
 */
export function mapLikedTrackToPlayerTrack(track: LikedTrack): Track {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationSeconds: track.durationSeconds,
    artworkUrl: track.artworkUrl,
    playsCount: track.playsCount,
    isLiked: track.isLiked,
    filePath: track.filePath,
  };
}

import { formatCoverArtUrl } from "../services/scanner";

/**
 * Maps database TrackDto to LikedTrack domain model.
 */
export function mapTrackDtoToLikedTrack(dto: TrackDto): LikedTrack {
  const dateLiked = dto.liked_at
    ? new Date(dto.liked_at * 1000).toISOString()
    : new Date().toISOString();
  const dateAdded = dto.created_at
    ? new Date(dto.created_at * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: dto.id,
    title: dto.title,
    artist: dto.artist_name,
    album: dto.album_name || "Unknown Album",
    durationSeconds: Math.round(dto.duration),
    artworkUrl: formatCoverArtUrl(dto.cover_art_path),
    playsCount: dto.play_count || 0,
    isLiked: Boolean(dto.is_favorite),
    filePath: dto.file_path,
    folderId: dto.folder_id ?? undefined,
    dateAdded,
    dateLiked,
  };
}

function findTrackInfo(trackId: string): {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  artworkUrl?: string;
  filePath?: string;
  folderId?: string;
} | null {
  const libTrack = useLibraryStore.getState().tracks.find((t) => t.id === trackId);
  if (libTrack) return libTrack;

  const playerState = usePlayerStore.getState();
  if (playerState.currentTrack && playerState.currentTrack.id === trackId) {
    return playerState.currentTrack;
  }
  const queueTrack = playerState.queue.find((t) => t.id === trackId);
  if (queueTrack) return queueTrack;

  const popularTrack = playerState.popularTracks.find((t) => t.id === trackId);
  if (popularTrack) return popularTrack;

  const catalogTrack = findCatalogTrackById(trackId);
  if (catalogTrack) return catalogTrack;

  return null;
}

export const useLikedSongsStore = create<LikedSongsState>()((set, get) => ({
  tracks: initialLikedTracks,
  unlikedPendingIds: [],
  filterQuery: "",
  sortState: {
    column: "dateLiked",
    direction: "desc",
  },
  isLoaded: false,
  isLoading: false,

  initializeLikedSongs: async () => {
    set({ isLoading: true });
    try {
      if (isTauri()) {
        const result = await dbGetTracks(0, 500, {
          is_favorite: true,
          sort_by: "liked_at",
          sort_direction: "desc",
        });
        const mapped = result.items.map(mapTrackDtoToLikedTrack);
        set({ tracks: mapped, isLoaded: true, isLoading: false });
      } else {
        set({ tracks: initialLikedTracks, isLoaded: true, isLoading: false });
      }
    } catch (err) {
      console.warn("Failed to load liked songs from database:", err);
      set({ isLoading: false });
    }
  },

  toggleLikeTrack: (trackId: string) => {
    const { unlikedPendingIds, tracks } = get();
    const track = tracks.find((t) => t.id === trackId);
    const isCurrentlyLiked = track ? !unlikedPendingIds.includes(trackId) && track.isLiked : false;

    favoritesSync.toggleFavorite(trackId, isCurrentlyLiked).catch((err) => {
      console.error("Failed to toggle favorite:", err);
    });
  },

  setFilterQuery: (query: string) => {
    set({ filterQuery: query });
  },

  setSortColumn: (column: LikedSortColumn) => {
    set((state) => {
      if (state.sortState.column === column) {
        return {
          sortState: {
            column,
            direction: state.sortState.direction === "asc" ? "desc" : "asc",
          },
        };
      }
      return {
        sortState: {
          column,
          direction: column === "dateLiked" ? "desc" : "asc",
        },
      };
    });
  },

  cleanupUnlikedTracks: () => {
    const { tracks, unlikedPendingIds } = get();
    if (unlikedPendingIds.length === 0) return;

    const remainingTracks = tracks.filter((t) => !unlikedPendingIds.includes(t.id));
    set({
      tracks: remainingTracks,
      unlikedPendingIds: [],
    });
  },

  playAll: () => {
    const { tracks, filterQuery, sortState, unlikedPendingIds } = get();
    const visibleTracks = getFilteredAndSortedLikedTracks(tracks, filterQuery, sortState);
    const activeLikedTracks = visibleTracks.filter(
      (t) => !unlikedPendingIds.includes(t.id) && t.isLiked
    );
    if (activeLikedTracks.length === 0) return;

    const playerQueue = activeLikedTracks.map(mapLikedTrackToPlayerTrack);
    usePlayerStore.getState().playCollection(playerQueue, 0);
  },

  shuffleAll: () => {
    const { tracks, filterQuery, sortState, unlikedPendingIds } = get();
    const visibleTracks = getFilteredAndSortedLikedTracks(tracks, filterQuery, sortState);
    const activeLikedTracks = visibleTracks.filter(
      (t) => !unlikedPendingIds.includes(t.id) && t.isLiked
    );
    if (activeLikedTracks.length === 0) return;

    const shuffled = [...activeLikedTracks].sort(() => Math.random() - 0.5);
    const playerQueue = shuffled.map(mapLikedTrackToPlayerTrack);

    const playerStore = usePlayerStore.getState();
    if (!playerStore.isShuffle) {
      playerStore.toggleShuffle();
    }
    playerStore.playCollection(playerQueue, 0);
  },

  playTrackAtIndex: (index: number) => {
    const { tracks, filterQuery, sortState } = get();
    const visibleTracks = getFilteredAndSortedLikedTracks(tracks, filterQuery, sortState);
    if (index < 0 || index >= visibleTracks.length) return;

    const playerQueue = visibleTracks.map(mapLikedTrackToPlayerTrack);
    usePlayerStore.getState().playCollection(playerQueue, index);
  },
}));

// Synchronize state whenever a favorite event occurs across any screen or store
favoritesSync.subscribe((trackId: string, isLiked: boolean, likedAt: number | null) => {
  useLikedSongsStore.setState((state) => {
    const existingIndex = state.tracks.findIndex((t) => t.id === trackId);

    if (isLiked) {
      const updatedPending = state.unlikedPendingIds.filter((id) => id !== trackId);
      if (existingIndex !== -1) {
        const updatedTracks = [...state.tracks];
        const existingTrack = updatedTracks[existingIndex];
        const dateLiked = likedAt
          ? new Date(likedAt * 1000).toISOString()
          : existingTrack.dateLiked || new Date().toISOString();
        updatedTracks[existingIndex] = {
          ...existingTrack,
          isLiked: true,
          dateLiked,
        };
        return {
          tracks: updatedTracks,
          unlikedPendingIds: updatedPending,
        };
      }

      // Track newly liked from another screen
      const info = findTrackInfo(trackId);
      const dateLiked = likedAt ? new Date(likedAt * 1000).toISOString() : new Date().toISOString();
      const newTrack: LikedTrack = {
        id: trackId,
        title: info?.title || "Unknown Title",
        artist: info?.artist || "Unknown Artist",
        album: info?.album || "Unknown Album",
        durationSeconds: info?.durationSeconds || 0,
        artworkUrl: info?.artworkUrl || "",
        playsCount: 0,
        isLiked: true,
        filePath: info?.filePath || "",
        folderId: info?.folderId,
        dateAdded: new Date().toISOString(),
        dateLiked,
      };

      return {
        tracks: [newTrack, ...state.tracks],
        unlikedPendingIds: updatedPending,
      };
    } else {
      // Unliking track: retain row in UI with unfilled heart until navigation
      const updatedPending = state.unlikedPendingIds.includes(trackId)
        ? state.unlikedPendingIds
        : [...state.unlikedPendingIds, trackId];

      const updatedTracks = state.tracks.map((t) =>
        t.id === trackId ? { ...t, isLiked: false } : t
      );

      return {
        tracks: updatedTracks,
        unlikedPendingIds: updatedPending,
      };
    }
  });
});

// Performance-optimized selector hooks
export const useLikedTracks = () => useLikedSongsStore((state) => state.tracks);
export const useUnlikedPendingIds = () => useLikedSongsStore((state) => state.unlikedPendingIds);
export const useLikedFilterQuery = () => useLikedSongsStore((state) => state.filterQuery);
export const useLikedSortState = () => useLikedSongsStore((state) => state.sortState);
export const useIsLikedSongsLoaded = () => useLikedSongsStore((state) => state.isLoaded);
export const useIsLikedSongsLoading = () => useLikedSongsStore((state) => state.isLoading);
