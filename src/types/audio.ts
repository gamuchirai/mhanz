/**
 * Audio playback domain types and DTOs bridging native Rodio audio engine
 * events and IPC command structures.
 */

export type PlaybackStatus = "stopped" | "loading" | "playing" | "paused";

export interface AudioPlaybackStateDto {
  track_id: string | null;
  file_path: string | null;
  status: PlaybackStatus;
  position_seconds: number;
  duration_seconds: number;
  volume: number;
  is_muted: boolean;
  context_title?: string | null;
  context_type?: string | null;
}

export interface AudioPositionDto {
  track_id: string;
  position_seconds: number;
  duration_seconds: number;
  is_playing: boolean;
}

export interface AudioTrackEndedDto {
  track_id: string;
  completed: boolean;
}

export interface AudioErrorDto {
  code: string;
  message: string;
  track_id?: string | null;
}

export interface NextTrackCandidate {
  track_id: string;
  file_path: string;
}

export interface AudioTrackChangedDto {
  track_id: string;
  duration_seconds: number;
  queue_generation: number;
}

export interface AudioTrackSkippedDto {
  failed_track_id: string;
  reason_code: string;
  following_track_id?: string | null;
}

export interface AudioEngineListeners {
  onPosition?: (pos: AudioPositionDto) => void;
  onStateChanged?: (state: AudioPlaybackStateDto) => void;
  onTrackEnded?: (event: AudioTrackEndedDto) => void;
  onTrackChanged?: (event: AudioTrackChangedDto) => void;
  onTrackSkipped?: (event: AudioTrackSkippedDto) => void;
  onError?: (error: AudioErrorDto) => void;
}

/**
 * A single spectrum analysis frame streamed from the native engine.
 * Contains 32 normalized mono frequency bands (0.0 to 1.0).
 */
export interface SpectrumFrame {
  /** Active track identifier this frame belongs to. */
  track_id: string;
  /** Monotonic timestamp in milliseconds from engine start. */
  timestamp_ms: number;
  /** Engine-wide frame counter; UI rejects frames with sequence not greater than the last accepted. */
  sequence: number;
  /** 32 normalized frequency band magnitudes, each clamped to 0.0–1.0. */
  bands: number[];
}

/** Visualizer stream health state. */
export type VisualizerStreamState = "starting" | "active" | "unavailable";
