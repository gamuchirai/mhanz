import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import {
  getMockMediaControlsState,
  mediaControlsClear,
  mediaControlsSetEnabled,
  mediaControlsSetMetadata,
  mediaControlsSetPlaybackStatus,
  setForceMediaControlsMock,
  simulateMediaControlsAction,
} from "../services/mediaControls";
import { useMediaControls } from "../hooks/useMediaControls";
import { usePlayerStore } from "../store/usePlayerStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { SystemMediaControlsToggle } from "../components/settings/SystemMediaControlsToggle";
import type { Track } from "../types/discovery";

const mockTrackA: Track = {
  id: "track-a",
  title: "Song Alpha",
  artist: "Artist Alpha",
  album: "Album Alpha",
  durationSeconds: 210,
  artworkUrl: "https://example.com/alpha.jpg",
  genre: "Afrobeats",
  playsCount: 15,
  isLiked: false,
};

const mockTrackB: Track = {
  id: "track-b",
  title: "Song Beta",
  artist: "Artist Beta",
  album: "Album Beta",
  durationSeconds: 240,
  artworkUrl: "https://example.com/beta.jpg",
  genre: "Highlife",
  playsCount: 8,
  isLiked: true,
};

describe("Operating System Media Keys and Transport Controls (Feature 26)", () => {
  beforeEach(() => {
    setForceMediaControlsMock(true);
    getMockMediaControlsState().actionListeners.clear();
    usePlayerStore.setState({
      queue: [mockTrackA, mockTrackB],
      currentIndex: 0,
      currentTrack: mockTrackA,
      isPlaying: false,
      currentTime: 0,
    });
    useSettingsStore.setState({
      settings: {
        id: "active-settings",
        outputDeviceId: "dev-default",
        volumeNormalization: true,
        crossfadeSeconds: 4,
        visualizerStyle: "bars",
        notificationsEnabled: true,
        lyricsFontSize: "medium",
        fullscreenDefaultView: "artwork",
        fullscreenAutoHideChrome: true,
        systemMediaControlsEnabled: true,
        updatedAt: Date.now(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates metadata and playback status via MediaControlsService mock (AC-3, AC-5, AC-9)", async () => {
    await mediaControlsSetMetadata({
      track_id: "track-a",
      title: "Song Alpha",
      artist: "Artist Alpha",
      album: "Album Alpha",
      duration_seconds: 210,
    });

    let state = getMockMediaControlsState();
    expect(state.metadata?.title).toBe("Song Alpha");
    expect(state.metadata?.artist).toBe("Artist Alpha");
    expect(state.metadata?.album).toBe("Album Alpha");
    expect(state.metadata?.duration_seconds).toBe(210);

    await mediaControlsSetPlaybackStatus("playing", 45);
    state = getMockMediaControlsState();
    expect(state.status).toBe("playing");
    expect(state.positionSeconds).toBe(45);

    await mediaControlsSetPlaybackStatus("paused", 60);
    state = getMockMediaControlsState();
    expect(state.status).toBe("paused");
    expect(state.positionSeconds).toBe(60);
  });

  it("clears media controls on stop or queue reset (AC-6)", async () => {
    await mediaControlsSetMetadata({
      track_id: "track-a",
      title: "Song Alpha",
      artist: "Artist Alpha",
    });

    await mediaControlsClear();
    const state = getMockMediaControlsState();
    expect(state.metadata).toBeNull();
    expect(state.status).toBe("stopped");
    expect(state.positionSeconds).toBe(0);
  });

  it("toggles enabled state in MediaControlsService (AC-12)", async () => {
    await mediaControlsSetEnabled(false);
    expect(getMockMediaControlsState().isEnabled).toBe(false);

    await mediaControlsSetEnabled(true);
    expect(getMockMediaControlsState().isEnabled).toBe(true);
  });

  it("routes incoming OS transport actions to usePlayerStore methods (AC-7, AC-8)", async () => {
    const { unmount } = renderHook(() => useMediaControls());

    // Initially paused -> simulate play
    act(() => {
      simulateMediaControlsAction({ action: "play" });
    });
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    // Now playing -> simulate pause
    act(() => {
      simulateMediaControlsAction({ action: "pause" });
    });
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    // Simulate toggle
    act(() => {
      simulateMediaControlsAction({ action: "toggle" });
    });
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    // Simulate next track
    act(() => {
      simulateMediaControlsAction({ action: "next" });
    });
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-b");

    // Simulate previous track
    act(() => {
      simulateMediaControlsAction({ action: "previous" });
    });
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-a");

    // Simulate seek
    act(() => {
      simulateMediaControlsAction({ action: "seek", position_seconds: 75 });
    });
    expect(usePlayerStore.getState().currentTime).toBe(75);

    // Simulate relative seek
    act(() => {
      simulateMediaControlsAction({ action: "seek_relative", position_seconds: 15 });
    });
    expect(usePlayerStore.getState().currentTime).toBe(90);

    // Simulate stop
    act(() => {
      simulateMediaControlsAction({ action: "stop" });
    });
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().currentTime).toBe(0);

    unmount();
  });

  it("synchronizes usePlayerStore state changes with MediaControlsService (AC-3, AC-5, AC-6)", async () => {
    // Changing track updates metadata in media controls mock
    act(() => {
      usePlayerStore.setState({
        currentTrack: mockTrackB,
        isPlaying: true,
        currentTime: 0,
      });
    });

    const state = getMockMediaControlsState();
    expect(state.metadata?.track_id).toBe("track-b");
    expect(state.metadata?.title).toBe("Song Beta");
    expect(state.metadata?.artist).toBe("Artist Beta");
    expect(state.status).toBe("playing");

    // Pausing updates playback status to paused
    act(() => {
      usePlayerStore.setState({
        isPlaying: false,
        currentTime: 42,
      });
    });
    expect(getMockMediaControlsState().status).toBe("paused");
    expect(getMockMediaControlsState().positionSeconds).toBe(42);

    // Seeking updates playback status position
    act(() => {
      usePlayerStore.getState().seekTo(105);
    });
    expect(getMockMediaControlsState().positionSeconds).toBe(105);

    // Clearing current track clears media controls
    act(() => {
      usePlayerStore.setState({
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
      });
    });
    expect(getMockMediaControlsState().metadata).toBeNull();
    expect(getMockMediaControlsState().status).toBe("stopped");
  });

  it("renders System Media Controls toggle switch and responds to user interaction (AC-10, AC-11, AC-12)", () => {
    render(<SystemMediaControlsToggle />);

    const toggle = screen.getByRole("switch", { name: /toggle system media controls/i });
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(toggle);

    expect(useSettingsStore.getState().settings.systemMediaControlsEnabled).toBe(false);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(getMockMediaControlsState().isEnabled).toBe(false);

    fireEvent.click(toggle);

    expect(useSettingsStore.getState().settings.systemMediaControlsEnabled).toBe(true);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(getMockMediaControlsState().isEnabled).toBe(true);
  });

  it("throttles rapid consecutive toggle actions within 150ms bounce window (AC-7, AC-8)", async () => {
    const { unmount } = renderHook(() => useMediaControls());
    await Promise.resolve();

    // First toggle switches isPlaying from false to true
    act(() => {
      simulateMediaControlsAction({ action: "toggle" });
    });
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    // Rapid second toggle within 150ms should be suppressed by the throttle guard
    act(() => {
      simulateMediaControlsAction({ action: "toggle" });
    });
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    unmount();
  });

  it("clamps negative relative seek to zero seconds without underflow (AC-7, AC-8)", async () => {
    const { unmount } = renderHook(() => useMediaControls());
    await Promise.resolve();

    act(() => {
      usePlayerStore.setState({ currentTime: 5 });
    });

    // Seeking relative by -20s from 5s should clamp cleanly to 0s
    act(() => {
      simulateMediaControlsAction({ action: "seek_relative", position_seconds: -20 });
    });
    expect(usePlayerStore.getState().currentTime).toBe(0);

    unmount();
  });

  it("handles unknown action names and empty queue actions gracefully (AC-7, AC-8)", async () => {
    const { unmount } = renderHook(() => useMediaControls());
    await Promise.resolve();

    act(() => {
      usePlayerStore.setState({
        queue: [],
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
      });
    });

    expect(() => {
      act(() => {
        simulateMediaControlsAction({ action: "unknown_hardware_signal" });
        simulateMediaControlsAction({ action: "next" });
        simulateMediaControlsAction({ action: "previous" });
        simulateMediaControlsAction({ action: "seek" });
      });
    }).not.toThrow();

    unmount();
  });

  it("unregisters action listener on unmount and prevents lingering action dispatch (AC-8)", async () => {
    const { unmount } = renderHook(() => useMediaControls());
    await Promise.resolve();

    unmount();

    act(() => {
      usePlayerStore.setState({ isPlaying: false });
      simulateMediaControlsAction({ action: "play" });
    });

    // Since hook unmounted and unlisten ran, player store remains paused
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("catches errors in faulty action listeners without crashing other handlers (AC-8, AC-9)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const faultyListener = vi.fn().mockImplementation(() => {
      throw new Error("Simulated listener crash");
    });
    const healthyListener = vi.fn();

    const mock = getMockMediaControlsState();
    mock.actionListeners.add(faultyListener);
    mock.actionListeners.add(healthyListener);

    expect(() => {
      simulateMediaControlsAction({ action: "play" });
    }).not.toThrow();

    expect(faultyListener).toHaveBeenCalled();
    expect(healthyListener).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    mock.actionListeners.delete(faultyListener);
    mock.actionListeners.delete(healthyListener);
    consoleSpy.mockRestore();
  });

  it("verifies accessible attributes and semantic markup on SystemMediaControlsToggle (AC-10, AC-11)", () => {
    render(<SystemMediaControlsToggle />);

    const toggle = screen.getByRole("switch", { name: /toggle system media controls/i });
    expect(toggle.tagName.toLowerCase()).toBe("button");
    expect(toggle).toHaveAttribute("role", "switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveAccessibleName("Toggle system media controls");

    expect(screen.getByText("System Media Controls")).toBeInTheDocument();
    expect(
      screen.getByText("Enables keyboard media keys and Windows volume flyout playback controls")
    ).toBeInTheDocument();
  });
});