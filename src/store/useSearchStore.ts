/**
 * Search state management using Zustand.
 * Provides instant debounced querying (150ms), category switching, recent search history,
 * and Explore genre navigation.
 */

import { create } from "zustand";
import { exploreGenres, mockAlbums, mockArtists, searchTracksPool } from "../data/searchFixtures";
import type { GenreCard, SearchCategory, SearchResults, SearchState } from "../types/search";

const MAX_RECENT_SEARCHES = 6;

const emptyResults: SearchResults = {
  query: "",
  tracks: [],
  albums: [],
  artists: [],
  genres: [],
  totalMatches: 0,
};

function performFiltering(query: string): SearchResults {
  const term = query.trim().toLowerCase();
  if (!term) {
    return emptyResults;
  }

  const matchedTracks = searchTracksPool.filter(
    (t) =>
      t.title.toLowerCase().includes(term) ||
      t.artist.toLowerCase().includes(term) ||
      t.album.toLowerCase().includes(term) ||
      (t.genre && t.genre.toLowerCase().includes(term))
  );

  const matchedAlbums = mockAlbums.filter(
    (a) => a.title.toLowerCase().includes(term) || a.artist.toLowerCase().includes(term)
  );

  const matchedArtists = mockArtists.filter((a) => a.name.toLowerCase().includes(term));

  const matchedGenres = exploreGenres.filter(
    (g) => g.name.toLowerCase().includes(term) || g.slug.toLowerCase().includes(term)
  );

  const totalMatches =
    matchedTracks.length + matchedAlbums.length + matchedArtists.length + matchedGenres.length;

  return {
    query,
    tracks: matchedTracks,
    albums: matchedAlbums,
    artists: matchedArtists,
    genres: matchedGenres,
    totalMatches,
  };
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

interface ExtendedSearchState extends SearchState {
  setQuery: (query: string, immediate?: boolean) => void;
}

export const useSearchStore = create<ExtendedSearchState>()((set, get) => ({
  query: "",
  activeCategory: "all",
  recentSearches: ["Chillwave", "Aiden Vale", "Midnight"],
  isSearching: false,
  results: emptyResults,

  setQuery: (query: string, immediate = false) => {
    // Always update the input text immediately for zero input lag
    set({ query });

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      set({ results: emptyResults, isSearching: false });
      return;
    }

    if (immediate) {
      const results = performFiltering(query);
      set({ results, isSearching: false });
      if (results.totalMatches > 0) {
        get().addRecentSearch(trimmed);
      }
      return;
    }

    set({ isSearching: true });
    debounceTimer = setTimeout(() => {
      const results = performFiltering(query);
      set({ results, isSearching: false });
      if (results.totalMatches > 0) {
        get().addRecentSearch(trimmed);
      }
      debounceTimer = null;
    }, 150);
  },

  setCategory: (category: SearchCategory) => {
    set({ activeCategory: category });
  },

  clearSearch: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({
      query: "",
      isSearching: false,
      results: emptyResults,
      activeCategory: "all",
    });
  },

  selectGenre: (genre: GenreCard) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const query = genre.name;
    const results = performFiltering(query);
    set({
      query,
      activeCategory: "genres",
      results,
      isSearching: false,
    });
    get().addRecentSearch(genre.name);
  },

  addRecentSearch: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    set((state) => {
      // Deduplicate case-insensitively and keep newest first up to MAX_RECENT_SEARCHES
      const filtered = state.recentSearches.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      );
      return {
        recentSearches: [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES),
      };
    });
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },
}));

// Typed selector hooks for clean consumption and optimized renders
export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchCategory = () => useSearchStore((state) => state.activeCategory);
export const useSearchResults = () => useSearchStore((state) => state.results);
export const useRecentSearches = () => useSearchStore((state) => state.recentSearches);
export const useIsSearching = () => useSearchStore((state) => state.isSearching);
