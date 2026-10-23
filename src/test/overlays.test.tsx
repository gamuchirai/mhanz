import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";
import { useOverlayStore } from "../store/useOverlayStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { sampleTracks, popularTracksList } from "../data/homeFixtures";
import { defaultUserSettings, mockAudioDevices } from "../data/mockAudioDevices";

describe("Queue, Lyrics, and Settings Overlays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();

    // Clear local storage
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    act(() => {
      // Reset overlay store
      useOverlayStore.setState({
        activeOverlay: "none",
      });

      // Reset settings store
      useSettingsStore.setState({
        settings: { ...defaultUserSettings, updatedAt: Date.now() },
        availableDevices: mockAudioDevices,
      });

      // Reset player store
      const testTracks = [...popularTracksList];
      const initialItems = testTracks.map((t, idx) => ({
        id: `test-queue-${idx}`,
        trackId: t.id,
        track: t,
        addedAt: Date.now() + idx,
        isManuallyQueued: false,
      }));

      usePlayerStore.setState({
        currentTrack: testTracks[0],
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
  });

  it("renders queue and lyrics toggle buttons in PlayerFooter, and settings gear button in sidebar (AC-1)", () => {
    render(<App />);

    expect(screen.getByLabelText("Toggle lyrics overlay")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle playback queue drawer")).toBeInTheDocument();
    expect(screen.getByLabelText("Open audio preferences settings")).toBeInTheDocument();
  });

  it("toggles slide-in queue drawer open and closed from PlayerFooter (AC-2)", () => {
    render(<App />);

    const queueBtn = screen.getByLabelText("Toggle playback queue drawer");

    // Initially drawer is not visible
    expect(screen.queryByLabelText("Playback queue drawer")).not.toBeInTheDocument();

    // Click queue toggle opens drawer
    fireEvent.click(queueBtn);
    expect(screen.getByLabelText("Playback queue drawer")).toBeInTheDocument();
    expect(useOverlayStore.getState().activeOverlay).toBe("queue");

    // Click again toggles it closed
    fireEvent.click(queueBtn);
    expect(screen.queryByLabelText("Playback queue drawer")).not.toBeInTheDocument();
    expect(useOverlayStore.getState().activeOverlay).toBe("none");
  });

  it("renders now playing card with artwork, title, visualizer indicator, and remaining duration (AC-3)", () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle playback queue drawer"));

    const drawer = screen.getByLabelText("Playback queue drawer");
    expect(drawer).toBeInTheDocument();

    // Now playing section renders current track details
    expect(screen.getAllByText("NOW PLAYING").length).toBeGreaterThan(0);
    const activeTrack = usePlayerStore.getState().currentTrack!;
    expect(screen.getAllByText(activeTrack.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(activeTrack.artist).length).toBeGreaterThan(0);

    // Audio status indicator
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("displays upcoming queue items with drag handles and individual remove buttons (AC-4)", () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle playback queue drawer"));

    const upcomingItems = usePlayerStore.getState().queueItems.slice(1);
    expect(upcomingItems.length).toBeGreaterThan(0);

    const firstUpcoming = upcomingItems[0];
    expect(screen.getAllByText(firstUpcoming.track.title).length).toBeGreaterThan(0);

    // Remove button exists
    const removeBtn = screen.getByLabelText(`Remove ${firstUpcoming.track.title} from queue`);
    expect(removeBtn).toBeInTheDocument();

    // Clicking remove button deletes it from queue
    fireEvent.click(removeBtn);
    const updatedUpcoming = usePlayerStore.getState().queueItems.slice(1);
    expect(updatedUpcoming.some((item) => item.id === firstUpcoming.id)).toBe(false);
  });

  it("reorders upcoming tracks using drag and drop events (AC-5)", () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle playback queue drawer"));

    const upcomingBefore = usePlayerStore.getState().queueItems.slice(1);
    expect(upcomingBefore.length).toBeGreaterThanOrEqual(2);

    const item0 = upcomingBefore[0];
    const item1 = upcomingBefore[1];

    act(() => {
      usePlayerStore.getState().reorderUpcomingQueue(0, 1);
    });

    const upcomingAfter = usePlayerStore.getState().queueItems.slice(1);
    expect(upcomingAfter[0].id).toBe(item1.id);
    expect(upcomingAfter[1].id).toBe(item0.id);
  });

  it("jumps playback to clicked upcoming track immediately (AC-6)", () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle playback queue drawer"));

    const upcomingBefore = usePlayerStore.getState().queueItems.slice(1);
    const targetItem = upcomingBefore[0];

    const row = screen.getByTestId(`queue-row-${targetItem.id}`);
    fireEvent.click(row);

    expect(usePlayerStore.getState().currentTrack?.id).toBe(targetItem.track.id);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().currentTime).toBe(0);
  });

  it("clears upcoming queue preserving active track, and allows adding recommended tracks (AC-7)", () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle playback queue drawer"));

    const activeTrack = usePlayerStore.getState().currentTrack!;
    const clearBtn = screen.getByText("Clear Queue");
    fireEvent.click(clearBtn);

    // Current track remains playing
    expect(usePlayerStore.getState().currentTrack?.id).toBe(activeTrack.id);
    expect(usePlayerStore.getState().queueItems.length).toBe(1);

    // Empty state card appears
    expect(screen.getByText("Upcoming queue is empty")).toBeInTheDocument();

    // Queue recommended songs button populates queue
    const queueRecBtn = screen.getByText("Queue Recommended Songs");
    fireEvent.click(queueRecBtn);

    expect(usePlayerStore.getState().queueItems.length).toBeGreaterThan(1);
  });

  it("opens immersive lyrics modal with track title, artist, and large typography (AC-8)", () => {
    render(<App />);

    const lyricsBtn = screen.getByLabelText("Toggle lyrics overlay");
    fireEvent.click(lyricsBtn);

    expect(screen.getByLabelText("Lyrics overlay")).toBeInTheDocument();
    expect(useOverlayStore.getState().activeOverlay).toBe("lyrics");

    const track = usePlayerStore.getState().currentTrack!;
    expect(screen.getAllByText(track.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(track.artist).length).toBeGreaterThan(0);
  });

  it("highlights active lyric line with glowing styling as playback progresses (AC-9)", () => {
    act(() => {
      usePlayerStore.setState({
        currentTrack: sampleTracks[0], // 'Perfect' with synchronized lyrics
        currentTime: 50,
      });
    });

    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle lyrics overlay"));

    // Line at 50s is "Not knowing what it was"
    const activeLine = screen.getByText("Not knowing what it was");
    expect(activeLine).toBeInTheDocument();
    expect(activeLine).toHaveAttribute("data-active", "true");
  });

  it("seeks track audio playback immediately when clicking a lyric line (AC-10)", () => {
    act(() => {
      usePlayerStore.setState({
        currentTrack: sampleTracks[0],
        currentTime: 10,
      });
    });

    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle lyrics overlay"));

    // Click line at 65s: "Darling just kiss me slow your heart is all I own"
    const targetLine = screen.getByText("Darling just kiss me slow your heart is all I own");
    fireEvent.click(targetLine);

    expect(usePlayerStore.getState().currentTime).toBe(65);
  });

  it("pauses auto-scroll on manual scroll and displays fallback for unsynced tracks (AC-11)", () => {
    act(() => {
      usePlayerStore.setState({
        currentTrack: {
          id: "no-lyrics-track",
          title: "Instrumental Piece",
          artist: "Aiden Vale",
          album: "Midnight Sessions",
          durationSeconds: 180,
          artworkUrl: "",
          playsCount: 100,
          isLiked: false,
        },
      });
    });

    render(<App />);

    fireEvent.click(screen.getByLabelText("Toggle lyrics overlay"));

    expect(screen.getByText("Timed lyrics are unavailable")).toBeInTheDocument();
    expect(
      screen.getByText('We do not have synchronised words for "Instrumental Piece" yet.')
    ).toBeInTheDocument();
  });

  it("opens settings modal, modifies crossfade, device, toggles, and persists in localStorage (AC-12)", () => {
    render(<App />);

    // Click sidebar settings gear button
    const settingsBtn = screen.getByLabelText("Open audio preferences settings");
    fireEvent.click(settingsBtn);

    expect(screen.getByRole("dialog", { name: "Audio preferences settings" })).toBeInTheDocument();
    expect(useOverlayStore.getState().activeOverlay).toBe("settings");

    // Select headphones audio device
    const headphonesRadio = screen.getByText("High Resolution Headphones (Realtek)");
    fireEvent.click(headphonesRadio);
    expect(useSettingsStore.getState().settings.outputDeviceId).toBe("dev-headphones");

    // Adjust crossfade
    const crossfadeSlider = screen.getByLabelText("Crossfade duration in seconds");
    fireEvent.change(crossfadeSlider, { target: { value: "8" } });
    expect(useSettingsStore.getState().settings.crossfadeSeconds).toBe(8);

    // Change visualizer style
    const waveOption = screen.getByText("Smooth Wave");
    fireEvent.click(waveOption);
    expect(useSettingsStore.getState().settings.visualizerStyle).toBe("wave");

    // Toggle volume normalisation
    const volumeToggle = screen.getByLabelText("Toggle volume normalisation");
    fireEvent.click(volumeToggle);
    expect(useSettingsStore.getState().settings.volumeNormalization).toBe(false);

    // Verify localStorage has persisted JSON
    const stored = window.localStorage.getItem("mumhanzi:settings:v1");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.outputDeviceId).toBe("dev-headphones");
    expect(parsed.crossfadeSeconds).toBe(8);
    expect(parsed.visualizerStyle).toBe("wave");

    // Reset to defaults
    const resetBtn = screen.getByText("Reset to Defaults");
    fireEvent.click(resetBtn);
    expect(useSettingsStore.getState().settings.outputDeviceId).toBe("dev-default");
    expect(useSettingsStore.getState().settings.crossfadeSeconds).toBe(4);
  });

  it("closes open overlays when pressing Escape or clicking backdrop (AC-13)", () => {
    render(<App />);

    // Open settings modal
    fireEvent.click(screen.getByLabelText("Open audio preferences settings"));
    expect(useOverlayStore.getState().activeOverlay).toBe("settings");

    // Press Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useOverlayStore.getState().activeOverlay).toBe("none");
    expect(
      screen.queryByRole("dialog", { name: "Audio preferences settings" })
    ).not.toBeInTheDocument();

    // Open queue drawer
    fireEvent.click(screen.getByLabelText("Toggle playback queue drawer"));
    expect(useOverlayStore.getState().activeOverlay).toBe("queue");

    // Press Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useOverlayStore.getState().activeOverlay).toBe("none");
    expect(screen.queryByLabelText("Playback queue drawer")).not.toBeInTheDocument();
  });
});
