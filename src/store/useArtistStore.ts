import { useMemo } from "react";
import { create } from "zustand";
import type {
  Artist,
  ArtistPopularTrack,
  ArtistRelease,
  ArtistSortOption,
  DiscographyFilter,
  SortDirection,
} from "../types/artists";
import type { Track } from "../types/discovery";
import {
  initialArtists,
  initialArtistPopularTracks,
  initialArtistReleases,
} from "../data/artistFixtures";
import { usePlayerStore } from "./usePlayerStore";

export interface ArtistStoreState {
  artists: Artist[];
  artistPopularTracks: Record<string, ArtistPopularTrack[]>;
  artistReleases: Record<string, ArtistRelease[]>;
  activeArtistId: string | null;
  searchQuery: string;
  sortBy: ArtistSortOption;
  sortDirection: SortDirection;
  discographyFilter: DiscographyFilter;
  followedArtistIds: string[];
  isPopularExpanded: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveArtistId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: ArtistSortOption, direction?: SortDirection) => void;
  toggleSortDirection: () => void;
  setDiscographyFilter: (filter: DiscographyFilter) => void;
  togglePopularExpanded: () => void;
  toggleFollowArtist: (artistId: string) => void;
  playArtistTopTracks: (artistId: string, startIndex?: number) => void;
  playPopularTrack: (track: ArtistPopularTrack) => void;
  resetFilters: () => void;
  getArtistById: (id: string) => Artist | undefined;
}

const initialFollowedIds = initialArtists.filter((a) => a.isFollowed).map((a) => a.id);

export const useArtistStore = create<ArtistStoreState>()((set, get) => ({
  artists: initialArtists,
  artistPopularTracks: initialArtistPopularTracks,
  artistReleases: initialArtistReleases,
  activeArtistId: null,
  searchQuery: "",
  sortBy: "popularity",
  sortDirection: "desc",
  discographyFilter: "all",
  followedArtistIds: initialFollowedIds,
  isPopularExpanded: false,
  isLoading: false,
  error: null,

  setActiveArtistId: (id: string | null) => {
    set({ activeArtistId: id, isPopularExpanded: false, discographyFilter: "all" });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSortBy: (sortBy: ArtistSortOption, direction?: SortDirection) => {
    const currentSort = get().sortBy;
    const currentDirection = get().sortDirection;

    let nextDirection = direction;
    if (!nextDirection) {
      if (currentSort === sortBy) {
        nextDirection = currentDirection === "asc" ? "desc" : "asc";
      } else {
        // Popularity and albumCount default to desc; name defaults to asc
        nextDirection = sortBy === "name" ? "asc" : "desc";
      }
    }

    set({ sortBy, sortDirection: nextDirection });
  },

  toggleSortDirection: () => {
    set((state) => ({
      sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
    }));
  },

  setDiscographyFilter: (filter: DiscographyFilter) => {
    set({ discographyFilter: filter });
  },

  togglePopularExpanded: () => {
    set((state) => ({ isPopularExpanded: !state.isPopularExpanded }));
  },

  toggleFollowArtist: (artistId: string) => {
    const { followedArtistIds, artists } = get();
    const isCurrentlyFollowed = followedArtistIds.includes(artistId);

    const nextFollowedIds = isCurrentlyFollowed
      ? followedArtistIds.filter((id) => id !== artistId)
      : [...followedArtistIds, artistId];

    const updatedArtists = artists.map((artist) => {
      if (artist.id === artistId) {
        const nextCount = isCurrentlyFollowed
          ? Math.max(0, artist.followerCount - 1)
          : artist.followerCount + 1;
        return {
          ...artist,
          isFollowed: !isCurrentlyFollowed,
          followerCount: nextCount,
        };
      }
      return artist;
    });

    set({
      followedArtistIds: nextFollowedIds,
      artists: updatedArtists,
    });
  },

  playArtistTopTracks: (artistId: string, startIndex = 0) => {
    const artist = get().getArtistById(artistId);
    const tracks = get().artistPopularTracks[artistId] ?? [];
    if (tracks.length === 0) return;

    const playerTracks: Track[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artistName,
      album: t.albumTitle,
      durationSeconds: t.duration,
      artworkUrl: t.coverUrl,
      playsCount: t.playCount,
      isLiked: !!t.isLiked,
      filePath: t.audioUrl,
      genre: artist?.genres[0] ?? "Afro",
    }));

    const safeStartIndex = Math.max(0, Math.min(startIndex, playerTracks.length - 1));
    usePlayerStore.getState().playCollection(playerTracks, safeStartIndex);
  },

  playPopularTrack: (track: ArtistPopularTrack) => {
    const tracks = get().artistPopularTracks[track.artistId] ?? [];
    const index = tracks.findIndex((t) => t.id === track.id);
    get().playArtistTopTracks(track.artistId, index >= 0 ? index : 0);
  },

  resetFilters: () => {
    set({
      searchQuery: "",
      sortBy: "popularity",
      sortDirection: "desc",
      discographyFilter: "all",
      isPopularExpanded: false,
    });
  },

  getArtistById: (id: string) => {
    return get().artists.find((artist) => artist.id === id);
  },
}));

