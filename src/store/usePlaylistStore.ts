import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import type {
  HydratedPlaylistTrack,
  Playlist,
  PlaylistCreateInput,
  PlaylistTrackEntry,
  PlaylistUpdateInput,
} from "../types/playlist";
import type { Track } from "../types/discovery";
import type { PlaylistDto, TrackDto } from "../types/database";
import {
  initialPlaylists,
  initialPlaylistTracks,
  MIDNIGHT_GRADIENT_PRESETS,
  findCatalogTrackById,
} from "../data/playlistFixtures";
import {
  dbAddTracksToPlaylist,
  dbCreatePlaylist,
  dbDeletePlaylist,
  dbGetPlaylistDetails,
  dbGetPlaylists,
  dbRemovePlaylistTrack,
  dbReorderPlaylistTracks,
  dbUpdatePlaylist,
} from "../services/db";
import { favoritesSync } from "../services/favoritesSync";
import { formatCoverArtUrl } from "../services/scanner";
import { usePlayerStore } from "./usePlayerStore";
import { useLibraryStore } from "./useLibraryStore";

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
  isLoaded: boolean;
  isLoading: boolean;

  initializePlaylists: () => Promise<void>;
  loadPlaylistDetails: (playlistId: string) => Promise<void>;
  createPlaylist: (input: PlaylistCreateInput) => string;
  updatePlaylist: (id: string, input: PlaylistUpdateInput) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  setActivePlaylistId: (id: string | null) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, entryId: string) => Promise<void>;
  reorderTrack: (
    playlistId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => Promise<void>;
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
 * In memory cache of loaded track entities, populated when playlist details are retrieved.
 */
const dynamicTrackCache = new Map<string, Track>();

export function cacheTrack(track: Track): void {
  dynamicTrackCache.set(track.id, track);
}

export function mapTrackDtoToTrack(dto: TrackDto): Track {
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
    genre: dto.genre || undefined,
  };
}

