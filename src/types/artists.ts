/**
 * Artist domain and state types for artist collection browsing,
 * procedural avatar generation, popular tracks, and artist profile discography.
 */

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  heroBannerUrl?: string;
  monthlyListeners: number;
  followerCount: number;
  isFollowed: boolean;
  verified: boolean;
  bio: string;
  genres: string[];
  popularTrackIds: string[];
  albumIds: string[];
  createdAt?: string;
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
}

export interface ArtistRelease {
  id: string;
  artistId: string;
  title: string;
  coverUrl: string;
  releaseYear: number;
  type: 'album' | 'single' | 'ep';
  trackCount: number;
}

export type ArtistSortOption = 'popularity' | 'name' | 'albumCount';
export type SortDirection = 'asc' | 'desc';
export type DiscographyFilter = 'all' | 'album' | 'single';

export interface ArtistState {
  artists: Artist[];
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
  setSortBy: (sortBy: ArtistSortOption) => void;
  toggleSortDirection: () => void;
  setDiscographyFilter: (filter: DiscographyFilter) => void;
  togglePopularExpanded: () => void;
  toggleFollowArtist: (artistId: string) => void;
  playArtistTopTracks: (artistId: string, startIndex?: number) => void;
  resetFilters: () => void;
}