// Granular selector hooks
export function useArtists(): Artist[] {
  const artists = useArtistStore((state) => state.artists);
  const searchQuery = useArtistStore((state) => state.searchQuery);
  const sortBy = useArtistStore((state) => state.sortBy);
  const sortDirection = useArtistStore((state) => state.sortDirection);

  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? artists.filter(
          (a) =>
            a.name.toLowerCase().includes(query) ||
            a.genres.some((g) => g.toLowerCase().includes(query))
        )
      : artists;

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "popularity") {
        comparison = a.monthlyListeners - b.monthlyListeners;
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "albumCount") {
        comparison = a.albumIds.length - b.albumIds.length;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [artists, searchQuery, sortBy, sortDirection]);
}

export function useActiveArtistId(): string | null {
  return useArtistStore((state) => state.activeArtistId);
}

export function useActiveArtist(): Artist | null {
  const activeArtistId = useArtistStore((state) => state.activeArtistId);
  const artists = useArtistStore((state) => state.artists);
  return useMemo(() => {
    if (!activeArtistId) return null;
    return artists.find((a) => a.id === activeArtistId) ?? null;
  }, [activeArtistId, artists]);
}

export function useArtistPopularTracks(artistId: string | null): ArtistPopularTrack[] {
  const rawTracks = useArtistStore((state) =>
    artistId ? state.artistPopularTracks[artistId] : undefined
  );

  return useMemo(() => {
    if (!rawTracks) return [];
    // Always sort by playCount descending
    return [...rawTracks].sort((a, b) => b.playCount - a.playCount);
  }, [rawTracks]);
}

export function useArtistReleases(artistId: string | null): ArtistRelease[] {
  const rawReleases = useArtistStore((state) =>
    artistId ? state.artistReleases[artistId] : undefined
  );
  const filter = useArtistStore((state) => state.discographyFilter);

  return useMemo(() => {
    if (!rawReleases) return [];
    let filtered = [...rawReleases];
    if (filter === "album") {
      filtered = filtered.filter((r) => r.type === "album");
    } else if (filter === "single") {
      filtered = filtered.filter((r) => r.type === "single" || r.type === "ep");
    }
    // Sort releases by releaseYear descending
    return filtered.sort((a, b) => b.releaseYear - a.releaseYear);
  }, [rawReleases, filter]);
}

export function useFollowedArtistIds(): string[] {
  return useArtistStore((state) => state.followedArtistIds);
}

export function useIsArtistFollowed(artistId: string): boolean {
  return useArtistStore((state) => state.followedArtistIds.includes(artistId));
}
