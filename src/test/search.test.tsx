import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";
import { Search } from "../pages/Search";
import { useSearchStore } from "../store/useSearchStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { searchTracksPool } from "../data/searchFixtures";

describe("Search and Explore Screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset stores before each test
    act(() => {
      useSearchStore.setState({
        query: "",
        activeCategory: "all",
        recentSearches: ["Chillwave", "Aiden Vale", "Midnight"],
        isSearching: false,
        results: {
          query: "",
          tracks: [],
          albums: [],
          artists: [],
          genres: [],
          totalMatches: 0,
        },
      });

      usePlayerStore.setState({
        currentTrack: searchTracksPool[0],
        queue: searchTracksPool,
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8,
        isMuted: false,
        isShuffle: false,
        repeatMode: "off",
        likedTrackIds: {},
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search bar, category filter pills, recent chips, and explore genre grid by default (AC-1, AC-2)", () => {
    render(<Search />);

    // Search bar input
    const searchInput = screen.getByLabelText("Search music");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue("");

    // Category filter pills
    expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /songs/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /albums/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /artists/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /genres/i })).toBeInTheDocument();

    // Recent search chips
    expect(screen.getByLabelText("Recent search: Chillwave")).toBeInTheDocument();
    expect(screen.getByLabelText("Recent search: Aiden Vale")).toBeInTheDocument();

    // Explore genres and moods grid
    expect(screen.getByRole("heading", { name: /explore genres & moods/i })).toBeInTheDocument();
    expect(screen.getByText("Indie Pop")).toBeInTheDocument();
    expect(screen.getByText("Synthwave")).toBeInTheDocument();
  });

  it("navigating from sidebar to Search renders Search screen in App shell (AC-1)", () => {
    render(<App />);

    const searchNavButton = screen.getByText("Search");
    fireEvent.click(searchNavButton);

    expect(screen.getByLabelText("Search and explore screen")).toBeInTheDocument();
    expect(screen.getByLabelText("Search music")).toBeInTheDocument();
  });

  it("debounces query input by 150ms and updates filtered results across tracks, albums, artists, genres (AC-4, AC-5)", () => {
    render(<Search />);

    const input = screen.getByLabelText("Search music");
    fireEvent.change(input, { target: { value: "Aiden" } });

    // Immediately updates the input field
    expect(input).toHaveValue("Aiden");

    // Before timer advances, debounce is still pending
    expect(screen.queryByText("Top Results")).not.toBeInTheDocument();

    // Fast-forward 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Should now show Top Results, Songs, and matching items
    expect(screen.getByText("Top Results")).toBeInTheDocument();
    expect(screen.getAllByText(/Aiden Vale/i).length).toBeGreaterThanOrEqual(1);
  });

  it("clicking an Explore genre card populates search, sets category to genres, and filters (AC-3)", () => {
    render(<Search />);

    const indiePopCard = screen.getByLabelText(/explore genre indie pop/i);
    fireEvent.click(indiePopCard);

    // Search input should have the genre name
    const searchInput = screen.getByLabelText("Search music");
    expect(searchInput).toHaveValue("Indie Pop");

    // Category should be switched to 'genres'
    const genresTab = screen.getByRole("tab", { name: /genres/i });
    expect(genresTab).toHaveAttribute("aria-selected", "true");

    // Should show genre results
    expect(screen.getByRole("region", { name: /genre results/i })).toBeInTheDocument();
  });

  it("isolates view to songs when Songs pill is selected (AC-6)", () => {
    render(<Search />);

    // Perform search
    act(() => {
      useSearchStore.getState().setQuery("Vale", true);
    });

    // Click Songs tab pill
    const songsTab = screen.getByRole("tab", { name: /songs/i });
    fireEvent.click(songsTab);

    expect(screen.getByRole("region", { name: /song results/i })).toBeInTheDocument();
    // Headers for table should exist
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
  });

  it("double-clicking or clicking quick play on a song starts playback and queues search results (AC-7)", () => {
    render(<Search />);

    act(() => {
      useSearchStore.getState().setQuery("Perfect", true);
    });

    // Find song play button or row
    const songRow = screen.getByLabelText(/Song: Perfect by Aiden Vale/i);
    fireEvent.doubleClick(songRow);

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.currentTrack?.title).toBe("Perfect");
  });

  it("clears search input, refocuses, and restores Explore view when clear button is clicked or Escape is pressed (AC-8)", () => {
    render(<Search />);

    const searchInput = screen.getByLabelText("Search music");
    act(() => {
      useSearchStore.getState().setQuery("Acoustic", true);
    });

    expect(screen.getByText("Top Results")).toBeInTheDocument();

    // Click Clear button
    const clearButton = screen.getByLabelText("Clear search");
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue("");
    expect(screen.getByRole("heading", { name: /explore genres & moods/i })).toBeInTheDocument();

    // Test Escape key shortcut
    act(() => {
      useSearchStore.getState().setQuery("Chillwave", true);
    });
    expect(searchInput).toHaveValue("Chillwave");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(searchInput).toHaveValue("");
    expect(screen.getByRole("heading", { name: /explore genres & moods/i })).toBeInTheDocument();
  });

  it("renders friendly empty state with quotes and suggestions when no results match (AC-9)", () => {
    render(<Search />);

    act(() => {
      useSearchStore.getState().setQuery("xyznonexistentmusic123", true);
    });

    expect(screen.getByRole("region", { name: /no search results/i })).toBeInTheDocument();
    expect(screen.getByText(/no results found for “xyznonexistentmusic123”/i)).toBeInTheDocument();
    expect(screen.getByText(/check for typos, try broader keywords/i)).toBeInTheDocument();
  });

  it("adds queries to recent searches up to 6 deduplicated items and clicking a chip applies it (AC-10)", () => {
    render(<Search />);

    act(() => {
      useSearchStore.getState().setQuery("Synthwave", true);
    });

    const recent = useSearchStore.getState().recentSearches;
    expect(recent[0]).toBe("Synthwave");
    expect(recent.length).toBeLessThanOrEqual(6);

    // Clicking recent chip re-applies the search
    const chip = screen.getByRole("button", { name: /recent search: synthwave/i });
    fireEvent.click(chip);

    expect(useSearchStore.getState().query).toBe("Synthwave");
  });
});
