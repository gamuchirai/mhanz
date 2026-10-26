import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Home } from "../../../pages/Home";
import { PlayerFooter } from "../../player/PlayerFooter";
import { usePlayerStore } from "../../../store/usePlayerStore";
import { sampleTracks, showcaseItem, curatedPlaylists } from "../../../data/homeFixtures";

describe("Home and Discovery Screen", () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      usePlayerStore.setState({
        currentTrack: showcaseItem.track ?? sampleTracks[0],
        queue: sampleTracks,
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8,
        isMuted: false,
        isShuffle: false,
        repeatMode: "off",
        likedTrackIds: { "track-1": true },
        recentPlays: [
          {
            id: "hist-1",
            trackId: sampleTracks[1].id,
            track: sampleTracks[1],
            playedAtTimestamp: Date.now(),
            contextTitle: "Midnight Sessions",
          },
        ],
        curatedCollections: curatedPlaylists,
        popularTracks: sampleTracks.slice(0, 5),
      });
    });
  });

  it("renders hero banner, curated playlist cards, recently played items, and popular tracks (AC-1)", () => {
    render(<Home />);

    // Hero headline and subtitle
    expect(screen.getByRole("heading", { level: 1, name: "Perfect" })).toBeInTheDocument();
    expect(screen.getAllByText("Aiden Vale").length).toBeGreaterThanOrEqual(1);

    // Curated grid
    expect(screen.getByText("Made for you")).toBeInTheDocument();
    expect(screen.getByText("Late Night Drive")).toBeInTheDocument();

    // Recently played
    expect(screen.getByText("Recently played")).toBeInTheDocument();

    // Popular tracks table
    expect(screen.getByText("Popular tracks")).toBeInTheDocument();
  });

  it("triggers play and updates queue when clicking quick play on curated card (AC-2)", () => {
    render(
      <div>
        <Home />
        <PlayerFooter />
      </div>
    );

    const quickPlayLateNight = screen.getByLabelText("Quick play Late Night Drive");
    fireEvent.click(quickPlayLateNight);

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.currentTrack?.title).toBe("Dusk Till Dawn");
    expect(state.queue.length).toBe(3);
  });

  it("plays track when clicking row in popular tracks table (AC-3)", () => {
    render(
      <div>
        <Home />
        <PlayerFooter />
      </div>
    );

    const betterWithYouRow = screen.getByLabelText(/Better With You by Aiden Vale/i);
    fireEvent.click(betterWithYouRow);

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.currentTrack?.title).toBe("Better With You");
  });

  it("toggles heart icon liked status in store immediately (AC-4)", () => {
    render(
      <div>
        <Home />
        <PlayerFooter />
      </div>
    );

    const likeButton = screen.getByLabelText("Like Better With You");
    expect(usePlayerStore.getState().likedTrackIds["track-3"]).toBeFalsy();

    fireEvent.click(likeButton);
    expect(usePlayerStore.getState().likedTrackIds["track-3"]).toBe(true);

    const unlikeButton = screen.getByLabelText("Unlike Better With You");
    expect(unlikeButton).toBeInTheDocument();

    fireEvent.click(unlikeButton);
    expect(usePlayerStore.getState().likedTrackIds["track-3"]).toBe(false);
  });

  it("displays gentle empty state with restore button when recent history is cleared (AC-6)", () => {
    act(() => {
      usePlayerStore.getState().clearRecentPlays();
    });

    render(<Home />);

    expect(screen.getByText("No recent listening history yet")).toBeInTheDocument();
    const loadSampleBtn = screen.getByText("Load sample tracks");
    expect(loadSampleBtn).toBeInTheDocument();

    fireEvent.click(loadSampleBtn);
    expect(usePlayerStore.getState().recentPlays.length).toBeGreaterThan(0);
  });

  it("allows seeking and play pause toggling in the player footer (AC-8)", () => {
    render(<PlayerFooter />);

    const playPauseBtn = screen.getByLabelText("Play");
    fireEvent.click(playPauseBtn);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    const progressBar = screen.getByLabelText("Track progress");
    fireEvent.keyDown(progressBar, { key: "ArrowRight" });
    expect(usePlayerStore.getState().currentTime).toBe(5);

    fireEvent.keyDown(progressBar, { key: "ArrowLeft" });
    expect(usePlayerStore.getState().currentTime).toBe(0);
  });
});
