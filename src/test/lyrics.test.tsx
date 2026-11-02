import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as tauriCore from "@tauri-apps/api/core";

import { usePlayerStore } from "../store/usePlayerStore";
import { useOverlayStore } from "../store/useOverlayStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useLyricsStore } from "../store/useLyricsStore";
import { LyricsModal } from "../components/lyrics/LyricsModal";
import { FullscreenLyricsView } from "../components/fullscreen/FullscreenLyricsView";
import { lyricsGetForTrack } from "../services/lyrics";
import { defaultUserSettings } from "../data/mockAudioDevices";
import type { Track } from "../types/discovery";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false),
  convertFileSrc: (path: string) => `asset://${path}`,
}));

describe("Lyrics Service, Store, and Overlay Integration", () => {
  const sampleTrack: Track = {
    id: "track-1",
    filePath: "/music/perfect.mp3",
    title: "Perfect",
    artist: "Ed Sheeran",
    album: "Divide",
    durationSeconds: 263,
    artworkUrl: "cover.jpg",
    playsCount: 10,
    isLiked: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();

    act(() => {
      useLyricsStore.setState({
        currentLyrics: null,
        isLoading: false,
        error: null,
        lyricsCache: {},
      });

      usePlayerStore.setState({
        currentTrack: sampleTrack,
        currentTime: 5,
        isPlaying: true,
        seekToLyricLine: vi.fn(),
      });

      useOverlayStore.setState({
        activeOverlay: "lyrics",
      });

      useSettingsStore.setState({
        settings: {
          ...defaultUserSettings,
          lyricsFontSize: "medium",
          updatedAt: Date.now(),
        },
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("retrieves lyrics via service and falls back gracefully when not in Tauri environment (AC-1, AC-10)", async () => {
    const result = await lyricsGetForTrack("track-1");
    expect(result.trackId).toBe("track-1");
    expect(result.hasLyrics).toBe(true);
    expect(result.isSynced).toBe(true);
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines[0].text).toBe("I found a love for me");
  });

  it("handles IPC invocation in service when isTauri is true (AC-6)", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
      trackId: "track-tauri",
      hasLyrics: true,
      isSynced: true,
      lines: [
        { id: "track-tauri-l0", timeSeconds: 3.5, text: "Native IPC lyric line" },
      ],
      plainText: null,
      sourceType: "lrc",
      userOffsetMs: 100,
    });

    const result = await lyricsGetForTrack("track-tauri");
    expect(tauriCore.invoke).toHaveBeenCalledWith("lyrics_get_for_track", { trackId: "track-tauri" });
    expect(result.sourceType).toBe("lrc");
    expect(result.userOffsetMs).toBe(100);
    expect(result.lines[0].text).toBe("Native IPC lyric line");

    vi.mocked(tauriCore.isTauri).mockReturnValue(false);
  });

  it("updates and debounces user timing offset writes by 300ms in useLyricsStore (AC-7, AC-9)", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
      if (cmd === "lyrics_get_for_track") {
        return {
          trackId: "track-1",
          hasLyrics: true,
          isSynced: true,
          lines: [{ id: "l1", timeSeconds: 1, text: "Line" }],
          plainText: null,
          sourceType: "lrc",
          userOffsetMs: 0,
        };
      }
      return undefined;
    });

    await act(async () => {
      await useLyricsStore.getState().fetchLyrics("track-1");
    });

    expect(useLyricsStore.getState().currentLyrics?.userOffsetMs).toBe(0);

    // First nudge: +100ms
    act(() => {
      useLyricsStore.getState().nudgeUserOffset(100);
    });
    expect(useLyricsStore.getState().currentLyrics?.userOffsetMs).toBe(100);
    expect(tauriCore.invoke).not.toHaveBeenCalledWith("lyrics_set_user_offset", expect.anything());

    // Rapid second nudge within 300ms: +100ms (total 200ms)
    act(() => {
      vi.advanceTimersByTime(100);
      useLyricsStore.getState().nudgeUserOffset(100);
    });
    expect(useLyricsStore.getState().currentLyrics?.userOffsetMs).toBe(200);

    // Advance timers past 300ms debounce window
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(tauriCore.invoke).toHaveBeenCalledTimes(2); // 1 fetch + 1 offset write
    expect(tauriCore.invoke).toHaveBeenCalledWith("lyrics_set_user_offset", {
      trackId: "track-1",
      offsetMs: 200,
    });

    // Reset offset
    await act(async () => {
      await useLyricsStore.getState().resetUserOffset();
    });
    expect(useLyricsStore.getState().currentLyrics?.userOffsetMs).toBe(0);
    expect(tauriCore.invoke).toHaveBeenCalledWith("lyrics_set_user_offset", {
      trackId: "track-1",
      offsetMs: 0,
    });

    vi.mocked(tauriCore.isTauri).mockReturnValue(false);
  });

  it("renders LyricsModal with offset controls and calculates active lyric line (AC-7, AC-8, AC-9)", async () => {
    await act(async () => {
      await useLyricsStore.getState().fetchLyrics("track-1");
    });

    render(<LyricsModal />);

    // Header info
    expect(screen.getByText("Perfect")).toBeInTheDocument();
    expect(screen.getByText("SYNCED")).toBeInTheDocument();

    // Offset controls
    expect(screen.getByLabelText("Delay lyrics timing by 0.1 seconds")).toBeInTheDocument();
    expect(screen.getByLabelText("Advance lyrics timing by 0.1 seconds")).toBeInTheDocument();
    const offsetDisplay = screen.getByTestId("lyrics-offset-value");
    expect(offsetDisplay).toHaveTextContent("0.0s");

    // Click advance offset button (+0.1s)
    act(() => {
      fireEvent.click(screen.getByLabelText("Advance lyrics timing by 0.1 seconds"));
    });
    expect(offsetDisplay).toHaveTextContent("+0.1s");

    // Reset button should appear when offset != 0
    const resetBtn = screen.getByLabelText("Reset lyrics timing offset");
    expect(resetBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(resetBtn);
    });
    expect(offsetDisplay).toHaveTextContent("0.0s");
  });

  it("calculates seek target correctly when clicking a lyric line with user offset (AC-8)", () => {
    const mockSeek = vi.fn();
    usePlayerStore.setState({
      seekToLyricLine: mockSeek,
      currentTime: 10,
    });

    // Pre populate with +200ms offset
    useLyricsStore.setState({
      currentLyrics: {
        trackId: "track-1",
        hasLyrics: true,
        isSynced: true,
        lines: [
          { id: "line-1", timeSeconds: 12.0, text: "Darling just dive right in and follow my lead" },
        ],
        plainText: null,
        sourceType: "lrc",
        userOffsetMs: 200, // +0.2s
      },
    });

    render(<LyricsModal />);

    const lineBtn = screen.getByText("Darling just dive right in and follow my lead");
    fireEvent.click(lineBtn);

    // Target = 12.0 - 0.2s = 11.8s
    expect(mockSeek).toHaveBeenCalledWith(11.8);
  });

  it("renders EmptyLyricsState when track has no lyrics (AC-8, AC-10)", () => {
    usePlayerStore.setState({
      currentTrack: {
        ...sampleTrack,
        id: "no-lyrics-track",
        title: "Instrumental Piece",
      },
    });

    useLyricsStore.setState({
      currentLyrics: {
        trackId: "no-lyrics-track",
        hasLyrics: false,
        isSynced: false,
        lines: [],
        plainText: null,
        sourceType: "none",
        userOffsetMs: 0,
      },
    });

    render(<LyricsModal />);

    expect(screen.getByText("Timed lyrics are unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/We do not have synchronised words for "Instrumental Piece" yet\./i),
    ).toBeInTheDocument();
  });

  it("renders FullscreenLyricsView with active line and handles click seeking (AC-8)", () => {
    const mockSeek = vi.fn();
    useLyricsStore.setState({
      currentLyrics: {
        trackId: "track-1",
        hasLyrics: true,
        isSynced: true,
        lines: [
          { id: "fs-1", timeSeconds: 4.0, text: "Fullscreen line one" },
          { id: "fs-2", timeSeconds: 10.0, text: "Fullscreen line two" },
        ],
        plainText: null,
        sourceType: "lrc",
        userOffsetMs: 0,
      },
    });

    render(<FullscreenLyricsView track={sampleTrack} currentTime={5.0} onSeek={mockSeek} />);

    expect(screen.getByText("Fullscreen line one")).toBeInTheDocument();
    expect(screen.getByText("Fullscreen line two")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Fullscreen line two"));
    expect(mockSeek).toHaveBeenCalledWith(10.0);
  });

  it("handles plain text lyrics fallback and preserves unsynced formatting (AC-1, AC-2, AC-8)", () => {
    const plainTrack: Track = {
      ...sampleTrack,
      id: "track-plain",
      title: "Poetic Piece",
    };

    act(() => {
      usePlayerStore.setState({
        currentTrack: plainTrack,
      });

      useLyricsStore.setState({
        currentLyrics: {
          trackId: "track-plain",
          hasLyrics: true,
          isSynced: false,
          lines: [],
          plainText: "Line one of poem\nLine two of poem",
          sourceType: "embedded",
          userOffsetMs: 0,
        },
        lyricsCache: {
          "track-plain": {
            trackId: "track-plain",
            hasLyrics: true,
            isSynced: false,
            lines: [],
            plainText: "Line one of poem\nLine two of poem",
            sourceType: "embedded",
            userOffsetMs: 0,
          },
        },
      });
    });

    render(<LyricsModal />);

    expect(screen.getByText("Unsynchronised Lyrics")).toBeInTheDocument();
    expect(screen.getByText(/Line one of poem/)).toBeInTheDocument();
    expect(screen.getByText(/Line two of poem/)).toBeInTheDocument();
    // Timing offset controls should not render for unsynced plain text
    expect(screen.queryByTestId("lyrics-offset-value")).not.toBeInTheDocument();
  });

  it("supports rescanLyrics to bust cache and fetch fresh disk lyrics (AC-5, AC-6)", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({
      trackId: "track-1",
      hasLyrics: true,
      isSynced: true,
      lines: [{ id: "rescan-1", timeSeconds: 1.0, text: "Updated after rescan" }],
      plainText: null,
      sourceType: "lrc",
      userOffsetMs: 50,
    });

    await act(async () => {
      await useLyricsStore.getState().rescanLyrics("track-1");
    });

    expect(tauriCore.invoke).toHaveBeenCalledWith("lyrics_rescan_for_track", { trackId: "track-1" });
    expect(useLyricsStore.getState().currentLyrics?.lines[0].text).toBe("Updated after rescan");
    expect(useLyricsStore.getState().currentLyrics?.userOffsetMs).toBe(50);

    vi.mocked(tauriCore.isTauri).mockReturnValue(false);
  });

  it("verifies accessible names and font size cycling on lyrics modal controls (AC-8, AC-9)", async () => {
    await act(async () => {
      await useLyricsStore.getState().fetchLyrics("track-1");
    });

    render(<LyricsModal />);

    // Close button accessible name
    expect(screen.getByLabelText("Close lyrics overlay")).toBeInTheDocument();

    // Font size cycle button
    const fontBtn = screen.getByLabelText(/Current font size medium\. Click to change\./i);
    expect(fontBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(fontBtn);
    });

    expect(useSettingsStore.getState().settings.lyricsFontSize).toBe("large");
  });

  it("returns fallback empty lyrics payload when IPC fails (AC-10)", async () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    vi.mocked(tauriCore.invoke).mockRejectedValueOnce(new Error("File not found"));

    const result = await lyricsGetForTrack("error-track");
    expect(result.hasLyrics).toBe(false);
    expect(result.lines).toHaveLength(0);
    expect(result.sourceType).toBe("none");

    vi.mocked(tauriCore.isTauri).mockReturnValue(false);
  });
});
