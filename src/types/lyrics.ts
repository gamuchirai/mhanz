/**
 * TypeScript types and DTO contracts for synchronized and plain text lyrics.
 */

/**
 * Synchronized lyric line representation matching backend camelCase serialization.
 */
export interface LyricLineDto {
  /**
   * Deterministic identifier for the line (e.g. "{trackId}-l{index}").
   */
  id: string;
  /**
   * Timing offset in floating point seconds from track beginning.
   */
  timeSeconds: number;
  /**
   * Cleaned lyric text content for this line.
   */
  text: string;
}

/**
 * Track lyrics payload delivered via Tauri IPC.
 */
export interface TrackLyricsDto {
  /**
   * Associated audio track unique identifier.
   */
  trackId: string;
  /**
   * Whether lyrics content exists for this track.
   */
  hasLyrics: boolean;
  /**
   * Whether synchronized timestamps are available.
   */
  isSynced: boolean;
  /**
   * Chronologically ordered list of synchronized lyric lines.
   */
  lines: LyricLineDto[];
  /**
   * Optional plain text representation of lyrics.
   */
  plainText?: string | null;
  /**
   * Source type: "lrc", "embedded", or "none".
   */
  sourceType: string;
  /**
   * User configured timing offset in milliseconds (positive advances, negative delays).
   */
  userOffsetMs: number;
}
