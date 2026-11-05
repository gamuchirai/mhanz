import { useMemo } from "react";
import { isTauri } from "@tauri-apps/api/core";
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
import type { AlbumDto, ArtistDto, TrackDto } from "../types/database";
import {
  initialArtists,
  initialArtistPopularTracks,
  initialArtistReleases,
} from "../data/artistFixtures";
import { dbGetArtists, dbGetArtistProfile } from "../services/db";
import { formatCoverArtUrl, onScanCompleted } from "../services/scanner";
import { usePlayerStore } from "./usePlayerStore";
import { taggerSync } from "../services/taggerSync";

/**
 * Maps SQLite ArtistDto to frontend Artist domain model.
 */
export function mapArtistDtoToArtist(dto: ArtistDto): Artist {
  return {
    id: dto.id,
    name: dto.name,
    avatarUrl: dto.avatar_path ? formatCoverArtUrl(dto.avatar_path) : "",
    heroBannerUrl: "",
    bio: dto.bio || undefined,
    trackCount: dto.track_count,
    albumCount: dto.album_count,
    totalPlays: dto.total_plays,
    genres: [],
    createdAt: new Date(dto.created_at * 1000).toISOString(),
    // Backward-compatible fields
    monthlyListeners: dto.total_plays,
    followerCount: 0,
    isFollowed: false,
    verified: true,
    popularTrackIds: [],
    albumIds: [],
  };
}

/**
 * Maps SQLite TrackDto to frontend ArtistPopularTrack model.
 */
export function mapTrackDtoToArtistPopularTrack(t: TrackDto): ArtistPopularTrack {
  return {
    id: t.id,
    artistId: t.artist_id || "",
    artistName: t.artist_name,
    title: t.title,
    albumId: t.album_id || "",
    albumTitle: t.album_name || "Unknown Album",
    coverUrl: t.cover_art_path ? formatCoverArtUrl(t.cover_art_path) : "",
    playCount: t.play_count,
    duration: Math.round(t.duration),
    isLiked: t.is_favorite,
    audioUrl: t.file_path,
    filePath: t.file_path,
  };
}

/**
 * Maps SQLite AlbumDto to frontend ArtistRelease model categorized by track count (AC-10).
 */
