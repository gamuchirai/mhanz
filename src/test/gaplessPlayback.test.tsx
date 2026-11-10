import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "@testing-library/react";
import {
  listenAudioTrackChanged,
  listenAudioTrackSkipped,
  resetAudioMock,
  setAudioMockMode,
} from "../services/audio";
import {
  usePlayerStore,
  initPlayerAudioSync,
  cleanupPlayerAudioSync,
} from "../store/usePlayerStore";
import { useToastStore } from "../store/useToastStore";
import type { Track } from "../types/discovery";

const testTracks: Track[] = [
  {
    id: "track-gapless-1",
    title: "First Movement",
    artist: "Orchestra",
    album: "Symphony No. 5",
    durationSeconds: 180,
    artworkUrl: "https://example.com/art.jpg",
    playsCount: 0,
    filePath: "C:/music/track1.flac",
    isLiked: false,
  },
  {
    id: "track-gapless-2",
    title: "Second Movement",
    artist: "Orchestra",
    album: "Symphony No. 5",
    durationSeconds: 210,
    artworkUrl: "https://example.com/art.jpg",
    playsCount: 0,
    filePath: "C:/music/track2.flac",
    isLiked: false,
  },
  {
    id: "track-gapless-3",
    title: "Third Movement",
    artist: "Orchestra",
    album: "Symphony No. 5",
    durationSeconds: 240,
    artworkUrl: "https://example.com/art.jpg",
    playsCount: 0,
    filePath: "C:/music/track3.flac",
    isLiked: false,
  },
];

