import { useMemo } from "react";
import { create } from "zustand";
import type { Album, AlbumSortOption, AlbumTrack, SortDirection } from "../types/album";
import type { Track } from "../types/discovery";
import { initialAlbums, initialAlbumTracks } from "../data/mockAlbums";
import { usePlayerStore } from "./usePlayerStore";

export interface AlbumStoreState {
  albums: Album[];
  albumTracks: Record<string, AlbumTrack[]>;
  activeAlbumId: string | null;
  searchQuery: string;
  sortBy: AlbumSortOption;
  sortDirection: SortDirection;
  favoriteAlbumIds: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveAlbumId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSort: (sortBy: AlbumSortOption, direction?: SortDirection) => void;
  toggleFavoriteAlbum: (id: string) => void;
  playAlbum: (albumId: string, startTrackId?: string) => void;
  shuffleAlbum: (albumId: string) => void;
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
  isLoading: false,
  error: null,

  setActiveAlbumId: (id: string | null) => {
    set({ activeAlbumId: id });
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

  toggleFavoriteAlbum: (id: string) => {
    const { favoriteAlbumIds, albums } = get();
    const isAlreadyFavorite = favoriteAlbumIds.includes(id);

    const nextFavorites = isAlreadyFavorite
      ? favoriteAlbumIds.filter((favId) => favId !== id)
      : [...favoriteAlbumIds, id];

    const updatedAlbums = albums.map((album) =>
      album.id === id ? { ...album, isFavorite: !isAlreadyFavorite } : album
    );

    set({
      favoriteAlbumIds: nextFavorites,
      albums: updatedAlbums,
    });
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

  playAlbum: (albumId: string, startTrackId?: string) => {
    const album = get().getAlbumById(albumId);
    if (!album) return;

    const tracks = get().getTracksForAlbum(albumId);
    if (tracks.length === 0) return;

    // Convert AlbumTracks to Player Tracks
    const playerTracks: Track[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: album.title,
      durationSeconds: t.duration,
      artworkUrl: album.coverUrl,
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

  shuffleAlbum: (albumId: string) => {
    const album = get().getAlbumById(albumId);
    if (!album) return;

    const tracks = get().getTracksForAlbum(albumId);
    if (tracks.length === 0) return;

    const playerTracks: Track[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: album.title,
      durationSeconds: t.duration,
      artworkUrl: album.coverUrl,
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

    usePlayerStore.getState().playCollection(shuffled, 0);
  },
}));

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
