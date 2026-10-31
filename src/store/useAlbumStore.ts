import { useMemo } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import type { Album, AlbumSortOption, AlbumTrack, SortDirection } from "../types/album";
import type { Track } from "../types/discovery";
import type { AlbumDto, TrackDto } from "../types/database";
import { initialAlbums, initialAlbumTracks } from "../data/mockAlbums";
import { dbGetAlbums, dbGetAlbumDetails, dbToggleAlbumFavorite } from "../services/db";
import { favoritesSync } from "../services/favoritesSync";
import { formatCoverArtUrl, onScanCompleted } from "../services/scanner";
import { usePlayerStore } from "./usePlayerStore";

/**
 * Maps SQLite AlbumDto to frontend Album domain model.
 */
export function mapAlbumDtoToAlbum(dto: AlbumDto): Album {
  return {
    id: dto.id,
    title: dto.title,
    artistId: dto.artist_id || "",
    artistName: dto.artist_name,
    coverUrl: dto.cover_art_path ? formatCoverArtUrl(dto.cover_art_path) : "",
    releaseYear: dto.year || 0,
    genre: dto.genre || "",
    trackCount: dto.track_count,
    totalDuration: Math.round(dto.total_duration),
    isFavorite: dto.is_favorite,
    createdAt: new Date(dto.created_at * 1000).toISOString(),
  };
}

/**
 * Maps SQLite TrackDto to frontend AlbumTrack domain model.
 */
export function mapTrackDtoToAlbumTrack(
  t: TrackDto,
  albumTitle: string,
  coverUrl?: string
): AlbumTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist_name,
    artistId: t.artist_id || undefined,
    album: t.album_name || albumTitle,
    albumId: t.album_id || "",
    discNumber: t.disc_number || 1,
    trackNumber: t.track_number || 1,
    duration: Math.round(t.duration),
    coverUrl: t.cover_art_path ? formatCoverArtUrl(t.cover_art_path) : coverUrl,
    audioUrl: t.file_path,
    isLiked: t.is_favorite,
  };
}

