/**
 * Lyrics client service bridging React components and Zustand stores
 * to local file lyrics parsing and SQLite persistence via Tauri IPC commands.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";
import type { TrackLyricsDto } from "../types/lyrics";
import { getLyricsForTrack } from "../data/mockLyrics";

/**
 * Retrieves cached lyrics or triggers on demand local file parsing for a track.
 */
export async function lyricsGetForTrack(
  trackId: string,
  title?: string,
  artist?: string,
): Promise<TrackLyricsDto> {
  if (!isTauri()) {
    const mock = getLyricsForTrack(trackId, title, artist);
    const hasLyrics = (mock.lines && mock.lines.length > 0) || Boolean(mock.plainText && mock.plainText.trim().length > 0);
    return {
      trackId: mock.trackId,
      hasLyrics,
      isSynced: mock.isSynced,
      lines: mock.lines.map((l) => ({
        id: l.id,
        timeSeconds: l.timeSeconds,
        text: l.text,
      })),
      plainText: mock.plainText ?? null,
      sourceType: mock.source ?? "mock",
      userOffsetMs: 0,
    };
  }

  try {
    return await invoke<TrackLyricsDto>("lyrics_get_for_track", { trackId });
  } catch (err) {
    console.error(`Failed to fetch lyrics for track ${trackId}:`, err);
    return {
      trackId,
      hasLyrics: false,
      isSynced: false,
      lines: [],
      plainText: null,
      sourceType: "none",
      userOffsetMs: 0,
    };
  }
}

/**
 * Persists the user configured timing offset in milliseconds to SQLite.
 */
export async function lyricsSetUserOffset(trackId: string, offsetMs: number): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke<void>("lyrics_set_user_offset", { trackId, offsetMs });
  } catch (err) {
    console.error(`Failed to set lyrics user offset for track ${trackId}:`, err);
    throw err;
  }
}

/**
 * Forces a re parse of companion lrc or embedded tags on disk for a track.
 */
export async function lyricsRescanForTrack(
  trackId: string,
  title?: string,
  artist?: string,
): Promise<TrackLyricsDto> {
  if (!isTauri()) {
    return lyricsGetForTrack(trackId, title, artist);
  }

  try {
    return await invoke<TrackLyricsDto>("lyrics_rescan_for_track", { trackId });
  } catch (err) {
    console.error(`Failed to rescan lyrics for track ${trackId}:`, err);
    throw err;
  }
}
