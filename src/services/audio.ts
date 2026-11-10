/**
 * Audio service bridging the frontend player store and UI components
 * to the native Rodio audio engine via Tauri IPC and events,
 * with a high-fidelity browser/test mock fallback.
 */

import { invoke, isTauri, Channel } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AudioErrorDto,
  AudioPlaybackStateDto,
  AudioPositionDto,
  AudioTrackChangedDto,
  AudioTrackEndedDto,
  AudioTrackSkippedDto,
  NextTrackCandidate,
  SpectrumFrame,
} from "../types/audio";
import type { PlayHistoryItemDto } from "../types/database";

// Internal listeners for mock mode or broadcast
type PositionListener = (pos: AudioPositionDto) => void;
type StateChangedListener = (state: AudioPlaybackStateDto) => void;
type TrackEndedListener = (event: AudioTrackEndedDto) => void;
type TrackChangedListener = (event: AudioTrackChangedDto) => void;
type TrackSkippedListener = (event: AudioTrackSkippedDto) => void;
type ErrorListener = (error: AudioErrorDto) => void;
type HistoryListener = (item: PlayHistoryItemDto) => void;

const MOCK_DEFAULT_DURATION_SECONDS = 180.0;

interface MockEngineState {
  state: AudioPlaybackStateDto;
  timerHandle: ReturnType<typeof setInterval> | null;
  visualizerTimerHandle: ReturnType<typeof setInterval> | null;
  visualizerChannel: Channel<SpectrumFrame> | null;
  visualizerSequence: number;
  forceMock: boolean;
  milestoneRecorded: boolean;
  lookahead: NextTrackCandidate[];
  queueGeneration: number;
  positionListeners: Set<PositionListener>;
  stateChangedListeners: Set<StateChangedListener>;
  trackEndedListeners: Set<TrackEndedListener>;
  trackChangedListeners: Set<TrackChangedListener>;
  trackSkippedListeners: Set<TrackSkippedListener>;
  errorListeners: Set<ErrorListener>;
  historyListeners: Set<HistoryListener>;
}

const mockEngine: MockEngineState = {
  state: {
    track_id: null,
    file_path: null,
    status: "stopped",
    position_seconds: 0,
    duration_seconds: 0,
    volume: 0.8,
    is_muted: false,
    context_title: null,
    context_type: null,
  },
  timerHandle: null,
  visualizerTimerHandle: null,
  visualizerChannel: null,
  visualizerSequence: 0,
  forceMock: false,
  milestoneRecorded: false,
  lookahead: [],
  queueGeneration: 0,
  positionListeners: new Set(),
  stateChangedListeners: new Set(),
  trackEndedListeners: new Set(),
  trackChangedListeners: new Set(),
  trackSkippedListeners: new Set(),
  errorListeners: new Set(),
  historyListeners: new Set(),
};

/**
 * Configure whether the service must use mock engine regardless of Tauri runtime.
 * Useful for Vitest unit tests and browser isolation.
 */
export function setAudioMockMode(enabled: boolean): void {
  mockEngine.forceMock = enabled;
  if (!enabled && mockEngine.timerHandle) {
    clearInterval(mockEngine.timerHandle);
    mockEngine.timerHandle = null;
  }
}

/**
 * Checks whether the native Tauri backend is available or if mock mode is active.
 */
export function isAudioMockActive(): boolean {
  if (mockEngine.forceMock) return true;
  return !isTauri();
}

/**
 * Stops the mock playback timer.
 */
function stopMockTimer(): void {
  if (mockEngine.timerHandle) {
    clearInterval(mockEngine.timerHandle);
    mockEngine.timerHandle = null;
  }
}

/**
 * Starts the 100ms mock timer during active playback.
 */
