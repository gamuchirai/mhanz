/**
 * Search and explore data models, state contracts, and filter category definitions.
 */

import type { Track } from "./discovery";

export interface GenreCard {
  id: string;
  name: string;
  slug: string;
  colorGradient: string;
  accentColor: string;
  icon: string;
  trackCount: number;
  coverUrl?: string;
}

export interface AlbumCard {
  id: string;
  title: string;
  artist: string;
  releaseYear: number;
  coverUrl: string;
  trackCount: number;
  tracks: Track[];
}

export interface ArtistCard {
  id: string;
  name: string;
  avatarUrl: string;
  followersCount: number;
  monthlyListeners: number;
  popularTracks: Track[];
}

export interface PlaylistCard {
  id: string;
  name: string;
  description: string;
  coverArtPath?: string;
  gradientPreset?: string;
  isFavorite: boolean;
  isCurated: boolean;
  trackCount: number;
}

export interface SearchResults {
  query: string;
  tracks: Track[];
  albums: AlbumCard[];
  artists: ArtistCard[];
  playlists: PlaylistCard[];
  genres: GenreCard[];
  totalMatches: number;
  executionTimeMs?: number;
}

export type SearchCategory = "all" | "songs" | "albums" | "artists" | "playlists" | "genres";

export interface SearchState {
  query: string;
  activeCategory: SearchCategory;
  recentSearches: string[];
  isSearching: boolean;
  results: SearchResults;
  setQuery: (query: string) => void;
  setCategory: (category: SearchCategory) => void;
  clearSearch: () => void;
  selectGenre: (genre: GenreCard) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}
