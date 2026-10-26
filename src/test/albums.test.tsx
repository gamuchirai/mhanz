import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { App } from "../App";
import { Albums } from "../pages/Albums";
import { useAlbumStore } from "../store/useAlbumStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useSearchStore } from "../store/useSearchStore";
import { initialAlbums, initialAlbumTracks } from "../data/mockAlbums";

describe("Albums and Album Detail Screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    act(() => {
      // Reset album store to clean fixture state
      useAlbumStore.setState({
        albums: JSON.parse(JSON.stringify(initialAlbums)),
        albumTracks: JSON.parse(JSON.stringify(initialAlbumTracks)),
        activeAlbumId: null,
        searchQuery: "",
        sortBy: "title",
        sortDirection: "asc",
        favoriteAlbumIds: ["album-1", "album-3", "album-6"],
        isLoading: false,
        error: null,
      });

      // Reset player store
      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8,
        isMuted: false,
        isShuffle: false,
        repeatMode: "off",
        likedTrackIds: {},
      });

      // Reset search store
      useSearchStore.setState({
        query: "",
        activeCategory: "all",
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigating to Albums in the sidebar renders the Albums overview screen (AC-1)", () => {
    render(<App />);

    const albumsNav = screen.getByRole("link", { name: /albums/i });
    expect(albumsNav).toBeInTheDocument();

    fireEvent.click(albumsNav);

    // Verify header title and controls
    expect(screen.getByRole("heading", { name: /^albums$/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search albums or artists\.\.\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort albums by/i)).toBeInTheDocument();

    // Verify album cards are rendered
    expect(screen.getByRole("article", { name: /timeless vibrations/i })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /echoes of the highveld/i })).toBeInTheDocument();
  });

  it("typing into the search input filters albums and displays empty state when no match (AC-2)", () => {
    render(<Albums />);

    const searchInput = screen.getByPlaceholderText(/search albums or artists\.\.\./i);

    // Filter by title
    fireEvent.change(searchInput, { target: { value: "Highveld" } });
    expect(screen.getByRole("article", { name: /echoes of the highveld/i })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: /timeless vibrations/i })).not.toBeInTheDocument();

    // Filter with no matches
    fireEvent.change(searchInput, { target: { value: "NonexistentQuery12345" } });
    expect(screen.getByRole("status", { name: /no albums found/i })).toBeInTheDocument();
    expect(screen.getByText(/no albums matching "NonexistentQuery12345"/i)).toBeInTheDocument();

    // Click clear search button
    const clearBtn = screen.getByRole("button", { name: /clear search/i });
    fireEvent.click(clearBtn);

    // Restores full album list
    expect(screen.getByRole("article", { name: /timeless vibrations/i })).toBeInTheDocument();
  });

  it("sort selector reorders albums by title, artist, year, and track count (AC-3)", () => {
    render(<Albums />);

    const sortSelect = screen.getByLabelText(/sort albums by/i);

    // Sort by release year
    fireEvent.change(sortSelect, { target: { value: "releaseYear" } });
    let articles = screen.getAllByRole("article");
    // Ancestral Roots (2019) should come before Timeless Vibrations (2024) in asc
    expect(articles[0]).toHaveTextContent(/ancestral roots/i);

    // Toggle direction to desc
    const dirBtn = screen.getByTitle(/switch to descending/i);
    fireEvent.click(dirBtn);
    articles = screen.getAllByRole("article");
    // Timeless Vibrations (2024) should come first in desc
    expect(articles[0]).toHaveTextContent(/timeless vibrations/i);

    // Sort by artist
    fireEvent.change(sortSelect, { target: { value: "artist" } });
    articles = screen.getAllByRole("article");
    // Amina V should be first alphabetically
    expect(articles[0]).toHaveTextContent(/amina v/i);
  });

  it("clicking an album card opens Album Detail view with metadata and actions (AC-4)", () => {
    render(<Albums />);

    const albumCard = screen.getByRole("article", { name: /timeless vibrations/i });
    fireEvent.click(albumCard);

    // In detail view, All Albums back button appears
    expect(screen.getByRole("button", { name: /back to all albums/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /timeless vibrations/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/midnight soundworks/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shuffle/i })).toBeInTheDocument();
  });

  it("clicking back button in Album Detail returns to overview grid preserving search query (AC-5)", () => {
    render(<Albums />);

    const searchInput = screen.getByPlaceholderText(/search albums or artists\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "Amina" } });

    // Click into album
    const card = screen.getByRole("article", { name: /timeless vibrations/i });
    fireEvent.click(card);

    expect(
      screen.getByRole("heading", { name: /timeless vibrations/i, level: 1 })
    ).toBeInTheDocument();

    // Click back button
    const backBtn = screen.getByRole("button", { name: /back to all albums/i });
    fireEvent.click(backBtn);

    // Back in overview grid, search query "Amina" is preserved
    const restoredInput = screen.getByPlaceholderText(
      /search albums or artists\.\.\./i
    ) as HTMLInputElement;
    expect(restoredInput.value).toBe("Amina");
    expect(screen.getByRole("article", { name: /timeless vibrations/i })).toBeInTheDocument();
  });

  it("clicking artist name link in Album Detail navigates to Artists view (AC-6)", () => {
    const onNavigateArtist = vi.fn();
    const onNavigate = vi.fn();

    // Set active album to album-1
    act(() => {
      useAlbumStore.getState().setActiveAlbumId("album-1");
    });

    render(<Albums onNavigate={onNavigate} onNavigateArtist={onNavigateArtist} />);

    const artistLink = screen.getByRole("button", { name: /view artist profile for amina v/i });
    fireEvent.click(artistLink);

    expect(onNavigateArtist).toHaveBeenCalledWith("artist-amina-v", "Amina V");
  });

  it("clicking Play All or Shuffle queues all album tracks in correct sequence (AC-7)", () => {
    act(() => {
      useAlbumStore.getState().setActiveAlbumId("album-1");
    });

    render(<Albums />);

    const playAllBtn = screen.getByRole("button", { name: /play all album tracks/i });
    fireEvent.click(playAllBtn);

    const playerState = usePlayerStore.getState();
    expect(playerState.queue.length).toBe(6);
    expect(playerState.currentTrack?.title).toBe("Solitary Horizon");
    expect(playerState.isPlaying).toBe(true);

    // Test shuffle
    const shuffleBtn = screen.getByRole("button", { name: /shuffle album tracks/i });
    fireEvent.click(shuffleBtn);

    const newPlayerState = usePlayerStore.getState();
    expect(newPlayerState.queue.length).toBe(6);
    expect(newPlayerState.isPlaying).toBe(true);
  });

  it("renders distinct Disc 1 and Disc 2 headers for multi-disc albums, and hides them for single-disc albums (AC-8)", () => {
    // Single disc album
    act(() => {
      useAlbumStore.getState().setActiveAlbumId("album-1");
    });

    const { rerender } = render(<Albums />);

    expect(screen.queryByText(/disc 1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/disc 2/i)).not.toBeInTheDocument();
    expect(screen.getByText(/solitary horizon/i)).toBeInTheDocument();

    // Multi disc album (album-2 has Disc 1 and Disc 2)
    act(() => {
      useAlbumStore.getState().setActiveAlbumId("album-2");
    });

    rerender(<Albums />);

    expect(screen.getByText(/disc 1/i)).toBeInTheDocument();
    expect(screen.getByText(/disc 2/i)).toBeInTheDocument();
    expect(screen.getByText(/sunrise over kariba/i)).toBeInTheDocument();
    expect(screen.getByText(/victoria thunder/i)).toBeInTheDocument();
  });

  it("displays track number, explicit badge, featured artist, and like toggle on track rows (AC-9)", () => {
    act(() => {
      useAlbumStore.getState().setActiveAlbumId("album-1");
    });

    render(<Albums />);

    // Track 3 has an explicit badge and featured artist
    const explicitBadge = screen.getByLabelText(/explicit content/i);
    expect(explicitBadge).toBeInTheDocument();
    expect(screen.getByText(/electric monsoon \(feat\. kundai\)/i)).toBeInTheDocument();
    expect(screen.getByText(/amina v feat\. kundai/i)).toBeInTheDocument();

    // Like toggle
    const unlikeBtn = screen.getByRole("button", { name: /unlike solitary horizon/i });
    fireEvent.click(unlikeBtn);
    expect(usePlayerStore.getState().likedTrackIds["trk-101"]).toBe(false);
  });

  it("clicking heart icon on album detail banner toggles favorite album status in store (AC-10)", () => {
    act(() => {
      useAlbumStore.getState().setActiveAlbumId("album-2"); // isFavorite is initially false
    });

    render(<Albums />);

    const favBtn = screen.getByRole("button", { name: /save album to favorites/i });
    fireEvent.click(favBtn);

    expect(useAlbumStore.getState().favoriteAlbumIds).toContain("album-2");
    expect(
      screen.getByRole("button", { name: /remove album from favorites/i })
    ).toBeInTheDocument();

    // Click again to unfavorite
    fireEvent.click(screen.getByRole("button", { name: /remove album from favorites/i }));
    expect(useAlbumStore.getState().favoriteAlbumIds).not.toContain("album-2");
  });

  it("renders procedural vinyl placeholder when coverUrl is empty or fails (AC-11)", () => {
    // album-3 has coverUrl: ""
    act(() => {
      useAlbumStore.getState().setActiveAlbumId("album-3");
    });

    render(<Albums />);

    const vinylPlaceholder = screen.getByRole("img", {
      name: /vinyl cover placeholder for midnight resonance/i,
    });
    expect(vinylPlaceholder).toBeInTheDocument();
    expect(within(vinylPlaceholder).getByText("M")).toBeInTheDocument();
  });

  it("clicking an album card from Search screen deep links to Album Detail view (AC-12)", () => {
    render(<App />);

    // Go to Search
    const searchNav = screen.getByRole("link", { name: /^search$/i });
    fireEvent.click(searchNav);

    // Query for an album
    const searchInput = screen.getByRole("textbox", { name: /search music/i });
    fireEvent.change(searchInput, { target: { value: "Midnight" } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // In Search results, find and click album card
    const albumCard = screen.getAllByRole("button", { name: /album.*by/i })[0];
    expect(albumCard).toBeInTheDocument();

    fireEvent.click(albumCard);

    // Expect navigation to Albums and active album detail view displayed
    expect(screen.getByRole("button", { name: /back to all albums/i })).toBeInTheDocument();
    expect(useAlbumStore.getState().activeAlbumId).not.toBeNull();
  });
});
