/**
 * Audio service bridging the frontend player store and UI components
 * to the native Rodio audio engine via Tauri IPC and events,
 * with a high-fidelity browser/test mock fallback.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AudioErrorDto,
  AudioPlaybackStateDto,
  AudioPositionDto,
  AudioTrackEndedDto,
} from "../types/audio";

// Internal listeners for mock mode or broadcast
type PositionListener = (pos: AudioPositionDto) => void;
type StateChangedListener = (state: AudioPlaybackStateDto) => void;
type TrackEndedListener = (event: AudioTrackEndedDto) => void;
type ErrorListener = (error: AudioErrorDto) => void;

interface MockEngineState {
  state: AudioPlaybackStateDto;
  timerHandle: ReturnType<typeof setInterval> | null;
  forceMock: boolean;
  positionListeners: Set<PositionListener>;
  stateChangedListeners: Set<StateChangedListener>;
  trackEndedListeners: Set<TrackEndedListener>;
  errorListeners: Set<ErrorListener>;
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
  },
  timerHandle: null,
  forceMock: false,
  positionListeners: new Set(),
  stateChangedListeners: new Set(),
  trackEndedListeners: new Set(),
  errorListeners: new Set(),
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

    if (dur > 0 && nextPos >= dur) {
      // Track ended
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

function notifyError(payload: AudioErrorDto): void {
  mockEngine.errorListeners.forEach((fn) => fn(payload));
}

/**
 * Plays a local audio file by track identifier and canonical file path.
 */
export async function audioPlayTrack(
  trackId: string,
  filePath: string,
  startPosition?: number,
  durationHint?: number
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
    const duration = Math.max(0, durationHint ?? 180.0);

    mockEngine.state = {
      ...mockEngine.state,
      track_id: trackId,
      file_path: filePath,
      status: "playing",
      position_seconds: startPos,
      duration_seconds: duration,
    };

    notifyStateChanged({ ...mockEngine.state });
    startMockTimer();
    return { ...mockEngine.state };
  }

  return invoke<AudioPlaybackStateDto>("audio_play_track", {
    trackId,
    filePath,
    startPosition: startPosition ?? null,
  });
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
 * Helper to reset mock state for clean test assertions.
 */
export function resetAudioMock(): void {
  stopMockTimer();
  mockEngine.state = {
    track_id: null,
    file_path: null,
    status: "stopped",
    position_seconds: 0,
    duration_seconds: 0,
    volume: 0.8,
    is_muted: false,
  };
  mockEngine.positionListeners.clear();
  mockEngine.stateChangedListeners.clear();
  mockEngine.trackEndedListeners.clear();
  mockEngine.errorListeners.clear();
}
