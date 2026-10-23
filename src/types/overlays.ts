import type { Track } from "./discovery";

/**
 * Queue item entity representing an instance of a track in the playback queue.
 */
export interface QueueItem {
  id: string;
  trackId: string;
  track: Track;
  addedAt: number;
  sourceContext?: string;
  isManuallyQueued: boolean;
}

/**
 * Single line of timestamped lyric data.
 */
export interface LyricLine {
  id: string;
  timeSeconds: number;
  text: string;
}

/**
 * Synchronised or plain text lyric payload for a track.
 */
export interface TrackLyrics {
  trackId: string;
  isSynced: boolean;
  lines: LyricLine[];
  plainText?: string;
  source?: string;
}

/**
 * Audio output device entity.
 */
export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  sampleRate: number;
  channels: number;
}

/**
 * Audio visualizer style options.
 */
export type VisualizerStyle = "bars" | "wave" | "glow" | "off";

/**
 * Persistent user preferences for audio playback and overlays.
 */
export interface UserSettings {
  id: string;
  outputDeviceId: string;
  volumeNormalization: boolean;
  crossfadeSeconds: number;
  visualizerStyle: VisualizerStyle;
  notificationsEnabled: boolean;
  lyricsFontSize: "small" | "medium" | "large";
  updatedAt: number;
}

/**
 * Active application overlay modal or drawer view.
 */
export type OverlayType = "none" | "queue" | "lyrics" | "settings";
