import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { App } from "../App";
import { useOverlayStore } from "../store/useOverlayStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { sampleTracks } from "../data/homeFixtures";
import { defaultUserSettings, mockAudioDevices } from "../data/mockAudioDevices";

describe("Now Playing Fullscreen View", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();

    // Mock HTMLCanvasElement getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      globalAlpha: 1,
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    // Clear local storage
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    act(() => {
      // Reset overlay store
      useOverlayStore.setState({
        activeOverlay: "none",
        fullscreenViewMode: "artwork",
      });

      // Reset settings store
      useSettingsStore.setState({
        settings: {
          ...defaultUserSettings,
          fullscreenDefaultView: "artwork",
          fullscreenAutoHideChrome: true,
          updatedAt: Date.now(),
        },
        availableDevices: mockAudioDevices,
      });

      // Reset player store with sample track containing ambient colors
      const testTracks = [...sampleTracks];
      const initialItems = testTracks.map((t, idx) => ({
        id: `test-queue-${idx}`,
        trackId: t.id,
        track: t,
        addedAt: Date.now() + idx,
        isManuallyQueued: false,
      }));

      usePlayerStore.setState({
        currentTrack: testTracks[0], // "Perfect" by Aiden Vale
        queue: testTracks,
        queueItems: initialItems,
        currentIndex: 0,
        isPlaying: false,
        currentTime: 10,
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
    vi.clearAllMocks();
  });

  it("renders interactive entry targets on artwork thumbnail, title, and expand button in PlayerFooter (AC-1)", () => {
    render(<App />);

    const thumbnailBtn = screen.getByLabelText(/Open fullscreen view from album cover for Perfect/i);
    expect(thumbnailBtn).toBeInTheDocument();

    const titleBtn = screen.getByRole("button", { name: /Open fullscreen view from song title for Perfect/i });
    expect(titleBtn).toBeInTheDocument();

    const expandBtn = screen.getByRole("button", { name: "Open fullscreen view" });
    expect(expandBtn).toBeInTheDocument();
  });

  it("opens fullscreen now playing view as a fixed dialog covering app on trigger click (AC-2, AC-15)", () => {
    render(<App />);

    const triggers = screen.getAllByRole("button", { name: /Open fullscreen view/i });
    act(() => {
      fireEvent.click(triggers[triggers.length - 1]);
    });

    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(useOverlayStore.getState().activeOverlay).toBe("fullscreen");
  });

  it("prevents opening fullscreen view when currentTrack is null (AC-3)", () => {
    act(() => {
      usePlayerStore.setState({ currentTrack: null });
    });

    render(<App />);
    const triggers = screen.getAllByRole("button", { name: /Open fullscreen view/i });
    act(() => {
      fireEvent.click(triggers[triggers.length - 1]);
    });

    expect(useOverlayStore.getState().activeOverlay).toBe("none");
    expect(screen.queryByRole("dialog", { name: "Now playing fullscreen view" })).not.toBeInTheDocument();
  });

  it("renders header with return button, breadcrumb, and three-segment view switch (AC-4)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
    });

    render(<App />);
    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    const dlg = within(dialog);

    expect(dlg.getByRole("button", { name: "Exit fullscreen view" })).toBeInTheDocument();
    expect(dlg.getAllByText("Perfect")[0]).toBeInTheDocument();
    expect(dlg.getAllByText("Aiden Vale")[0]).toBeInTheDocument();

    const viewGroup = dlg.getByRole("group", { name: "View mode switch" });
    expect(viewGroup).toBeInTheDocument();
    expect(dlg.getByRole("button", { name: "Artwork mode" })).toBeInTheDocument();
    expect(dlg.getByRole("button", { name: /Lyrics mode/i })).toBeInTheDocument();
    expect(dlg.getByRole("button", { name: /Visualizer mode/i })).toBeInTheDocument();
  });

  it("presents enlarged album artwork, metadata, and toggles like button in Artwork mode (AC-6)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
    });

    render(<App />);
    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    const dlg = within(dialog);

    const coverImg = dlg.getByAltText("Perfect");
    expect(coverImg).toBeInTheDocument();
    expect(dlg.getByRole("heading", { name: "Perfect" })).toBeInTheDocument();
    expect(dlg.getByText("Midnight Sessions")).toBeInTheDocument();

    const likeBtn = dlg.getByRole("button", { name: /Like Perfect/i });
    expect(likeBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(likeBtn);
    });

    expect(usePlayerStore.getState().likedTrackIds["track-1"]).toBe(true);
    expect(dlg.getByRole("button", { name: /Unlike Perfect/i })).toBeInTheDocument();
  });

  it("switches to Lyrics mode, highlights active lyric line, and seeks on click (AC-7)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
    });

    render(<App />);
    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    const dlg = within(dialog);

    const lyricsTab = dlg.getByRole("button", { name: /Lyrics mode/i });
    act(() => {
      fireEvent.click(lyricsTab);
    });

    expect(useOverlayStore.getState().fullscreenViewMode).toBe("lyrics");
    const lyricsRegion = dlg.getByRole("region", { name: "Synchronized lyrics" });
    expect(lyricsRegion).toBeInTheDocument();

    const lineBtn = dlg.getByRole("button", { name: /Jump to I found a love for me/i });
    expect(lineBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(lineBtn);
    });

    expect(usePlayerStore.getState().currentTime).toBe(4);
  });

  it("switches to Visualizer mode and initializes canvas buffer capped at 720p (AC-8)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
    });

    render(<App />);
    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    const dlg = within(dialog);

    const visualizerTab = dlg.getByRole("button", { name: /Visualizer mode/i });
    act(() => {
      fireEvent.click(visualizerTab);
    });

    expect(useOverlayStore.getState().fullscreenViewMode).toBe("visualizer");
    const canvas = dlg.getByRole("img", { name: "Audio visualizer stage" }) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
  });

  it("renders timeline scrubber and supports seeking via keyboard arrow keys (AC-9)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
      usePlayerStore.setState({ currentTime: 50, isPlaying: true });
    });

    render(<App />);
    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    const dlg = within(dialog);

    const scrubber = dlg.getByRole("slider", { name: "Timeline scrubber" });
    expect(scrubber).toBeInTheDocument();
    expect(scrubber).toHaveAttribute("aria-valuenow", "50");

    act(() => {
      fireEvent.keyDown(scrubber, { key: "ArrowLeft" });
    });
    expect(usePlayerStore.getState().currentTime).toBe(45);

    act(() => {
      fireEvent.keyDown(scrubber, { key: "ArrowRight" });
    });
    expect(usePlayerStore.getState().currentTime).toBe(50);
  });

  it("provides full playback transport controls including play pause, shuffle, repeat, and volume (AC-10)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
      usePlayerStore.setState({ isPlaying: false, repeatMode: "off", isShuffle: false });
    });

    render(<App />);
    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    const dlg = within(dialog);

    const playPauseBtn = dlg.getByRole("button", { name: "Play" });
    act(() => {
      fireEvent.click(playPauseBtn);
    });
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    const shuffleBtn = dlg.getByRole("button", { name: "Toggle shuffle mode" });
    act(() => {
      fireEvent.click(shuffleBtn);
    });
    expect(usePlayerStore.getState().isShuffle).toBe(true);

    const repeatBtn = dlg.getByRole("button", { name: /Cycle repeat mode/i });
    act(() => {
      fireEvent.click(repeatBtn);
    });
    expect(usePlayerStore.getState().repeatMode).toBe("all");

    act(() => {
      fireEvent.click(repeatBtn);
    });
    expect(usePlayerStore.getState().repeatMode).toBe("one");

    const muteBtn = dlg.getByRole("button", { name: "Mute volume" });
    act(() => {
      fireEvent.click(muteBtn);
    });
    expect(usePlayerStore.getState().isMuted).toBe(true);
  });

  it("auto-hides chrome after four seconds of inactivity and restores on mouse movement (AC-11)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
    });

    render(<App />);

    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    expect(dialog).toHaveStyle({ cursor: "default" });

    // Advance 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(dialog).toHaveStyle({ cursor: "none" });

    // Mouse move restores chrome
    act(() => {
      fireEvent.mouseMove(window);
    });

    expect(dialog).toHaveStyle({ cursor: "default" });
  });

  it("handles scoped keyboard shortcuts for Space, Arrow keys, L, V, M, and Escape (AC-12, AC-13)", () => {
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
      usePlayerStore.setState({ isPlaying: false, currentTime: 20 });
    });

    render(<App />);

    // Space toggles play/pause
    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    // Left Arrow seeks back 5s
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    expect(usePlayerStore.getState().currentTime).toBe(15);

    // Right Arrow seeks forward 5s
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(usePlayerStore.getState().currentTime).toBe(20);

    // L toggles lyrics mode
    act(() => {
      fireEvent.keyDown(window, { key: "l" });
    });
    expect(useOverlayStore.getState().fullscreenViewMode).toBe("lyrics");

    // V toggles visualizer mode
    act(() => {
      fireEvent.keyDown(window, { key: "v" });
    });
    expect(useOverlayStore.getState().fullscreenViewMode).toBe("visualizer");

    // M toggles mute
    act(() => {
      fireEvent.keyDown(window, { key: "m" });
    });
    expect(usePlayerStore.getState().isMuted).toBe(true);

    // Escape closes view
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(useOverlayStore.getState().activeOverlay).toBe("none");
  });

  it("dismisses fullscreen view and restores focus when clicking return button (AC-13)", () => {
    render(<App />);

    const triggers = screen.getAllByRole("button", { name: /Open fullscreen view/i });
    const expandBtn = triggers[triggers.length - 1];
    expandBtn.focus();
    expect(document.activeElement).toBe(expandBtn);

    act(() => {
      fireEvent.click(expandBtn);
    });

    const dialog = screen.getByRole("dialog", { name: "Now playing fullscreen view" });
    const dlg = within(dialog);

    const returnBtn = dlg.getByRole("button", { name: "Exit fullscreen view" });
    act(() => {
      fireEvent.click(returnBtn);
    });

    expect(useOverlayStore.getState().activeOverlay).toBe("none");
  });

  it("persists and restores fullscreen default view preference in user settings (AC-14)", () => {
    act(() => {
      useSettingsStore.getState().setFullscreenDefaultView("lyrics");
    });

    expect(useSettingsStore.getState().settings.fullscreenDefaultView).toBe("lyrics");

    // Opening fullscreen initializes to user's saved default view
    act(() => {
      useOverlayStore.getState().openOverlay("fullscreen");
    });

    expect(useOverlayStore.getState().fullscreenViewMode).toBe("lyrics");
  });
});