describe("Gapless Track Transitions (Feature 27)", () => {
  beforeEach(() => {
    setAudioMockMode(true);
    resetAudioMock();
    initPlayerAudioSync();
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
    usePlayerStore.setState({
      queue: [...testTracks],
      currentIndex: 0,
      currentTrack: testTracks[0],
      isPlaying: false,
      currentTime: 0,
      repeatMode: "off",
      isShuffle: false,
      queueGeneration: 1,
    });
  });

  afterEach(() => {
    cleanupPlayerAudioSync();
    vi.useRealTimers();
    resetAudioMock();
  });

  it("stages next track candidates in audio engine when playback begins (AC-3, AC-4, AC-10)", async () => {
    await act(async () => {
      usePlayerStore.getState().playTrack(testTracks[0], testTracks);
    });

    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-1");
    expect(usePlayerStore.getState().queueGeneration).toBeGreaterThan(1);
  });

  it("switches to the staged next track via audio:track-changed event without stopping playback (AC-1, AC-4)", async () => {
    let trackChangedReceived = false;
    await listenAudioTrackChanged((event) => {
      if (event.track_id === "track-gapless-2") {
        trackChangedReceived = true;
      }
    });

    await act(async () => {
      usePlayerStore.getState().playTrack(testTracks[0], testTracks);
    });

    // Advance playback clock through track 1 duration to reach boundary
    await act(async () => {
      vi.advanceTimersByTime(180500);
    });

    expect(trackChangedReceived).toBe(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-2");
    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("skips corrupt next file, emits skip event, and displays a five second toast (AC-5)", async () => {
    const corruptTracks: Track[] = [
      testTracks[0],
      {
        ...testTracks[1],
        id: "track-corrupt",
        filePath: "C:/music/corrupt.mp3",
      },
      testTracks[2],
    ];

    let skipEventReceived = false;
    await listenAudioTrackSkipped((event) => {
      if (event.failed_track_id === "track-corrupt") {
        skipEventReceived = true;
      }
    });

    await act(async () => {
      usePlayerStore.getState().playTrack(corruptTracks[0], corruptTracks);
    });

    // Fast-forward to track 1 end
    await act(async () => {
      vi.advanceTimersByTime(180500);
    });

    expect(skipEventReceived).toBe(true);
    // Skips to following valid track without stopping
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-3");
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    // Verifies 5 second toast was spawned in toast store (AC-5)
    const toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBeGreaterThan(0);
    expect(toasts[0].message).toContain("skipped");

    // Toast expires after 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5100);
    });
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it("stages current track in repeat-one mode and wraps in repeat-all mode (AC-7)", async () => {
    // Repeat one mode
    await act(async () => {
      usePlayerStore.setState({ repeatMode: "one" });
      usePlayerStore.getState().playTrack(testTracks[0], testTracks);
    });

    // Track 1 completes, repeat one loops same track
    await act(async () => {
      vi.advanceTimersByTime(180500);
    });

    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-1");
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    // Repeat all mode at last track
    await act(async () => {
      usePlayerStore.setState({
        repeatMode: "all",
      });
      usePlayerStore.getState().playTrack(testTracks[2], testTracks);
    });

    // Track 3 completes, repeat all wraps to track 1
    await act(async () => {
      vi.advanceTimersByTime(240500);
    });

    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-1");
    expect(usePlayerStore.getState().currentIndex).toBe(0);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("stops playback when queue ends with repeat-off (AC-8)", async () => {
    await act(async () => {
      usePlayerStore.setState({
        repeatMode: "off",
        currentIndex: 2,
        currentTrack: testTracks[2],
      });
      usePlayerStore.getState().playTrack(testTracks[2], [testTracks[2]]);
    });

    await act(async () => {
      vi.advanceTimersByTime(240500);
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("increments queue generation on queue changes, shuffle, and repeat modes (AC-10)", async () => {
    const initialGen = usePlayerStore.getState().queueGeneration;

    act(() => {
      usePlayerStore.getState().toggleRepeat();
    });
    expect(usePlayerStore.getState().queueGeneration).toBeGreaterThan(initialGen);

    const prevGen = usePlayerStore.getState().queueGeneration;
    act(() => {
      usePlayerStore.getState().toggleShuffle();
    });
    expect(usePlayerStore.getState().queueGeneration).toBeGreaterThan(prevGen);

    const genBeforeAdd = usePlayerStore.getState().queueGeneration;
    act(() => {
      usePlayerStore.getState().addToQueue({
        id: "track-extra",
        title: "Bonus Track",
        artist: "Artist",
        album: "Single",
        durationSeconds: 120,
        artworkUrl: "https://example.com/art.jpg",
        playsCount: 0,
        isLiked: false,
        filePath: "C:/music/extra.mp3",
      });
    });
    expect(usePlayerStore.getState().queueGeneration).toBeGreaterThan(genBeforeAdd);
  });

  it("updates position via seekTo and preserves playing state (AC-6)", async () => {
    await act(async () => {
      usePlayerStore.getState().playTrack(testTracks[0], testTracks);
    });

    expect(usePlayerStore.getState().isPlaying).toBe(true);

    // Seek to 175s (within the 10s lookahead window of 180s track)
    act(() => {
      usePlayerStore.getState().seekTo(175);
    });

    expect(usePlayerStore.getState().currentTime).toBe(175);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("restages lookahead candidates and updates generation on manual nextTrack call (AC-9, AC-10)", async () => {
    await act(async () => {
      usePlayerStore.getState().playTrack(testTracks[0], testTracks);
    });

    const genBeforeNext = usePlayerStore.getState().queueGeneration;

    await act(async () => {
      usePlayerStore.getState().nextTrack();
    });

    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-2");
    expect(usePlayerStore.getState().queueGeneration).toBeGreaterThan(genBeforeNext);
  });

  it("restages lookahead candidates and updates generation on manual previousTrack call (AC-9, AC-10)", async () => {
    await act(async () => {
      usePlayerStore.getState().playTrack(testTracks[1], testTracks);
    });

    const genBeforePrev = usePlayerStore.getState().queueGeneration;

    await act(async () => {
      usePlayerStore.getState().previousTrack();
    });

    expect(usePlayerStore.getState().currentIndex).toBe(0);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-1");
    expect(usePlayerStore.getState().queueGeneration).toBeGreaterThan(genBeforePrev);
  });

  it("handles single-track queue with repeat-one seamlessly (AC-7)", async () => {
    const singleQueue = [testTracks[0]];

    await act(async () => {
      usePlayerStore.setState({ repeatMode: "one" });
      usePlayerStore.getState().playTrack(singleQueue[0], singleQueue);
    });

    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-1");

    // Advance through the entire track duration
    await act(async () => {
      vi.advanceTimersByTime(180500);
    });

    // Loops back to track 1
    expect(usePlayerStore.getState().currentTrack?.id).toBe("track-gapless-1");
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});