function startMockTimer(): void {
  stopMockTimer();
  mockEngine.timerHandle = setInterval(() => {
    if (mockEngine.state.status !== "playing" || !mockEngine.state.track_id) {
      stopMockTimer();
      return;
    }

    const nextPos = mockEngine.state.position_seconds + 0.1;
    const dur = mockEngine.state.duration_seconds;

    // Check 30s or half duration milestone latch
    if (!mockEngine.milestoneRecorded && (nextPos >= 30.0 || (dur > 0 && nextPos >= dur / 2.0))) {
      mockEngine.milestoneRecorded = true;
      const historyItem: PlayHistoryItemDto = {
        id: `mock-hist-${Date.now()}`,
        track_id: mockEngine.state.track_id,
        played_at: Math.floor(Date.now() / 1000),
        context_title: mockEngine.state.context_title ?? null,
        context_type: mockEngine.state.context_type ?? null,
        track: {
          id: mockEngine.state.track_id,
          file_path: mockEngine.state.file_path ?? "",
          title: "Mock Track",
          artist_id: null,
          artist_name: "Unknown Artist",
          album_id: null,
          album_name: null,
          album_artist: null,
          duration: dur,
          year: null,
          genre: null,
          disc_number: 1,
          track_number: null,
          bitrate: null,
          format: "mp3",
          cover_art_path: null,
          is_favorite: false,
          liked_at: null,
          play_count: 1,
          last_played_at: Math.floor(Date.now() / 1000),
          file_modified_at: Math.floor(Date.now() / 1000),
          file_size_bytes: 0,
          folder_id: null,
          created_at: Math.floor(Date.now() / 1000),
          updated_at: Math.floor(Date.now() / 1000),
        },
      };
      notifyHistoryRecorded(historyItem);
    }

    if (dur > 0 && nextPos >= dur) {
      // Check if lookahead has candidates for gapless transition
      let transitionedCandidate: NextTrackCandidate | null = null;
      while (mockEngine.lookahead.length > 0) {
        const candidate = mockEngine.lookahead.shift()!;
        if (candidate.file_path.includes("corrupt") || candidate.file_path.includes("missing")) {
          const followingId = mockEngine.lookahead[0]?.track_id ?? null;
          notifyTrackSkipped({
            failed_track_id: candidate.track_id,
            reason_code: "DECODE_ERROR",
            following_track_id: followingId,
          });
          continue;
        }
        transitionedCandidate = candidate;
        break;
      }

      if (transitionedCandidate) {
        // Gapless track change; candidates carry no duration, so use the mock default.
        mockEngine.state.track_id = transitionedCandidate.track_id;
        mockEngine.state.file_path = transitionedCandidate.file_path;
        mockEngine.state.duration_seconds = MOCK_DEFAULT_DURATION_SECONDS;
        mockEngine.state.position_seconds = 0;
        mockEngine.milestoneRecorded = false;

        notifyStateChanged({ ...mockEngine.state });
        notifyTrackChanged({
          track_id: transitionedCandidate.track_id,
          duration_seconds: MOCK_DEFAULT_DURATION_SECONDS,
          queue_generation: mockEngine.queueGeneration,
        });
        return;
      }

      // No more tracks: queue ended naturally
      mockEngine.state.status = "stopped";
      mockEngine.state.position_seconds = 0;
      stopMockTimer();

      const endedTrackId = mockEngine.state.track_id;
      notifyStateChanged({ ...mockEngine.state });
      notifyTrackEnded({ track_id: endedTrackId, completed: true });
      return;
    }

    mockEngine.state.position_seconds = nextPos;
    notifyPosition({
      track_id: mockEngine.state.track_id,
      position_seconds: nextPos,
      duration_seconds: dur,
      is_playing: true,
    });
  }, 100);
}

function notifyPosition(payload: AudioPositionDto): void {
  mockEngine.positionListeners.forEach((fn) => fn(payload));
}

function notifyStateChanged(payload: AudioPlaybackStateDto): void {
  mockEngine.stateChangedListeners.forEach((fn) => fn(payload));
}

function notifyTrackEnded(payload: AudioTrackEndedDto): void {
  mockEngine.trackEndedListeners.forEach((fn) => fn(payload));
}

function notifyTrackChanged(payload: AudioTrackChangedDto): void {
  mockEngine.trackChangedListeners.forEach((fn) => fn(payload));
}

function notifyTrackSkipped(payload: AudioTrackSkippedDto): void {
  mockEngine.trackSkippedListeners.forEach((fn) => fn(payload));
}

function notifyError(payload: AudioErrorDto): void {
  mockEngine.errorListeners.forEach((fn) => fn(payload));
}

function notifyHistoryRecorded(payload: PlayHistoryItemDto): void {
  mockEngine.historyListeners.forEach((fn) => fn(payload));
}

