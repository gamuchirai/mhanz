import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import * as tauriCore from "@tauri-apps/api/core";
import {
  usePlayerStore,
  initPlayerAudioSync,
  cleanupPlayerAudioSync,
} from "../store/usePlayerStore";
import { PlayerFooter } from "../components/player/PlayerFooter";
import * as audioService from "../services/audio";
import type { Track } from "../types/discovery";

const { eventListeners } = vi.hoisted(() => ({
  eventListeners: {} as Record<string, (event: { payload: unknown }) => void>,
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  invoke: vi.fn(),
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (eventName: string, cb: (event: { payload: unknown }) => void) => {
    eventListeners[eventName] = cb;
    return () => {
      delete eventListeners[eventName];
    };
  }),
}));

describe("Native Desktop Player Playback Reliability (Finding P4-F4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    audioService.setAudioMockMode(false);
    initPlayerAudioSync();

    act(() => {
      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        queueItems: [],
        currentIndex: -1,
        isPlaying: false,
        currentTime: 0,
        volume: 0.8,
        isMuted: false,
        playbackContext: null,
      });
    });
  });

  afterEach(() => {
    cleanupPlayerAudioSync();
  });

  it("pressing Play on the initial desktop player does not set isPlaying when no track is selected", () => {
    render(<PlayerFooter />);

    expect(screen.getByText("No track selected")).toBeInTheDocument();
    expect(screen.getByText("Mutinhimira")).toBeInTheDocument();

    const playBtn = screen.getByRole("button", { name: "Play" });
    fireEvent.click(playBtn);

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("does not start native playback or set isPlaying to true when playing a demo path without a file", () => {
    const demoTrack: Track = {
      id: "demo-track-1",
      title: "Demo Melody",
      artist: "Demo Artist",
      album: "Demo Album",
      durationSeconds: 180,
      artworkUrl: "/demo.png",
      playsCount: 0,
      isLiked: false,
      filePath: "mock://demo-track-1.mp3",
    };

    act(() => {
      usePlayerStore.getState().playTrack(demoTrack);
    });

    const state = usePlayerStore.getState();
    expect(state.currentTrack?.id).toBe("demo-track-1");
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  it("does not set isPlaying to true when togglePlayPause is called on a track with no valid filePath in native mode", () => {
    const demoTrack: Track = {
      id: "demo-track-2",
      title: "Another Demo",
      artist: "Demo Artist",
      album: "Demo Album",
      durationSeconds: 120,
      artworkUrl: "/demo.png",
      playsCount: 0,
      isLiked: false,
    };

    act(() => {
      usePlayerStore.setState({
        currentTrack: demoTrack,
        isPlaying: false,
      });
    });

    act(() => {
      usePlayerStore.getState().togglePlayPause();
    });

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
  });

  it("resets isPlaying to false when audioPlayTrack rejects due to a missing local file", async () => {
    vi.spyOn(audioService, "audioPlayTrack").mockRejectedValueOnce(
      new Error("Audio file not found: C:/music/missing.mp3")
    );

    const realTrack: Track = {
      id: "trk-real-1",
      title: "Real Song",
      artist: "Real Artist",
      album: "Real Album",
      durationSeconds: 200,
      artworkUrl: "/real.png",
      playsCount: 0,
      isLiked: false,
      filePath: "C:/music/missing.mp3",
    };

    await act(async () => {
      usePlayerStore.getState().playTrack(realTrack);
    });

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
  });

  it("resets isPlaying to false when native audio engine emits an audio:error event", async () => {
    act(() => {
      usePlayerStore.setState({
        isPlaying: true,
      });
    });

    expect(usePlayerStore.getState().isPlaying).toBe(true);

    const errorHandler = eventListeners["audio:error"];
    expect(errorHandler).toBeDefined();

    act(() => {
      errorHandler({
        payload: {
          code: "FILE_NOT_FOUND",
          message: "Audio file not found on disk",
          track_id: "trk-real-1",
        },
      });
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});