import { create } from "zustand";
import type {
  HydratedPlaylistTrack,
  Playlist,
  PlaylistCreateInput,
  PlaylistTrackEntry,
  PlaylistUpdateInput,
} from "../types/playlist";
import type { Track } from "../types/discovery";
import {
  initialPlaylists,
  initialPlaylistTracks,
  MIDNIGHT_GRADIENT_PRESETS,
  findCatalogTrackById,
} from "../data/playlistFixtures";
import { usePlayerStore } from "./usePlayerStore";

export interface PlaylistState {
  playlists: Playlist[];
  playlistTracks: Record<string, PlaylistTrackEntry[]>;
  activePlaylistId: string | null;
  overviewSearchQuery: string;
  detailSearchQuery: string;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isAddSongsDrawerOpen: boolean;
  isDeleteDialogOpen: boolean;

  createPlaylist: (input: PlaylistCreateInput) => string;
  updatePlaylist: (id: string, input: PlaylistUpdateInput) => void;
  deletePlaylist: (id: string) => void;
  setActivePlaylistId: (id: string | null) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, entryId: string) => void;
  reorderTrack: (playlistId: string, sourceIndex: number, destinationIndex: number) => void;
  setOverviewSearchQuery: (query: string) => void;
  setDetailSearchQuery: (query: string) => void;
  setCreateModalOpen: (open: boolean) => void;
  setEditModalOpen: (open: boolean) => void;
  setAddSongsDrawerOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  playPlaylist: (playlistId: string, startIndex?: number) => void;
  shufflePlaylist: (playlistId: string) => void;
}

/**
 * Hydrates playlist track entries with track details from universal catalog.
 */
export function hydratePlaylistEntries(entries: PlaylistTrackEntry[]): HydratedPlaylistTrack[] {
  const result: HydratedPlaylistTrack[] = [];
  for (const entry of entries) {
    const track = findCatalogTrackById(entry.trackId);
    if (track) {
      result.push({ entry, track });
    }
  }
  return result;
}

/**
 * Calculates cumulative duration in seconds from track entries.
 */
export function calculatePlaylistDuration(entries: PlaylistTrackEntry[]): number {
  return entries.reduce((total, entry) => {
    const track = findCatalogTrackById(entry.trackId);
    return total + (track ? track.durationSeconds : 0);
  }, 0);
}

/**
 * Formats duration seconds into readable time string (e.g., "48 mins 12 secs" or "3:45").
 */
export function formatPlaylistTotalDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 min";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  if (minutes > 0) {
    return `${minutes} min ${seconds} sec`;
  }
  return `${seconds} sec`;
}