/**
 * Plays a local audio file by track identifier and canonical file path.
 */
export async function audioPlayTrack(
  trackId: string,
  filePath: string,
  startPosition?: number,
  durationHint?: number,
  contextTitle?: string,
  contextType?: string
): Promise<AudioPlaybackStateDto> {
  if (isAudioMockActive()) {
    if (!filePath || filePath.trim().length === 0) {
      const errDto: AudioErrorDto = {
        code: "FILE_NOT_FOUND",
        message: "Audio file path cannot be empty",
        track_id: trackId,
      };
      notifyError(errDto);
      throw errDto;
    }

    const startPos = Math.max(0, startPosition ?? 0);
    const duration = Math.max(0, durationHint ?? MOCK_DEFAULT_DURATION_SECONDS);

    mockEngine.milestoneRecorded = false;
    mockEngine.state = {
      ...mockEngine.state,
      track_id: trackId,
      file_path: filePath,
      status: "playing",
      position_seconds: startPos,
      duration_seconds: duration,
      context_title: contextTitle ?? null,
      context_type: contextType ?? null,
    };

    notifyStateChanged({ ...mockEngine.state });
    startMockTimer();
    return { ...mockEngine.state };
  }

  const invokeArgs: Record<string, unknown> = {
    trackId,
    filePath,
    startPosition: startPosition ?? null,
  };
  if (contextTitle !== undefined) {
    invokeArgs.contextTitle = contextTitle;
  }
  if (contextType !== undefined) {
    invokeArgs.contextType = contextType;
  }

  return invoke<AudioPlaybackStateDto>("audio_play_track", invokeArgs);
}

/**
 * Pauses active audio playback.
 */
export async function audioPause(): Promise<AudioPlaybackStateDto> {
  if (isAudioMockActive()) {
    if (mockEngine.state.status !== "playing") {
      const err: AudioErrorDto = {
        code: "NOT_PLAYING",
        message: "Playback is not currently active",
        track_id: mockEngine.state.track_id,
      };
      notifyError(err);
      throw err;
    }
    stopMockTimer();
    mockEngine.state.status = "paused";
    notifyStateChanged({ ...mockEngine.state });
    return { ...mockEngine.state };
  }

  return invoke<AudioPlaybackStateDto>("audio_pause");
}

/**
 * Resumes paused audio playback.
 */
export async function audioResume(): Promise<AudioPlaybackStateDto> {
  if (isAudioMockActive()) {
    if (mockEngine.state.status !== "paused") {
      const err: AudioErrorDto = {
        code: "NOT_PAUSED",
        message: "Playback is not currently paused",
        track_id: mockEngine.state.track_id,
      };
      notifyError(err);
      throw err;
    }
    mockEngine.state.status = "playing";
    notifyStateChanged({ ...mockEngine.state });
    startMockTimer();
    return { ...mockEngine.state };
  }

  return invoke<AudioPlaybackStateDto>("audio_resume");
}

/**
 * Halts audio playback and resets the playback clock to zero.
 */
export async function audioStop(): Promise<AudioPlaybackStateDto> {
  if (isAudioMockActive()) {
    stopMockTimer();
    mockEngine.state.status = "stopped";
    mockEngine.state.position_seconds = 0;
    notifyStateChanged({ ...mockEngine.state });
    return { ...mockEngine.state };
  }

  return invoke<AudioPlaybackStateDto>("audio_stop");
}

/**
 * Seeks active playback stream to specified timestamp in seconds.
 */
export async function audioSeek(positionSeconds: number): Promise<AudioPlaybackStateDto> {
  if (isAudioMockActive()) {
    if (!mockEngine.state.track_id) {
      const err: AudioErrorDto = {
        code: "NOT_LOADED",
        message: "No audio track is currently loaded",
      };
      notifyError(err);
      throw err;
    }
    const clamped = Math.max(0, Math.min(positionSeconds, mockEngine.state.duration_seconds));
    mockEngine.state.position_seconds = clamped;
    notifyStateChanged({ ...mockEngine.state });
    return { ...mockEngine.state };
  }

  return invoke<AudioPlaybackStateDto>("audio_seek", { positionSeconds });
}

