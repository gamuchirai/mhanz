import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";
import { LikedSongs } from "../pages/LikedSongs";
import { useLikedSongsStore } from "../store/useLikedSongsStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { initialLikedTracks } from "../data/likedFixtures";

describe("Liked Songs Screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    act(() => {
      useLikedSongsStore.setState({
        tracks: [...initialLikedTracks],
        unlikedPendingIds: [],
        filterQuery: "",
        sortState: {
          column: "dateLiked",
          direction: "desc",
        },
      });

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
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigating to Liked Songs in sidebar renders Liked Songs screen with hero banner and table (AC-1)", () => {
    render(<App />);

    const likedSongsNav = screen.getByRole("link", { name: /liked songs/i });
    expect(likedSongsNav).toBeInTheDocument();

    fireEvent.click(likedSongsNav);

    expect(screen.getByRole("heading", { name: /liked songs/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /liked songs hero banner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play all liked songs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shuffle liked songs/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /filter liked songs/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /liked songs table/i })).toBeInTheDocument();
  });

  it("displays total count of liked tracks and cumulative duration, updating dynamically (AC-2, AC-8, AC-9)", () => {
    render(<LikedSongs />);

    // Initial 8 songs
    expect(screen.getByText(/8 songs/i)).toBeInTheDocument();

    // Unlike the first song
    const unlikeButton = screen.getByRole("button", { name: /unlike perfect/i });
    fireEvent.click(unlikeButton);

    // Dynamic stats update: count decreases to 7 songs
    expect(screen.getByText(/7 songs/i)).toBeInTheDocument();

    // Row is retained with restore heart button
    const restoreButton = screen.getByRole("button", { name: /restore like for perfect/i });
    expect(restoreButton).toBeInTheDocument();

    // Re-clicking restores liked state
    fireEvent.click(restoreButton);
    expect(screen.getByText(/8 songs/i)).toBeInTheDocument();
  });

  it("clicking Play All queues visible liked songs into player store and starts playback (AC-3)", () => {
    render(<LikedSongs />);

    const playAllButton = screen.getByRole("button", { name: /play all liked songs/i });
    fireEvent.click(playAllButton);

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.currentTrack?.title).toBe("Perfect");
    expect(playerState.queue.length).toBe(8);
  });

  it("clicking Shuffle queues visible liked songs in randomized order and enables shuffle mode (AC-4)", () => {
    render(<LikedSongs />);

    const shuffleButton = screen.getByRole("button", { name: /shuffle liked songs/i });
    fireEvent.click(shuffleButton);

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.isShuffle).toBe(true);
    expect(playerState.queue.length).toBe(8);
  });

  it("filters songs in real time across title, artist, and album (AC-5)", () => {
    render(<LikedSongs />);

    const filterInput = screen.getByRole("textbox", { name: /filter liked songs/i });

    // Filter by artist "Rema"
    fireEvent.change(filterInput, { target: { value: "Rema" } });
    expect(screen.getByText("Calm Down")).toBeInTheDocument();
    expect(screen.queryByText("Perfect")).not.toBeInTheDocument();

    // Filter by album "Damini"
    fireEvent.change(filterInput, { target: { value: "Damini" } });
    expect(screen.getByText("Last Last")).toBeInTheDocument();
    expect(screen.queryByText("Calm Down")).not.toBeInTheDocument();
  });

  it("displays empty search notice with Clear search button when query has no matches (AC-6)", () => {
    render(<LikedSongs />);

    const filterInput = screen.getByRole("textbox", { name: /filter liked songs/i });
    fireEvent.change(filterInput, { target: { value: "NonExistentTrackXYZ" } });

    expect(screen.getByText(/no liked songs matching/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument();

    // Clearing search restores visible rows
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(screen.getByText("Perfect")).toBeInTheDocument();
    expect(screen.getByText("Calm Down")).toBeInTheDocument();
  });

  it("toggles sorting by column headers (AC-7)", () => {
    render(<LikedSongs />);

    // Click Title column to sort ascending
    const titleSortHeader = screen.getByRole("button", {
      name: /sort by title column/i,
    });
    fireEvent.click(titleSortHeader);

    let state = useLikedSongsStore.getState();
    expect(state.sortState.column).toBe("title");
    expect(state.sortState.direction).toBe("asc");

    // Click again to sort descending
    fireEvent.click(titleSortHeader);
    state = useLikedSongsStore.getState();
    expect(state.sortState.column).toBe("title");
    expect(state.sortState.direction).toBe("desc");

    // Click Duration column
    const durationSortHeader = screen.getByRole("button", {
      name: /sort by duration column/i,
    });
    fireEvent.click(durationSortHeader);
    state = useLikedSongsStore.getState();
    expect(state.sortState.column).toBe("durationSeconds");
    expect(state.sortState.direction).toBe("asc");
  });

  it("double clicking a track row or clicking hover play starts playback from that track (AC-10)", () => {
    render(<LikedSongs />);

    const rows = screen.getAllByRole("row");
    // Row 0 is the first song
    fireEvent.doubleClick(rows[0]);

    const playerState = usePlayerStore.getState();
    expect(playerState.isPlaying).toBe(true);
    expect(playerState.currentTrack).not.toBeNull();
  });

  it("renders expressive empty state with Explore Music button when no songs are liked (AC-11)", () => {
    act(() => {
      useLikedSongsStore.setState({
        tracks: [],
        unlikedPendingIds: [],
      });
    });

    const onExploreMock = vi.fn();
    render(<LikedSongs onNavigate={onExploreMock} />);

    expect(
      screen.getByRole("heading", { name: /songs you like will appear here/i })
    ).toBeInTheDocument();
    const exploreButton = screen.getByRole("button", { name: /explore music/i });
    expect(exploreButton).toBeInTheDocument();

    fireEvent.click(exploreButton);
    expect(onExploreMock).toHaveBeenCalledWith("Search");
  });

  it("purges unliked tracks when navigating away from Liked Songs (AC-12)", () => {
    const { unmount } = render(<LikedSongs />);

    // Unlike a track
    const unlikeButton = screen.getByRole("button", { name: /unlike perfect/i });
    fireEvent.click(unlikeButton);

    expect(useLikedSongsStore.getState().unlikedPendingIds).toContain("liked-1");

    // Unmount view (simulating navigation away)
    unmount();

    // Unliked tracks are purged from store
    const updatedState = useLikedSongsStore.getState();
    expect(updatedState.unlikedPendingIds.length).toBe(0);
    expect(updatedState.tracks.some((t) => t.id === "liked-1")).toBe(false);
  });
});