export const usePlaylistStore = create<PlaylistState>()((set, get) => ({
  playlists: initialPlaylists,
  playlistTracks: initialPlaylistTracks,
  activePlaylistId: null,
  overviewSearchQuery: "",
  detailSearchQuery: "",
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isAddSongsDrawerOpen: false,
  isDeleteDialogOpen: false,

  createPlaylist: (input: PlaylistCreateInput): string => {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error("Playlist title cannot be empty");
    }

    const newId = `playlist-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newPlaylist: Playlist = {
      id: newId,
      title: trimmedTitle,
      description: input.description?.trim() ?? "",
      coverGradient: input.coverGradient ?? MIDNIGHT_GRADIENT_PRESETS[0].gradient,
      coverUrl: input.coverUrl?.trim() || undefined,
      isCurated: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    set((state) => ({
      playlists: [newPlaylist, ...state.playlists],
      playlistTracks: {
        ...state.playlistTracks,
        [newId]: [],
      },
      activePlaylistId: newId,
      isCreateModalOpen: false,
      detailSearchQuery: "",
    }));

    return newId;
  },

  updatePlaylist: (id: string, input: PlaylistUpdateInput) => {
    set((state) => {
      const playlistIndex = state.playlists.findIndex((p) => p.id === id);
      if (playlistIndex === -1) return state;

      const current = state.playlists[playlistIndex];
      if (current.isCurated) {
        // Invariant: Curated playlists cannot be renamed or altered
        return state;
      }

      const updatedTitle = input.title !== undefined ? input.title.trim() : current.title;
      if (!updatedTitle) return state;

      const updatedPlaylist: Playlist = {
        ...current,
        title: updatedTitle,
        description:
          input.description !== undefined ? input.description.trim() : current.description,
        coverGradient: input.coverGradient ?? current.coverGradient,
        coverUrl:
          input.coverUrl !== undefined ? input.coverUrl.trim() || undefined : current.coverUrl,
        updatedAt: new Date().toISOString(),
      };

      const newPlaylists = [...state.playlists];
      newPlaylists[playlistIndex] = updatedPlaylist;

      return {
        playlists: newPlaylists,
        isEditModalOpen: false,
      };
    });
  },

  deletePlaylist: (id: string) => {
    set((state) => {
      const target = state.playlists.find((p) => p.id === id);
      if (!target || target.isCurated) {
        return state;
      }

      const updatedPlaylists = state.playlists.filter((p) => p.id !== id);
      const updatedTracks = { ...state.playlistTracks };
      delete updatedTracks[id];

      return {
        playlists: updatedPlaylists,
        playlistTracks: updatedTracks,
        activePlaylistId: state.activePlaylistId === id ? null : state.activePlaylistId,
        isDeleteDialogOpen: false,
      };
    });
  },

  setActivePlaylistId: (id: string | null) => {
    set({
      activePlaylistId: id,
      detailSearchQuery: "",
      isAddSongsDrawerOpen: false,
    });
  },

  addTrackToPlaylist: (playlistId: string, trackId: string) => {
    set((state) => {
      const existingEntries = state.playlistTracks[playlistId] ?? [];
      const newEntry: PlaylistTrackEntry = {
        entryId: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        playlistId,
        trackId,
        position: existingEntries.length,
        addedAt: new Date().toISOString(),
      };

      return {
        playlistTracks: {
          ...state.playlistTracks,
          [playlistId]: [...existingEntries, newEntry],
        },
      };
    });
  },

  removeTrackFromPlaylist: (playlistId: string, entryId: string) => {
    set((state) => {
      const currentEntries = state.playlistTracks[playlistId] ?? [];
      const filtered = currentEntries.filter((e) => e.entryId !== entryId);
      // Reindex positions to maintain contiguous 0..N-1 sequence
      const reindexed = filtered.map((entry, index) => ({
        ...entry,
        position: index,
      }));

      return {
        playlistTracks: {
          ...state.playlistTracks,
          [playlistId]: reindexed,
        },
      };
    });
  },

  reorderTrack: (playlistId: string, sourceIndex: number, destinationIndex: number) => {
    set((state) => {
      const currentEntries = state.playlistTracks[playlistId] ?? [];
      if (
        sourceIndex < 0 ||
        sourceIndex >= currentEntries.length ||
        destinationIndex < 0 ||
        destinationIndex >= currentEntries.length ||
        sourceIndex === destinationIndex
      ) {
        return state;
      }

      const reordered = [...currentEntries];
      const [movedItem] = reordered.splice(sourceIndex, 1);
      reordered.splice(destinationIndex, 0, movedItem);

      const reindexed = reordered.map((entry, index) => ({
        ...entry,
        position: index,
      }));

      return {
        playlistTracks: {
          ...state.playlistTracks,
          [playlistId]: reindexed,
        },
      };
    });
  },

  setOverviewSearchQuery: (query: string) => {
    set({ overviewSearchQuery: query });
  },

  setDetailSearchQuery: (query: string) => {
    set({ detailSearchQuery: query });
  },

  setCreateModalOpen: (open: boolean) => {
    set({ isCreateModalOpen: open });
  },

  setEditModalOpen: (open: boolean) => {
    set({ isEditModalOpen: open });
  },

  setAddSongsDrawerOpen: (open: boolean) => {
    set({ isAddSongsDrawerOpen: open });
  },

  setDeleteDialogOpen: (open: boolean) => {
    set({ isDeleteDialogOpen: open });
  },

  playPlaylist: (playlistId: string, startIndex = 0) => {
    const entries = get().playlistTracks[playlistId] ?? [];
    if (entries.length === 0) return;

    const playlist = get().playlists.find((p) => p.id === playlistId);
    const hydrated = hydratePlaylistEntries(entries);
    if (hydrated.length === 0) return;

    const tracks: Track[] = hydrated.map((h) => ({
      ...h.track,
      album: playlist?.title ?? h.track.album,
    }));

    const clampedIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    usePlayerStore.getState().playCollection(tracks, clampedIndex);
  },

  shufflePlaylist: (playlistId: string) => {
    const entries = get().playlistTracks[playlistId] ?? [];
    if (entries.length === 0) return;

    const playlist = get().playlists.find((p) => p.id === playlistId);
    const hydrated = hydratePlaylistEntries(entries);
    if (hydrated.length === 0) return;

    const tracks: Track[] = hydrated.map((h) => ({
      ...h.track,
      album: playlist?.title ?? h.track.album,
    }));

    // Fisher-Yates shuffle
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    usePlayerStore.getState().playCollection(shuffled, 0);
  },
}));

const EMPTY_PLAYLIST_TRACKS: PlaylistTrackEntry[] = [];

// Typed selector hooks for performance optimization
export const usePlaylists = () => usePlaylistStore((state) => state.playlists);
export const useActivePlaylistId = () => usePlaylistStore((state) => state.activePlaylistId);
export const useActivePlaylist = () =>
  usePlaylistStore((state) => {
    if (!state.activePlaylistId) return null;
    return state.playlists.find((p) => p.id === state.activePlaylistId) ?? null;
  });
export const usePlaylistTracksByPlaylistId = (playlistId: string | null) =>
  usePlaylistStore((state) =>
    playlistId ? (state.playlistTracks[playlistId] ?? EMPTY_PLAYLIST_TRACKS) : EMPTY_PLAYLIST_TRACKS
  );
export const useOverviewSearchQuery = () => usePlaylistStore((state) => state.overviewSearchQuery);
export const useDetailSearchQuery = () => usePlaylistStore((state) => state.detailSearchQuery);
export const useIsCreateModalOpen = () => usePlaylistStore((state) => state.isCreateModalOpen);
export const useIsEditModalOpen = () => usePlaylistStore((state) => state.isEditModalOpen);
export const useIsAddSongsDrawerOpen = () =>
  usePlaylistStore((state) => state.isAddSongsDrawerOpen);
export const useIsDeleteDialogOpen = () => usePlaylistStore((state) => state.isDeleteDialogOpen);