/**
 * Adjusts playback volume output gain (0.0 to 1.0).
 */
export async function audioSetVolume(volume: number): Promise<void> {
  const clamped = Math.max(0, Math.min(volume, 1.0));
  if (isAudioMockActive()) {
    mockEngine.state.volume = clamped;
    mockEngine.state.is_muted = clamped === 0;
    notifyStateChanged({ ...mockEngine.state });
    return;
  }

  return invoke<void>("audio_set_volume", { volume: clamped });
}

/**
 * Toggles or sets output mute flag.
 */
export async function audioSetMuted(muted: boolean): Promise<void> {
  if (isAudioMockActive()) {
    mockEngine.state.is_muted = muted;
    notifyStateChanged({ ...mockEngine.state });
    return;
  }

  return invoke<void>("audio_set_muted", { muted });
}

/**
 * Queries current playback state snapshot.
 */
export async function audioGetState(): Promise<AudioPlaybackStateDto> {
  if (isAudioMockActive()) {
    return { ...mockEngine.state };
  }

  return invoke<AudioPlaybackStateDto>("audio_get_state");
}

/**
 * Pre-stages lookahead candidates in the native engine for gapless playback (AC-4, AC-10).
 */
export async function audioSetNextTrack(
  lookahead: NextTrackCandidate[],
  queueGeneration: number
): Promise<void> {
  if (isAudioMockActive()) {
    if (queueGeneration < mockEngine.queueGeneration) {
      return;
    }
    mockEngine.queueGeneration = queueGeneration;
    mockEngine.lookahead = [...lookahead];
    return;
  }

  return invoke<void>("audio_set_next_track", {
    lookahead,
    queueGeneration,
  });
}

/**
 * Subscribes to periodic 100ms timeline position updates during active playback.
 */
export async function listenAudioPosition(
  callback: (pos: AudioPositionDto) => void
): Promise<UnlistenFn> {
  if (isAudioMockActive()) {
    mockEngine.positionListeners.add(callback);
    return () => {
      mockEngine.positionListeners.delete(callback);
    };
  }

  return listen<AudioPositionDto>("audio:position", (event) => {
    callback(event.payload);
  });
}

/**
 * Subscribes to audio state lifecycle transitions.
 */
export async function listenAudioStateChanged(
  callback: (state: AudioPlaybackStateDto) => void
): Promise<UnlistenFn> {
  if (isAudioMockActive()) {
    mockEngine.stateChangedListeners.add(callback);
    return () => {
      mockEngine.stateChangedListeners.delete(callback);
    };
  }

  return listen<AudioPlaybackStateDto>("audio:state-changed", (event) => {
    callback(event.payload);
  });
}

/**
 * Subscribes to track natural completion events.
 */
export async function listenAudioTrackEnded(
  callback: (event: AudioTrackEndedDto) => void
): Promise<UnlistenFn> {
  if (isAudioMockActive()) {
    mockEngine.trackEndedListeners.add(callback);
    return () => {
      mockEngine.trackEndedListeners.delete(callback);
    };
  }

  return listen<AudioTrackEndedDto>("audio:track-ended", (event) => {
    callback(event.payload);
  });
}

/**
 * Subscribes to gapless track boundary transition events (AC-4).
 */
export async function listenAudioTrackChanged(
  callback: (event: AudioTrackChangedDto) => void
): Promise<UnlistenFn> {
  if (isAudioMockActive()) {
    mockEngine.trackChangedListeners.add(callback);
    return () => {
      mockEngine.trackChangedListeners.delete(callback);
    };
  }

  return listen<AudioTrackChangedDto>("audio:track-changed", (event) => {
    callback(event.payload);
  });
}

/**
 * Subscribes to candidate skip events when a corrupt or missing file is skipped (AC-5).
 */
export async function listenAudioTrackSkipped(
  callback: (event: AudioTrackSkippedDto) => void
): Promise<UnlistenFn> {
  if (isAudioMockActive()) {
    mockEngine.trackSkippedListeners.add(callback);
    return () => {
      mockEngine.trackSkippedListeners.delete(callback);
    };
  }

  return listen<AudioTrackSkippedDto>("audio:track-skipped", (event) => {
    callback(event.payload);
  });
}

