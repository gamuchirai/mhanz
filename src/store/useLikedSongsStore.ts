import { create } from "zustand";
import type { LikedSortColumn, LikedSortState, LikedTrack, LikedSongsState } from "../types/liked";
import type { Track } from "../types/discovery";
import { initialLikedTracks } from "../data/likedFixtures";
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

export const useLikedSongsStore = create<LikedSongsState>()((set, get) => ({
  tracks: initialLikedTracks,
  unlikedPendingIds: [],
  filterQuery: "",
  sortState: {
    column: "dateLiked",
    direction: "desc",
  },

  toggleLikeTrack: (trackId: string) => {
    const { unlikedPendingIds, tracks } = get();
    const isPendingUnliked = unlikedPendingIds.includes(trackId);

    if (isPendingUnliked) {
      // Re-like track (remove from pending unliked list)
      const updatedPending = unlikedPendingIds.filter((id) => id !== trackId);
      const updatedTracks = tracks.map((t) => (t.id === trackId ? { ...t, isLiked: true } : t));
      set({
        unlikedPendingIds: updatedPending,
        tracks: updatedTracks,
      });

      // Synchronize to usePlayerStore
      const playerStore = usePlayerStore.getState();
      if (!playerStore.likedTrackIds[trackId]) {
        playerStore.toggleLike(trackId);
      }
    } else {
      // Mark track as pending unliked (keeps row in list during current session)
      const updatedPending = [...unlikedPendingIds, trackId];
      const updatedTracks = tracks.map((t) => (t.id === trackId ? { ...t, isLiked: false } : t));
      set({
        unlikedPendingIds: updatedPending,
        tracks: updatedTracks,
      });

      // Synchronize to usePlayerStore
      const playerStore = usePlayerStore.getState();
      if (playerStore.likedTrackIds[trackId]) {
        playerStore.toggleLike(trackId);
      }
    }

    // Synchronize to useLibraryStore if track exists in library
    const libState = useLibraryStore.getState();
    const libTrack = libState.tracks.find((t) => t.id === trackId);
    if (libTrack && libTrack.isLiked === isPendingUnliked) {
      libState.toggleLikeTrack(trackId);
    }
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
    // Queue only currently liked tracks
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

// Performance-optimized selector hooks
export const useLikedTracks = () => useLikedSongsStore((state) => state.tracks);
export const useUnlikedPendingIds = () => useLikedSongsStore((state) => state.unlikedPendingIds);
export const useLikedFilterQuery = () => useLikedSongsStore((state) => state.filterQuery);
export const useLikedSortState = () => useLikedSongsStore((state) => state.sortState);
