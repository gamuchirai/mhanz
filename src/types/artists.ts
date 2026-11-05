/**
 * Artist domain and state types for artist collection browsing,
 * procedural avatar generation, popular tracks, and artist profile discography.
 */

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  heroBannerUrl?: string;
  bio?: string;
  trackCount: number;
  albumCount: number;
  totalPlays: number;
  genres: string[];
  createdAt?: string;

  // Backward-compatible facade properties for tests and preview fixtures
  monthlyListeners?: number;
  followerCount?: number;
  isFollowed?: boolean;
  verified?: boolean;
  popularTrackIds?: string[];
  albumIds?: string[];
}

export interface ArtistPopularTrack {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  albumId: string;
  albumTitle: string;
  coverUrl: string;
  playCount: number;
  duration: number; // in seconds
  isLiked?: boolean;
  audioUrl?: string;
  filePath?: string;
}

export interface ArtistRelease {
  id: string;
  artistId: string;
  title: string;
  coverUrl: string;
  releaseYear: number;
  type: "album" | "single" | "ep";
  trackCount: number;
}

export type ArtistSortOption = "popularity" | "name" | "albumCount";
export type SortDirection = "asc" | "desc";
export type DiscographyFilter = "all" | "album" | "single";

export interface ArtistState {
  artists: Artist[];
  activeArtistId: string | null;
  searchQuery: string;
  sortBy: ArtistSortOption;
  sortDirection: SortDirection;
  discographyFilter: DiscographyFilter;
  followedArtistIds?: string[];
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
  toggleFollowArtist?: (artistId: string) => void;
  playArtistTopTracks: (artistId: string, startIndex?: number) => void;
  playPopularTrack: (track: ArtistPopularTrack) => void;
  resetFilters: () => void;
  getArtistById: (id: string) => Artist | undefined;
}