/**
 * Subscribes to audio subsystem error events.
 */
export async function listenAudioError(
  callback: (error: AudioErrorDto) => void
): Promise<UnlistenFn> {
  if (isAudioMockActive()) {
    mockEngine.errorListeners.add(callback);
    return () => {
      mockEngine.errorListeners.delete(callback);
    };
  }

  return listen<AudioErrorDto>("audio:error", (event) => {
    callback(event.payload);
  });
}

/**
 * Subscribes to listening history milestone recordings.
 */
export async function listenAudioHistoryRecorded(
  callback: (item: PlayHistoryItemDto) => void
): Promise<UnlistenFn> {
  if (isAudioMockActive()) {
    mockEngine.historyListeners.add(callback);
    return () => {
      mockEngine.historyListeners.delete(callback);
    };
  }

  return listen<PlayHistoryItemDto>("audio:history-recorded", (event) => {
    callback(event.payload);
  });
}

/**
 * Starts streaming live spectrum analysis frames through a typed Channel (AC-2).
 */
export async function startSpectrumAnalysis(
  channel: Channel<SpectrumFrame>
): Promise<void> {
  if (isAudioMockActive()) {
    if (mockEngine.visualizerTimerHandle) {
      clearInterval(mockEngine.visualizerTimerHandle);
      mockEngine.visualizerTimerHandle = null;
    }
    mockEngine.visualizerChannel = channel;
    mockEngine.visualizerTimerHandle = setInterval(() => {
      if (!mockEngine.visualizerChannel) return;
      const isPlaying = mockEngine.state.status === "playing";
      const isMuted = mockEngine.state.is_muted;
      const vol = isMuted ? 0 : mockEngine.state.volume;

      const bands = new Array(32).fill(0).map((_, i) => {
        if (!isPlaying || vol === 0) return 0;
        const base = Math.sin(Date.now() * 0.005 + i * 0.3) * 0.5 + 0.5;
        return Math.max(0, Math.min(1, base * vol));
      });

      mockEngine.visualizerSequence += 1;
      const frame: SpectrumFrame = {
        track_id: mockEngine.state.track_id ?? "mock-track",
        timestamp_ms: Date.now(),
        sequence: mockEngine.visualizerSequence,
        bands,
      };

      try {
        const chan = mockEngine.visualizerChannel as any;
        if (typeof chan.onmessage === "function") {
          chan.onmessage(frame);
        } else if (typeof chan.send === "function") {
          chan.send(frame);
        }
      } catch {
        // channel closed or unsupported in mock
      }
    }, 50); // ~20 fps
    return;
  }

  return invoke<void>("start_spectrum_analysis", { channel });
}

/**
 * Halts live spectrum analysis streaming and ends the Channel (AC-2).
 */
export async function stopSpectrumAnalysis(): Promise<void> {
  if (isAudioMockActive()) {
    if (mockEngine.visualizerTimerHandle) {
      clearInterval(mockEngine.visualizerTimerHandle);
      mockEngine.visualizerTimerHandle = null;
    }
    mockEngine.visualizerChannel = null;
    return;
  }

  return invoke<void>("stop_spectrum_analysis");
}

/**
 * Helper to reset mock state for clean test assertions.
 */
export function resetAudioMock(): void {
  stopMockTimer();
  if (mockEngine.visualizerTimerHandle) {
    clearInterval(mockEngine.visualizerTimerHandle);
    mockEngine.visualizerTimerHandle = null;
  }
  mockEngine.visualizerChannel = null;
  mockEngine.visualizerSequence = 0;
  mockEngine.state = {
    track_id: null,
    file_path: null,
    status: "stopped",
    position_seconds: 0,
    duration_seconds: 0,
    volume: 0.8,
    is_muted: false,
    context_title: null,
    context_type: null,
  };
  mockEngine.milestoneRecorded = false;
  mockEngine.lookahead = [];
  mockEngine.queueGeneration = 0;
  mockEngine.positionListeners.clear();
  mockEngine.stateChangedListeners.clear();
  mockEngine.trackEndedListeners.clear();
  mockEngine.trackChangedListeners.clear();
  mockEngine.trackSkippedListeners.clear();
  mockEngine.errorListeners.clear();
  mockEngine.historyListeners.clear();
}
