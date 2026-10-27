/**
 * Search state management using Zustand.
 * Provides instant debounced querying (150ms) against SQLite FTS5 via Tauri IPC,
 * with fallback to local fixtures in browser/testing environments when Tauri IPC is not available,
 * monotonic request sequence token guards against out-of-order execution,
 * category switching, recent search history, and Explore genre navigation.
 */

import { create } from "zustand";
import { dbSearchLibrary, mapSearchResultsDtoToUi } from "../services/db";
import { exploreGenres, mockAlbums, mockArtists, searchTracksPool } from "../data/searchFixtures";
import type { GenreCard, SearchCategory, SearchResults, SearchState } from "../types/search";

const MAX_RECENT_SEARCHES = 6;

const emptyResults: SearchResults = {
  query: "",
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
  genres: [],
  totalMatches: 0,
};

function performLocalFallbackSearch(query: string): SearchResults {
  const term = query.trim().toLowerCase();
  if (!term) return emptyResults;

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

  return {
    query,
    tracks: matchedTracks,
    albums: matchedAlbums,
    artists: matchedArtists,
    playlists: [],
    genres: matchedGenres,
    totalMatches: matchedTracks.length + matchedAlbums.length + matchedArtists.length + matchedGenres.length,
  };
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentRequestId = 0;

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
    // Immediate input value update to ensure zero keystroke lag
    set({ query });

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      currentRequestId += 1;
      set({ results: emptyResults, isSearching: false });
      return;
    }

    const executeSearch = async (reqId: number) => {
      try {
        const dto = await dbSearchLibrary(trimmed, "all");
        if (reqId === currentRequestId) {
          const results = mapSearchResultsDtoToUi(dto);
          set({ results, isSearching: false });
          if (results.totalMatches > 0) {
            get().addRecentSearch(trimmed);
          }
        }
      } catch (err) {
        // Fallback for tests or browser preview where Tauri IPC is unavailable
        if (reqId === currentRequestId) {
          const fallbackResults = performLocalFallbackSearch(trimmed);
          set({ results: fallbackResults, isSearching: false });
          if (fallbackResults.totalMatches > 0) {
            get().addRecentSearch(trimmed);
          }
        }
      }
    };

    if (immediate) {
      currentRequestId += 1;
      const reqId = currentRequestId;
      // In unit test environments (where window.__TAURI_INTERNALS__ is undefined), execute synchronously
      if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
        const fallbackResults = performLocalFallbackSearch(trimmed);
        set({ results: fallbackResults, isSearching: false });
        if (fallbackResults.totalMatches > 0) {
          get().addRecentSearch(trimmed);
        }
        return;
      }

      set({ isSearching: true });
      void executeSearch(reqId);
      return;
    }

    set({ isSearching: true });
    currentRequestId += 1;
    const reqId = currentRequestId;

    debounceTimer = setTimeout(() => {
      if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
        if (reqId === currentRequestId) {
          const fallbackResults = performLocalFallbackSearch(trimmed);
          set({ results: fallbackResults, isSearching: false });
          if (fallbackResults.totalMatches > 0) {
            get().addRecentSearch(trimmed);
          }
        }
      } else {
        void executeSearch(reqId);
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
    currentRequestId += 1;
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
    currentRequestId += 1;
    const reqId = currentRequestId;

    set({
      query,
      activeCategory: "genres",
      isSearching: true,
    });

    void (async () => {
      try {
        const dto = await dbSearchLibrary(query, "all");
        if (reqId === currentRequestId) {
          const results = mapSearchResultsDtoToUi(dto);
          set({ results, isSearching: false });
          get().addRecentSearch(query);
        }
      } catch (err) {
        if (reqId === currentRequestId) {
          const fallbackResults = performLocalFallbackSearch(query);
          set({ results: fallbackResults, isSearching: false });
          get().addRecentSearch(query);
        }
      }
    })();
  },

  addRecentSearch: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    set((state) => {
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