export function mapPlaylistDtoToPlaylist(dto: PlaylistDto): Playlist {
  return {
    id: dto.id,
    title: dto.name,
    description: dto.description || "",
    coverGradient: dto.gradient_preset || MIDNIGHT_GRADIENT_PRESETS[0].gradient,
    coverUrl: dto.cover_art_path || undefined,
    isCurated: Boolean(dto.is_curated),
    createdAt: dto.created_at
      ? new Date(dto.created_at * 1000).toISOString()
      : new Date().toISOString(),
    updatedAt: dto.updated_at
      ? new Date(dto.updated_at * 1000).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Finds track entity by ID from dynamic cache, universal catalog, or library.
 */
export function findTrackForPlaylist(trackId: string): Track | undefined {
  if (dynamicTrackCache.has(trackId)) {
    return dynamicTrackCache.get(trackId);
  }

  const catalogTrack = findCatalogTrackById(trackId);
  if (catalogTrack) {
    return catalogTrack;
  }

  const libTrack = useLibraryStore.getState().tracks.find((t) => t.id === trackId);
  if (libTrack) {
    return {
      id: libTrack.id,
      title: libTrack.title,
      artist: libTrack.artist,
      album: libTrack.album,
      durationSeconds: libTrack.durationSeconds,
      artworkUrl: libTrack.artworkUrl,
      playsCount: libTrack.playsCount,
      isLiked: libTrack.isLiked,
      filePath: libTrack.filePath,
      genre: libTrack.genre,
    };
  }

  const playerState = usePlayerStore.getState();
  if (playerState.currentTrack && playerState.currentTrack.id === trackId) {
    return playerState.currentTrack;
  }
  const queueTrack = playerState.queue.find((t) => t.id === trackId);
  if (queueTrack) return queueTrack;

  return undefined;
}

/**
 * Hydrates playlist track entries with track details from universal catalog or cache.
 */
export function hydratePlaylistEntries(entries: PlaylistTrackEntry[]): HydratedPlaylistTrack[] {
  const result: HydratedPlaylistTrack[] = [];
  for (const entry of entries) {
    const track = findTrackForPlaylist(entry.trackId);
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
    const track = findTrackForPlaylist(entry.trackId);
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
  isLoaded: false,
  isLoading: false,

  initializePlaylists: async () => {
    set({ isLoading: true });
    try {
      if (isTauri()) {
        const dtos = await dbGetPlaylists();
        const mapped = dtos.map(mapPlaylistDtoToPlaylist);
        set({ playlists: mapped, isLoaded: true, isLoading: false });
      } else {
        set({ playlists: initialPlaylists, isLoaded: true, isLoading: false });
      }
    } catch (err) {
      console.warn("Failed to initialize playlists from database:", err);
      set({ isLoading: false });
    }
  },

  loadPlaylistDetails: async (playlistId: string) => {
    if (!isTauri()) return;
    try {
      const details = await dbGetPlaylistDetails(playlistId);
      if (!details) return;
      const mappedEntries: PlaylistTrackEntry[] = details.tracks.map((item) => {
        const trk = mapTrackDtoToTrack(item.track);
        cacheTrack(trk);
        return {
          entryId: item.id,
          playlistId: item.playlist_id,
          trackId: item.track.id,
          position: item.position,
          addedAt: item.added_at
            ? new Date(item.added_at * 1000).toISOString()
            : new Date().toISOString(),
        };
      });

      set((state) => ({
        playlistTracks: {
          ...state.playlistTracks,
          [playlistId]: mappedEntries,
        },
      }));
    } catch (err) {
      console.warn(`Failed to load details for playlist ${playlistId}:`, err);
    }
  },

  createPlaylist: (input: PlaylistCreateInput): string => {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error("Playlist title cannot be empty");
    }

    const newId = `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

    if (isTauri()) {
      dbCreatePlaylist({
        id: newId,
        name: trimmedTitle,
        description: input.description?.trim(),
        gradient_preset: input.coverGradient,
        cover_art_path: input.coverUrl?.trim(),
      }).catch((err) => {
        console.error("Failed to persist playlist creation:", err);
        // Rollback optimistic playlist
        set((state) => {
          const updated = state.playlists.filter((p) => p.id !== newId);
          const tracks = { ...state.playlistTracks };
          delete tracks[newId];
          return {
            playlists: updated,
            playlistTracks: tracks,
            activePlaylistId: state.activePlaylistId === newId ? null : state.activePlaylistId,
          };
        });
      });
    }

    return newId;
  },

  updatePlaylist: async (id: string, input: PlaylistUpdateInput) => {
    const current = get().playlists.find((p) => p.id === id);
    if (!current || current.isCurated) {
      // Invariant: Curated playlists cannot be renamed or altered
      return;
    }

    const updatedTitle = input.title !== undefined ? input.title.trim() : current.title;
    if (!updatedTitle) return;

    const previousPlaylist = { ...current };

    const updatedPlaylist: Playlist = {
      ...current,
      title: updatedTitle,
      description: input.description !== undefined ? input.description.trim() : current.description,
      coverGradient: input.coverGradient ?? current.coverGradient,
      coverUrl:
        input.coverUrl !== undefined ? input.coverUrl.trim() || undefined : current.coverUrl,
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? updatedPlaylist : p)),
      isEditModalOpen: false,
    }));

    if (isTauri()) {
      try {
        await dbUpdatePlaylist(id, {
          name: updatedPlaylist.title,
          description: updatedPlaylist.description,
          gradient_preset: updatedPlaylist.coverGradient,
          cover_art_path: updatedPlaylist.coverUrl,
        });
      } catch (err) {
        console.error("Failed to persist playlist update:", err);
        // Rollback to previous playlist state
        set((state) => ({
          playlists: state.playlists.map((p) => (p.id === id ? previousPlaylist : p)),
        }));
      }
    }
  },

  deletePlaylist: async (id: string) => {
    const target = get().playlists.find((p) => p.id === id);
    if (!target || target.isCurated) {
      return;
    }

    const previousPlaylists = [...get().playlists];
    const previousTracks = { ...get().playlistTracks };

    // Clear active playback context and upcoming queue if playing this playlist
    usePlayerStore.getState().clearContextIfMatches("playlist", id);

    set((state) => {
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

    if (isTauri()) {
      try {
        await dbDeletePlaylist(id);
      } catch (err) {
        console.error("Failed to persist playlist deletion:", err);
        // Rollback to previous playlists state
        set({
          playlists: previousPlaylists,
          playlistTracks: previousTracks,
        });
      }
    }
  },

  setActivePlaylistId: (id: string | null) => {
    set({
      activePlaylistId: id,
      detailSearchQuery: "",
      isAddSongsDrawerOpen: false,
    });
    if (id) {
      get()
        .loadPlaylistDetails(id)
        .catch(() => {});
    }
  },

  addTrackToPlaylist: async (playlistId: string, trackId: string) => {
    const existingEntries = get().playlistTracks[playlistId] ?? [];
    const temporaryEntryId = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: PlaylistTrackEntry = {
      entryId: temporaryEntryId,
      playlistId,
      trackId,
      position: existingEntries.length,
      addedAt: new Date().toISOString(),
    };

    set((state) => ({
      playlistTracks: {
        ...state.playlistTracks,
        [playlistId]: [...existingEntries, newEntry],
      },
    }));

    if (isTauri()) {
      try {
        await dbAddTracksToPlaylist(playlistId, [trackId]);
        await get().loadPlaylistDetails(playlistId);
      } catch (err) {
        console.error("Failed to persist track addition to playlist:", err);
        // Rollback optimistic addition
        set((state) => ({
          playlistTracks: {
            ...state.playlistTracks,
            [playlistId]: existingEntries,
          },
        }));
      }
    }
  },

  removeTrackFromPlaylist: async (playlistId: string, entryId: string) => {
    const previousEntries = get().playlistTracks[playlistId] ?? [];
    const filtered = previousEntries.filter((e) => e.entryId !== entryId);
    const reindexed = filtered.map((entry, index) => ({
      ...entry,
      position: index,
    }));

    set((state) => ({
      playlistTracks: {
        ...state.playlistTracks,
        [playlistId]: reindexed,
      },
    }));

    if (isTauri()) {
      try {
        await dbRemovePlaylistTrack(playlistId, entryId);
      } catch (err) {
        console.error("Failed to persist track removal from playlist:", err);
        // Rollback to previous entries
        set((state) => ({
          playlistTracks: {
            ...state.playlistTracks,
            [playlistId]: previousEntries,
          },
        }));
      }
    }
  },

  reorderTrack: async (playlistId: string, sourceIndex: number, destinationIndex: number) => {
    const previousEntries = get().playlistTracks[playlistId] ?? [];
    if (
      sourceIndex < 0 ||
      sourceIndex >= previousEntries.length ||
      destinationIndex < 0 ||
      destinationIndex >= previousEntries.length ||
      sourceIndex === destinationIndex
    ) {
      return;
    }

    const reordered = [...previousEntries];
    const [movedItem] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, movedItem);

    const reindexed = reordered.map((entry, index) => ({
      ...entry,
      position: index,
    }));

    set((state) => ({
      playlistTracks: {
        ...state.playlistTracks,
        [playlistId]: reindexed,
      },
    }));

    if (isTauri()) {
      try {
        const orderedEntryIds = reindexed.map((e) => e.entryId);
        await dbReorderPlaylistTracks(playlistId, orderedEntryIds);
      } catch (err) {
        console.error("Failed to persist track reordering:", err);
        // Rollback to previous ordering
        set((state) => ({
          playlistTracks: {
            ...state.playlistTracks,
            [playlistId]: previousEntries,
          },
        }));
      }
    }
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

    usePlayerStore.getState().setPlaybackContext({
      type: "playlist",
      id: playlistId,
      title: playlist?.title,
    });

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

    usePlayerStore.getState().setPlaybackContext({
      type: "playlist",
      id: playlistId,
      title: playlist?.title,
    });

    usePlayerStore.getState().playCollection(shuffled, 0);
  },
}));

// Synchronize track favorite status across any cached playlist tracks
favoritesSync.subscribe((trackId: string, isLiked: boolean) => {
  if (dynamicTrackCache.has(trackId)) {
    const cached = dynamicTrackCache.get(trackId);
    if (cached) {
      dynamicTrackCache.set(trackId, { ...cached, isLiked });
    }
  }
});

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
export const useIsPlaylistsLoaded = () => usePlaylistStore((state) => state.isLoaded);
export const useIsPlaylistsLoading = () => usePlaylistStore((state) => state.isLoading);