export function mapAlbumDtoToArtistRelease(a: AlbumDto): ArtistRelease {
  let releaseType: "album" | "single" | "ep";
  if (a.track_count === 1) {
    releaseType = "single";
  } else if (a.track_count >= 2 && a.track_count <= 3) {
    releaseType = "ep";
  } else {
    releaseType = "album";
  }

  return {
    id: a.id,
    artistId: a.artist_id || "",
    title: a.title,
    coverUrl: a.cover_art_path ? formatCoverArtUrl(a.cover_art_path) : "",
    releaseYear: a.year || 0,
    type: releaseType,
    trackCount: a.track_count,
  };
}

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
  isLoaded: boolean;
  isLoadingProfile: boolean;
  error: string | null;

  // Actions
  initializeArtists: () => Promise<void>;
  loadArtistProfile: (id: string, force?: boolean) => Promise<void>;
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
  isLoaded: false,
  isLoadingProfile: false,
  error: null,

  initializeArtists: async () => {
    if (!isTauri()) {
      // Browser preview and fallback (AC-2)
      set({
        artists: initialArtists,
        artistPopularTracks: initialArtistPopularTracks,
        artistReleases: initialArtistReleases,
        isLoading: false,
        isLoaded: true,
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const dtos = await dbGetArtists();
      const artists = dtos.map(mapArtistDtoToArtist);
      set({
        artists,
        isLoading: false,
        isLoaded: true,
      });
    } catch (err) {
      console.error("Failed to initialize artists from SQLite:", err);
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  loadArtistProfile: async (id: string, force = false): Promise<void> => {
    const existingTracks = get().artistPopularTracks[id];
    if (!force && existingTracks && existingTracks.length > 0) {
      return;
    }

    if (!isTauri()) {
      // In web browser fallback, use fixtures if available
      set({ isLoadingProfile: false });
      return;
    }

    set({ isLoadingProfile: true, error: null });
    try {
      const profileDto = await dbGetArtistProfile(id);
      if (!profileDto) {
        set({ isLoadingProfile: false });
        return;
      }

      const topTracks = profileDto.top_tracks.map(mapTrackDtoToArtistPopularTrack);
      const releases = profileDto.albums.map(mapAlbumDtoToArtistRelease);

      // Keep the artist item in the artists list in sync with fresh database stats
      const currentArtists = get().artists;
      const foundIdx = currentArtists.findIndex((a) => a.id === id);
      let updatedArtists = currentArtists;

      if (foundIdx >= 0) {
        const existing = currentArtists[foundIdx];
        const updatedArtist: Artist = {
          ...existing,
          totalPlays: profileDto.artist.total_plays,
          trackCount: profileDto.artist.track_count,
          albumCount: profileDto.artist.album_count,
          bio: profileDto.artist.bio || existing.bio,
          avatarUrl: profileDto.artist.avatar_path
            ? formatCoverArtUrl(profileDto.artist.avatar_path)
            : existing.avatarUrl,
        };
        updatedArtists = [
          ...currentArtists.slice(0, foundIdx),
          updatedArtist,
          ...currentArtists.slice(foundIdx + 1),
        ];
      }

      set((state) => ({
        artists: updatedArtists,
        artistPopularTracks: {
          ...state.artistPopularTracks,
          [id]: topTracks,
        },
        artistReleases: {
          ...state.artistReleases,
          [id]: releases,
        },
        isLoadingProfile: false,
      }));
    } catch (err) {
      console.error(`Failed to load artist profile for ${id}:`, err);
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoadingProfile: false,
      });
    }
  },

  setActiveArtistId: (id: string | null) => {
    set({
      activeArtistId: id,
      isPopularExpanded: false,
      discographyFilter: "all",
      isLoadingProfile: Boolean(id && isTauri() && !get().artistPopularTracks[id]),
    });

    if (id) {
      get()
        .loadArtistProfile(id)
        .catch((err) => {
          console.error(`Error loading profile for artist ${id}:`, err);
        });
    }
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
    const { followedArtistIds } = get();
    const isCurrentlyFollowed = followedArtistIds.includes(artistId);

    const nextFollowedIds = isCurrentlyFollowed
      ? followedArtistIds.filter((id) => id !== artistId)
      : [...followedArtistIds, artistId];

    set({ followedArtistIds: nextFollowedIds });
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
      genre: artist?.genres?.[0] ?? "Afro",
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

// Automatic scanner completion synchronization (AC-11)
if (typeof window !== "undefined") {
  onScanCompleted(async () => {
    if (isTauri()) {
      try {
        const dtos = await dbGetArtists();
        const artists = dtos.map(mapArtistDtoToArtist);
        useArtistStore.setState({ artists });

        const activeId = useArtistStore.getState().activeArtistId;
        if (activeId) {
          await useArtistStore.getState().loadArtistProfile(activeId, true);
        }
      } catch (err) {
        console.error("Failed to refresh artists on scan completion:", err);
      }
    }
  }).catch(() => {});
}

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
            (a.genres && a.genres.some((g) => g.toLowerCase().includes(query)))
        )
      : artists;

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "popularity") {
        comparison =
          (a.totalPlays ?? a.monthlyListeners ?? 0) -
          (b.totalPlays ?? b.monthlyListeners ?? 0);
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "albumCount") {
        comparison =
          (a.albumCount ?? a.albumIds?.length ?? 0) -
          (b.albumCount ?? b.albumIds?.length ?? 0);
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
    // Primary order: playCount descending; secondary: title ascending (Invariants)
    return [...rawTracks].sort((a, b) => {
      const diff = b.playCount - a.playCount;
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });
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

// Synchronize audio tag edits for artist popular tracks
taggerSync.subscribe((_event, updatedTracks) => {
  if (updatedTracks && updatedTracks.length > 0) {
    useArtistStore.setState((state) => {
      const updatedPop = { ...state.artistPopularTracks };
      for (const [artId, tracks] of Object.entries(updatedPop)) {
        updatedPop[artId] = tracks.map((t) => {
          const found = updatedTracks.find((ut) => ut.id === t.id);
          return found
            ? {
                ...t,
                title: found.title,
                artistName: found.artist_name,
                albumTitle: found.album_name || t.albumTitle,
                coverUrl: found.cover_art_path ? formatCoverArtUrl(found.cover_art_path) : t.coverUrl,
              }
            : t;
        });
      }
      return { artistPopularTracks: updatedPop };
    });
  }
});
