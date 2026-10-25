import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  audioGetState,
  audioPause,
  audioPlayTrack,
  audioResume,
  audioSeek,
  audioSetMuted,
  audioSetVolume,
  audioStop,
  listenAudioError,
  listenAudioPosition,
  listenAudioStateChanged,
  listenAudioTrackEnded,
  resetAudioMock,
  setAudioMockMode,
} from "../audio";
import {
  cleanupPlayerAudioSync,
  initPlayerAudioSync,
  usePlayerStore,
} from "../../store/usePlayerStore";
import type {
  AudioErrorDto,
  AudioPlaybackStateDto,
  AudioPositionDto,
  AudioTrackEndedDto,
} from "../../types/audio";
import type { Track } from "../../types/discovery";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => false),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

describe("AudioService & Player Store Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAudioMock();
    setAudioMockMode(true);
  });

  afterEach(() => {
    resetAudioMock();
    cleanupPlayerAudioSync();
  });

  describe("Browser & Test Mock Engine (AC-12)", () => {
    it("audioPlayTrack updates status to playing and emits state change", async () => {
      const stateChanges: AudioPlaybackStateDto[] = [];
      const unlisten = await listenAudioStateChanged((s) => stateChanges.push(s));

      const state = await audioPlayTrack("track-1", "D:/Music/song.mp3", 10, 200);

      expect(state.track_id).toBe("track-1");
      expect(state.status).toBe("playing");
      expect(state.position_seconds).toBe(10);
      expect(state.duration_seconds).toBe(200);
      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[stateChanges.length - 1].status).toBe("playing");

      unlisten();
    });

    it("audioPlayTrack rejects and emits audio:error when file path is empty", async () => {
      const errors: AudioErrorDto[] = [];
      const unlisten = await listenAudioError((err) => errors.push(err));

      await expect(audioPlayTrack("track-err", "")).rejects.toMatchObject({
        code: "FILE_NOT_FOUND",
      });

      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe("FILE_NOT_FOUND");
      expect(errors[0].track_id).toBe("track-err");

      unlisten();
    });

    it("audioPause and audioResume control playback state transitions", async () => {
      await audioPlayTrack("track-1", "D:/Music/song.mp3", 0, 100);

      const paused = await audioPause();
      expect(paused.status).toBe("paused");

      const resumed = await audioResume();
      expect(resumed.status).toBe("playing");
    });

    it("audioPause throws error when not playing", async () => {
      await expect(audioPause()).rejects.toMatchObject({
        code: "NOT_PLAYING",
      });
    });

    it("audioResume throws error when not paused", async () => {
      await expect(audioResume()).rejects.toMatchObject({
        code: "NOT_PAUSED",
      });
    });

    it("audioStop resets playback state and position to 0", async () => {
      await audioPlayTrack("track-1", "D:/Music/song.mp3", 50, 100);
      const stopped = await audioStop();

      expect(stopped.status).toBe("stopped");
      expect(stopped.position_seconds).toBe(0);
    });

    it("audioSeek clamps position within valid track duration", async () => {
      await audioPlayTrack("track-1", "D:/Music/song.mp3", 0, 150);

      const seekMid = await audioSeek(75);
      expect(seekMid.position_seconds).toBe(75);

      const seekOver = await audioSeek(300);
      expect(seekOver.position_seconds).toBe(150);

      const seekUnder = await audioSeek(-10);
      expect(seekUnder.position_seconds).toBe(0);
    });

    it("audioSeek throws NOT_LOADED when no track is loaded", async () => {
      await expect(audioSeek(10)).rejects.toMatchObject({
        code: "NOT_LOADED",
      });
    });

    it("audioSetVolume and audioSetMuted control gain and mute status", async () => {
      await audioSetVolume(0.65);
      let state = await audioGetState();
      expect(state.volume).toBe(0.65);
      expect(state.is_muted).toBe(false);

      await audioSetVolume(1.5);
      state = await audioGetState();
      expect(state.volume).toBe(1.0);

      await audioSetVolume(-0.2);
      state = await audioGetState();
      expect(state.volume).toBe(0.0);
      expect(state.is_muted).toBe(true);

      await audioSetVolume(0.7);
      await audioSetMuted(true);
      state = await audioGetState();
      expect(state.is_muted).toBe(true);
      expect(state.volume).toBe(0.7);
    });

    it("emits periodic audio:position events while playing and track-ended on completion", async () => {
      vi.useFakeTimers();

      const positions: AudioPositionDto[] = [];
      const endings: AudioTrackEndedDto[] = [];

      const unlistenPos = await listenAudioPosition((p) => positions.push(p));
      const unlistenEnd = await listenAudioTrackEnded((e) => endings.push(e));

      // Play short 0.3s track
      await audioPlayTrack("short-track", "D:/Music/short.wav", 0, 0.3);

      // Advance by 100ms
      vi.advanceTimersByTime(100);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions[0].track_id).toBe("short-track");

      // Advance past duration (300ms total)
      vi.advanceTimersByTime(300);
      expect(endings.length).toBe(1);
      expect(endings[0].track_id).toBe("short-track");
      expect(endings[0].completed).toBe(true);

      const currentState = await audioGetState();
      expect(currentState.status).toBe("stopped");

      unlistenPos();
      unlistenEnd();
      vi.useRealTimers();
    });
  });

  describe("Tauri Native Desktop IPC Invocation Mode", () => {
    beforeEach(() => {
      setAudioMockMode(false);
      vi.mocked(isTauri).mockReturnValue(true);
    });

    it("invokes audio_play_track with correct arguments", async () => {
      const mockResult: AudioPlaybackStateDto = {
        track_id: "native-1",
        file_path: "C:/music/track.flac",
        status: "playing",
        position_seconds: 0,
        duration_seconds: 240,
        volume: 0.8,
        is_muted: false,
      };
      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const result = await audioPlayTrack("native-1", "C:/music/track.flac", 0);
      expect(invoke).toHaveBeenCalledWith("audio_play_track", {
        trackId: "native-1",
        filePath: "C:/music/track.flac",
        startPosition: 0,
      });
      expect(result).toEqual(mockResult);
    });

    it("invokes audio_pause and audio_resume", async () => {
      const mockResult: AudioPlaybackStateDto = {
        track_id: "native-1",
        file_path: "C:/music/track.flac",
        status: "paused",
        position_seconds: 15,
        duration_seconds: 240,
        volume: 0.8,
        is_muted: false,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      await audioPause();
      expect(invoke).toHaveBeenCalledWith("audio_pause");

      await audioResume();
      expect(invoke).toHaveBeenCalledWith("audio_resume");
    });

    it("invokes audio_seek, audio_set_volume, and audio_set_muted", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await audioSeek(42.5);
      expect(invoke).toHaveBeenCalledWith("audio_seek", { positionSeconds: 42.5 });

      await audioSetVolume(0.5);
      expect(invoke).toHaveBeenCalledWith("audio_set_volume", { volume: 0.5 });

      await audioSetMuted(true);
      expect(invoke).toHaveBeenCalledWith("audio_set_muted", { muted: true });
    });

    it("registers native event listeners with tauri listen", async () => {
      const dummyUnlisten = vi.fn();
      vi.mocked(listen).mockResolvedValue(dummyUnlisten);

      const cb = vi.fn();
      const unlisten = await listenAudioPosition(cb);

      expect(listen).toHaveBeenCalledWith("audio:position", expect.any(Function));
      unlisten();
      expect(dummyUnlisten).toHaveBeenCalled();
    });
  });

  describe("Zustand usePlayerStore Audio Integration", () => {
    beforeEach(() => {
      setAudioMockMode(true);
      initPlayerAudioSync();
    });

    it("playTrack action loads track into audio engine and sets playing", async () => {
      const testTrack: Track = {
        id: "custom-track-99",
        title: "Test Song",
        artist: "Test Artist",
        album: "Test Album",
        durationSeconds: 150,
        artworkUrl: "/art.png",
        playsCount: 0,
        isLiked: false,
        filePath: "D:/Music/test.mp3",
      };

      usePlayerStore.getState().playTrack(testTrack);

      const state = usePlayerStore.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.currentTrack?.id).toBe("custom-track-99");
      expect(state.currentTime).toBe(0);

      const audioState = await audioGetState();
      expect(audioState.track_id).toBe("custom-track-99");
      expect(audioState.status).toBe("playing");
    });

    it("togglePlayPause toggles store playback and audio engine pause/resume", async () => {
      const testTrack: Track = {
        id: "toggle-track",
        title: "Toggle Song",
        artist: "Artist",
        album: "Album",
        durationSeconds: 100,
        artworkUrl: "/art.png",
        playsCount: 0,
        isLiked: false,
        filePath: "D:/Music/toggle.mp3",
      };

      usePlayerStore.getState().playTrack(testTrack);
      expect(usePlayerStore.getState().isPlaying).toBe(true);

      usePlayerStore.getState().togglePlayPause();
      expect(usePlayerStore.getState().isPlaying).toBe(false);

      let audioState = await audioGetState();
      expect(audioState.status).toBe("paused");

      usePlayerStore.getState().togglePlayPause();
      expect(usePlayerStore.getState().isPlaying).toBe(true);

      audioState = await audioGetState();
      expect(audioState.status).toBe("playing");
    });

    it("seekTo updates current time and calls audioSeek", async () => {
      const testTrack: Track = {
        id: "seek-track",
        title: "Seek Song",
        artist: "Artist",
        album: "Album",
        durationSeconds: 200,
        artworkUrl: "/art.png",
        playsCount: 0,
        isLiked: false,
      };

      usePlayerStore.getState().playTrack(testTrack);
      usePlayerStore.getState().seekTo(88);

      expect(usePlayerStore.getState().currentTime).toBe(88);

      const audioState = await audioGetState();
      expect(audioState.position_seconds).toBe(88);
    });

    it("setVolume and toggleMute coordinate volume state with audio service", async () => {
      usePlayerStore.getState().setVolume(0.4);
      expect(usePlayerStore.getState().volume).toBe(0.4);
      expect(usePlayerStore.getState().isMuted).toBe(false);

      usePlayerStore.getState().toggleMute();
      expect(usePlayerStore.getState().isMuted).toBe(true);

      usePlayerStore.getState().toggleMute();
      expect(usePlayerStore.getState().isMuted).toBe(false);
    });
  });
});