export interface AlbumStoreState {
  albums: Album[];
  albumTracks: Record<string, AlbumTrack[]>;
  activeAlbumId: string | null;
  searchQuery: string;
  sortBy: AlbumSortOption;
  sortDirection: SortDirection;
  favoriteAlbumIds: string[];
  explicitFavoriteAlbumIds: string[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Actions
  initializeAlbums: () => Promise<void>;
  fetchAlbumDetails: (albumId: string, force?: boolean) => Promise<AlbumTrack[]>;
  setActiveAlbumId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSort: (sortBy: AlbumSortOption, direction?: SortDirection) => void;
  toggleFavoriteAlbum: (id: string, targetFavorite?: boolean) => Promise<void>;
  playAlbum: (albumId: string, startTrackId?: string) => Promise<void>;
  shuffleAlbum: (albumId: string) => Promise<void>;
  getAlbumById: (id: string) => Album | undefined;
  getTracksForAlbum: (albumId: string) => AlbumTrack[];
}

const initialFavorites: string[] = initialAlbums
  .filter((album) => album.isFavorite)
  .map((album) => album.id);

export const useAlbumStore = create<AlbumStoreState>()((set, get) => ({
  albums: initialAlbums,
  albumTracks: initialAlbumTracks,
  activeAlbumId: null,
  searchQuery: "",
  sortBy: "title",
  sortDirection: "asc",
  favoriteAlbumIds: initialFavorites,
  explicitFavoriteAlbumIds: initialFavorites,
  isLoading: false,
  isLoaded: false,
  error: null,

  initializeAlbums: async () => {
    if (!isTauri()) {
      // Browser preview and unit testing fallback (AC-11)
      set({
        albums: initialAlbums,
        albumTracks: initialAlbumTracks,
        favoriteAlbumIds: initialFavorites,
        explicitFavoriteAlbumIds: initialFavorites,
        isLoading: false,
        isLoaded: true,
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const dtos = await dbGetAlbums();
      const albums = dtos.map(mapAlbumDtoToAlbum);
      const favoriteAlbumIds = albums.filter((a) => a.isFavorite).map((a) => a.id);

      set({
        albums,
        favoriteAlbumIds,
        explicitFavoriteAlbumIds: favoriteAlbumIds,
        isLoading: false,
        isLoaded: true,
      });
    } catch (err) {
      console.error("Failed to initialize albums from SQLite:", err);
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  fetchAlbumDetails: async (albumId: string, force = false): Promise<AlbumTrack[]> => {
    const existing = get().albumTracks[albumId];
    if (!force && existing && existing.length > 0) {
      return existing;
    }

    if (!isTauri()) {
      return get().albumTracks[albumId] ?? [];
    }

    try {
      const detail = await dbGetAlbumDetails(albumId);
      if (!detail) {
        return [];
      }

      const album = get().getAlbumById(albumId);
      const albumTitle = detail.album.title || album?.title || "Unknown Album";
      const coverUrl = detail.album.cover_art_path
        ? formatCoverArtUrl(detail.album.cover_art_path)
        : album?.coverUrl;

      const mappedTracks = detail.tracks.map((t) =>
        mapTrackDtoToAlbumTrack(t, albumTitle, coverUrl)
      );

      // Keep album catalog duration and favorite state synchronized
      const updatedAlbums = get().albums.map((a) => {
        if (a.id === albumId) {
          return {
            ...a,
            trackCount: detail.album.track_count,
            totalDuration: Math.round(detail.album.total_duration),
            isFavorite: detail.album.is_favorite,
          };
        }
        return a;
      });

      const nextFavIds = detail.album.is_favorite
        ? Array.from(new Set([...get().favoriteAlbumIds, albumId]))
        : get().favoriteAlbumIds.filter((id) => id !== albumId);

      set((state) => ({
        albums: updatedAlbums,
        favoriteAlbumIds: nextFavIds,
        albumTracks: {
          ...state.albumTracks,
          [albumId]: mappedTracks,
        },
      }));

      return mappedTracks;
    } catch (err) {
      console.error(`Failed to fetch album details for ${albumId}:`, err);
      return get().albumTracks[albumId] ?? [];
    }
  },

  setActiveAlbumId: (id: string | null) => {
    set({ activeAlbumId: id });
    if (id) {
      get().fetchAlbumDetails(id).catch((err) => {
        console.error(`Lazy detail fetch error for album ${id}:`, err);
      });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSort: (sortBy: AlbumSortOption, direction?: SortDirection) => {
    const currentSort = get().sortBy;
    const currentDirection = get().sortDirection;

    let nextDirection = direction;
    if (!nextDirection) {
      if (currentSort === sortBy) {
        nextDirection = currentDirection === "asc" ? "desc" : "asc";
      } else {
        nextDirection = "asc";
      }
    }

    set({ sortBy, sortDirection: nextDirection });
  },

  toggleFavoriteAlbum: async (id: string, targetFavorite?: boolean) => {
    const { favoriteAlbumIds, explicitFavoriteAlbumIds, albums, albumTracks } = get();
    const isAlreadyFavorite = favoriteAlbumIds.includes(id);
    const nextFavorite = targetFavorite !== undefined ? targetFavorite : !isAlreadyFavorite;

    // Snapshot previous state for rollback on error (AC-8)
    const prevAlbums = albums;
    const prevFavoriteIds = favoriteAlbumIds;
    const prevExplicitIds = explicitFavoriteAlbumIds;
    const prevTracks = albumTracks;

    // Optimistic update
    const nextFavorites = nextFavorite
      ? Array.from(new Set([...favoriteAlbumIds, id]))
      : favoriteAlbumIds.filter((favId) => favId !== id);

    const nextExplicitFavorites = nextFavorite
      ? Array.from(new Set([...explicitFavoriteAlbumIds, id]))
      : explicitFavoriteAlbumIds.filter((favId) => favId !== id);

    const updatedAlbums = albums.map((album) =>
      album.id === id ? { ...album, isFavorite: nextFavorite } : album
    );

    const cachedTracks = albumTracks[id];
    const updatedAlbumTracks = cachedTracks
      ? {
          ...albumTracks,
          [id]: cachedTracks.map((t) => ({ ...t, isLiked: nextFavorite })),
        }
      : albumTracks;

    set({
      favoriteAlbumIds: nextFavorites,
      explicitFavoriteAlbumIds: nextExplicitFavorites,
      albums: updatedAlbums,
      albumTracks: updatedAlbumTracks,
    });

    if (!isTauri()) {
      return;
    }

    try {
      const result = await dbToggleAlbumFavorite(id, nextFavorite);

      // Broadcast full affected tracks to synchronize liked songs and other stores (AC-5, AC-8)
      favoritesSync.broadcastBatch(result.affected_tracks, result.is_favorite);

      // Reconcile cached tracks with database result
      if (result.affected_tracks.length > 0) {
        const album = get().getAlbumById(id);
        const albumTitle = album?.title || "Unknown Album";
        const coverUrl = album?.coverUrl;

        const mappedTracks = result.affected_tracks.map((t) =>
          mapTrackDtoToAlbumTrack(t, albumTitle, coverUrl)
        );

        set((state) => ({
          albumTracks: {
            ...state.albumTracks,
            [id]: mappedTracks,
          },
        }));
      }
    } catch (err) {
      console.error("Failed to persist album favorite to SQLite; rolling back optimistic update:", err);
      // Revert to snapshot on write failure (AC-8)
      set({
        favoriteAlbumIds: prevFavoriteIds,
        explicitFavoriteAlbumIds: prevExplicitIds,
        albums: prevAlbums,
        albumTracks: prevTracks,
      });
      throw err;
    }
  },

  getAlbumById: (id: string) => {
    return get().albums.find((album) => album.id === id);
  },

  getTracksForAlbum: (albumId: string) => {
    const tracks = get().albumTracks[albumId] ?? [];
    // Sort primarily by discNumber ascending, then trackNumber ascending
    return [...tracks].sort((a, b) => {
      if (a.discNumber !== b.discNumber) {
        return a.discNumber - b.discNumber;
      }
      return a.trackNumber - b.trackNumber;
    });
  },

  playAlbum: async (albumId: string, startTrackId?: string) => {
    let tracks = get().getTracksForAlbum(albumId);
    if (tracks.length === 0) {
      tracks = await get().fetchAlbumDetails(albumId);
    }
    const album = get().getAlbumById(albumId);
    if (!album || tracks.length === 0) return;

    // Convert AlbumTracks to Player Tracks preserving multi disc order (AC-12)
    const playerTracks: Track[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: album.title,
      durationSeconds: t.duration,
      artworkUrl: t.coverUrl || album.coverUrl,
      playsCount: 0,
      isLiked: !!t.isLiked,
      filePath: t.audioUrl,
      genre: album.genre,
    }));

    let startIndex = 0;
    if (startTrackId) {
      const foundIndex = playerTracks.findIndex((t) => t.id === startTrackId);
      if (foundIndex !== -1) {
        startIndex = foundIndex;
      }
    }

    usePlayerStore.getState().playCollection(playerTracks, startIndex);
  },

  shuffleAlbum: async (albumId: string) => {
    let tracks = get().getTracksForAlbum(albumId);
    if (tracks.length === 0) {
      tracks = await get().fetchAlbumDetails(albumId);
    }
    const album = get().getAlbumById(albumId);
    if (!album || tracks.length === 0) return;

    const playerTracks: Track[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: album.title,
      durationSeconds: t.duration,
      artworkUrl: t.coverUrl || album.coverUrl,
      playsCount: 0,
      isLiked: !!t.isLiked,
      filePath: t.audioUrl,
      genre: album.genre,
    }));

    // Fisher-Yates shuffle
    const shuffled = [...playerTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    const playerStore = usePlayerStore.getState();
    if (!playerStore.isShuffle) {
      playerStore.toggleShuffle();
    }
    playerStore.playCollection(shuffled, 0);
  },
}));

// Synchronize track favorite status across all loaded album tracks and derive album favorite state (AC-9)
favoritesSync.subscribe((trackId: string, isLiked: boolean) => {
  useAlbumStore.setState((state) => {
    let hasChanged = false;
    const updatedAlbumTracks: Record<string, AlbumTrack[]> = {};
    const affectedAlbumIds = new Set<string>();

    for (const [albumId, tracks] of Object.entries(state.albumTracks)) {
      let albumChanged = false;
      const mappedTracks = tracks.map((t) => {
        if (t.id === trackId && t.isLiked !== isLiked) {
          hasChanged = true;
          albumChanged = true;
          affectedAlbumIds.add(albumId);
          return { ...t, isLiked };
        }
        return t;
      });
      updatedAlbumTracks[albumId] = albumChanged ? mappedTracks : tracks;
    }

    if (!hasChanged) return state;

    // Recalculate derived album favorite state for affected albums based on the 50% liked threshold (AC-9)
    let nextFavoriteIds = [...state.favoriteAlbumIds];
    const updatedAlbums = state.albums.map((album) => {
      if (affectedAlbumIds.has(album.id)) {
        const tracks = updatedAlbumTracks[album.id] ?? [];
        const total = tracks.length;
        const likedCount = tracks.filter((t) => t.isLiked).length;
        const isDerivedFavorite = total > 0 && likedCount * 2 >= total;
        const isExplicitFavorite = state.explicitFavoriteAlbumIds.includes(album.id);
        const shouldBeFavorite = isDerivedFavorite || isExplicitFavorite;

        if (shouldBeFavorite && !nextFavoriteIds.includes(album.id)) {
          nextFavoriteIds.push(album.id);
        } else if (!shouldBeFavorite && nextFavoriteIds.includes(album.id)) {
          nextFavoriteIds = nextFavoriteIds.filter((id) => id !== album.id);
        }

        return { ...album, isFavorite: shouldBeFavorite };
      }
      return album;
    });

    return {
      albumTracks: updatedAlbumTracks,
      albums: updatedAlbums,
      favoriteAlbumIds: nextFavoriteIds,
    };
  });
});

// Automatic scanner completion synchronization (AC-10)
if (typeof window !== "undefined") {
  onScanCompleted(async () => {
    if (isTauri()) {
      try {
        const dtos = await dbGetAlbums();
        const albums = dtos.map(mapAlbumDtoToAlbum);
        const favoriteAlbumIds = albums.filter((a) => a.isFavorite).map((a) => a.id);

        useAlbumStore.setState({ albums, favoriteAlbumIds });

        // Refresh currently active album detail if one is open
        const activeId = useAlbumStore.getState().activeAlbumId;
        if (activeId) {
          await useAlbumStore.getState().fetchAlbumDetails(activeId, true);
        }
      } catch (err) {
        console.error("Failed to refresh albums on scan completion:", err);
      }
    }
  }).catch(() => {});
}

// Granular selector hooks for optimal component rendering
export function useAlbums(): Album[] {
  const albums = useAlbumStore((state) => state.albums);
  const searchQuery = useAlbumStore((state) => state.searchQuery);
  const sortBy = useAlbumStore((state) => state.sortBy);
  const sortDirection = useAlbumStore((state) => state.sortDirection);

  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? albums.filter(
          (a) =>
            a.title.toLowerCase().includes(query) ||
            a.artistName.toLowerCase().includes(query) ||
            a.genre.toLowerCase().includes(query)
        )
      : albums;

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "artist") {
        comparison = a.artistName.localeCompare(b.artistName);
      } else if (sortBy === "releaseYear") {
        comparison = a.releaseYear - b.releaseYear;
      } else if (sortBy === "trackCount") {
        comparison = a.trackCount - b.trackCount;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [albums, searchQuery, sortBy, sortDirection]);
}

export function useActiveAlbumId(): string | null {
  return useAlbumStore((state) => state.activeAlbumId);
}

export function useActiveAlbum(): Album | null {
  const activeAlbumId = useAlbumStore((state) => state.activeAlbumId);
  const albums = useAlbumStore((state) => state.albums);
  return useMemo(() => {
    if (!activeAlbumId) return null;
    return albums.find((a) => a.id === activeAlbumId) ?? null;
  }, [activeAlbumId, albums]);
}

export function useAlbumTracks(albumId: string | null): AlbumTrack[] {
  const rawTracks = useAlbumStore((state) => (albumId ? state.albumTracks[albumId] : undefined));

  return useMemo(() => {
    if (!rawTracks) return [];
    return [...rawTracks].sort((a, b) => {
      if (a.discNumber !== b.discNumber) {
        return a.discNumber - b.discNumber;
      }
      return a.trackNumber - b.trackNumber;
    });
  }, [rawTracks]);
}

export function useFavoriteAlbumIds(): string[] {
  return useAlbumStore((state) => state.favoriteAlbumIds);
}

export function useIsAlbumsLoading(): boolean {
  return useAlbumStore((state) => state.isLoading);
}

export function useIsAlbumsLoaded(): boolean {
  return useAlbumStore((state) => state.isLoaded);
}

export function useAlbumError(): string | null {
  return useAlbumStore((state) => state.error);
}
