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

export interface AudioEngineListeners {
  onPosition?: (pos: AudioPositionDto) => void;
  onStateChanged?: (state: AudioPlaybackStateDto) => void;
  onTrackEnded?: (event: AudioTrackEndedDto) => void;
  onError?: (error: AudioErrorDto) => void;
}
