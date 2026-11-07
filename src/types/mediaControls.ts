/**
 * Types for operating system media controls and hardware transport events.
 */

export interface MediaMetadataDto {
  track_id: string;
  title: string;
  artist: string;
  album?: string;
  duration_seconds?: number;
}

export type MediaPlaybackStatusDto = "playing" | "paused" | "stopped";

export interface MediaControlActionEvent {
  action: string;
  position_seconds?: number;
}
