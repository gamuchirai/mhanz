/**
 * Tag editor client service bridging React components and Zustand stores
 * to native Rust tag probing, Lofty file writing, and SQLite synchronization
 * via Tauri IPC commands and event channels.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { TrackDto } from "../types/database";
import type {
  BatchSaveResultDto,
  LibraryTracksUpdatedEvent,
  ProbedAudioTagsDto,
  SaveBatchTagsDto,
  SaveTrackTagsDto,
} from "../types/tagger";
import { initialLibraryTracks } from "../data/libraryFixtures";

// In memory fallback store for tests and mock environments
const mockTagsCache = new Map<string, ProbedAudioTagsDto>();

function createMockProbedTags(trackId: string, filePath?: string): ProbedAudioTagsDto {
  const existing = mockTagsCache.get(trackId);
  if (existing) {
    return existing;
  }

  const fixture = initialLibraryTracks.find((t) => t.id === trackId);
  const derivedTitle = fixture?.title ?? "Sample Track";
  const derivedArtist = fixture?.artist ?? "Sample Artist";
  const derivedAlbum = fixture?.album ?? "Sample Album";
  const path = filePath || fixture?.filePath || `C:\\Music\\${derivedArtist}\\${derivedAlbum}\\${derivedTitle}.mp3`;

  const probed: ProbedAudioTagsDto = {
    trackId,
    filePath: path,
    title: derivedTitle,
    artist: derivedArtist,
    album: derivedAlbum,
    albumArtist: derivedArtist,
    genre: fixture?.genre ?? "Electronic",
    year: 2024,
    trackNumber: 1,
    discNumber: 1,
    duration: fixture?.durationSeconds ?? 215,
    bitrate: fixture?.bitrate ?? 320,
    format: "mp3",
    hasEmbeddedCover: Boolean(fixture?.artworkUrl),
    coverArtPath: fixture?.artworkUrl ?? null,
  };

  mockTagsCache.set(trackId, probed);
  return probed;
}

/**
 * Probes the physical audio file on disk via Lofty and returns fresh tags.
 */
export async function tagEditorProbeFile(
  trackId: string,
  filePath?: string,
): Promise<ProbedAudioTagsDto> {
  if (isTauri()) {
    return invoke<ProbedAudioTagsDto>("tag_editor_probe_file", {
      trackId,
      filePath: filePath ?? null,
    });
  }

  return createMockProbedTags(trackId, filePath);
}

/**
 * Saves modified audio tags to the physical file and synchronizes SQLite.
 */
export async function tagEditorSaveTrack(
  payload: SaveTrackTagsDto,
): Promise<TrackDto> {
  if (isTauri()) {
    return invoke<TrackDto>("tag_editor_save_track", { payload });
  }

  const now = Math.floor(Date.now() / 1000);
  const existing = createMockProbedTags(payload.trackId, payload.filePath);

  let coverPath = existing.coverArtPath;
  if (payload.coverArtAction.type === "remove") {
    coverPath = null;
  } else if (payload.coverArtAction.type === "replace_path") {
    coverPath = payload.coverArtAction.sourceFilePath;
  } else if (payload.coverArtAction.type === "replace_bytes") {
    coverPath = `covers/mock_${payload.trackId}_${now}.jpg`;
  }

  const updatedProbed: ProbedAudioTagsDto = {
    ...existing,
    title: payload.title,
    artist: payload.artistName,
    album: payload.albumName || "Unknown Album",
    albumArtist: payload.albumArtist,
    genre: payload.genre,
    year: payload.year,
    trackNumber: payload.trackNumber,
    discNumber: payload.discNumber,
    hasEmbeddedCover: Boolean(coverPath),
    coverArtPath: coverPath,
  };
  mockTagsCache.set(payload.trackId, updatedProbed);

  const updatedTrack: TrackDto = {
    id: payload.trackId,
    file_path: payload.filePath || existing.filePath,
    title: payload.title,
    artist_id: "artist-mock",
    artist_name: payload.artistName,
    album_id: "album-mock",
    album_name: payload.albumName,
    album_artist: payload.albumArtist,
    duration: existing.duration,
    year: payload.year,
    genre: payload.genre,
    disc_number: payload.discNumber,
    track_number: payload.trackNumber,
    bitrate: existing.bitrate,
    format: existing.format,
    cover_art_path: coverPath,
    is_favorite: false,
    liked_at: null,
    play_count: 0,
    last_played_at: null,
    file_modified_at: now,
    file_size_bytes: 4096000,
    folder_id: "folder-mock",
    created_at: now,
    updated_at: now,
  };

  return updatedTrack;
}

/**
 * Saves batch audio tags across multiple tracks and preserves album metadata in place.
 */
export async function tagEditorSaveBatch(
  payload: SaveBatchTagsDto,
): Promise<BatchSaveResultDto> {
  if (isTauri()) {
    return invoke<BatchSaveResultDto>("tag_editor_save_batch", { payload });
  }

  const succeeded: TrackDto[] = [];
  for (const trackId of payload.trackIds) {
    const existing = createMockProbedTags(trackId);

    const updated = await tagEditorSaveTrack({
      trackId,
      filePath: existing.filePath,
      title: existing.title,
      artistName: payload.updates.artistName ?? existing.artist,
      albumName: payload.updates.albumName !== undefined ? payload.updates.albumName : existing.album,
      albumArtist: payload.updates.albumArtist !== undefined ? payload.updates.albumArtist : existing.albumArtist,
      genre: payload.updates.genre !== undefined ? payload.updates.genre : existing.genre,
      year: payload.updates.year !== undefined ? payload.updates.year : existing.year,
      trackNumber: existing.trackNumber,
      discNumber: payload.updates.discNumber ?? existing.discNumber,
      coverArtAction: payload.updates.coverArtAction ?? { type: "keep" },
    });
    succeeded.push(updated);
  }

  return {
    succeeded,
    failed: [],
    totalUpdated: succeeded.length,
  };
}

/**
 * Subscribes to the library:tracks-updated Tauri event.
 */
export async function onLibraryTracksUpdated(
  callback: (event: LibraryTracksUpdatedEvent) => void,
): Promise<UnlistenFn> {
  if (isTauri()) {
    return listen<LibraryTracksUpdatedEvent>("library:tracks-updated", (event) => {
      callback(event.payload);
    });
  }

  return () => {};
}
