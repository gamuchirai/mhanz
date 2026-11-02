/**
 * DTO contracts and event definitions for audio file metadata tag editor.
 */

import type { AlbumDto, TrackDto } from "./database";

export interface ProbedAudioTagsDto {
  trackId: string;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string | null;
  genre: string | null;
  year: number | null;
  trackNumber: number | null;
  discNumber: number;
  duration: number;
  bitrate: number | null;
  format: string;
  hasEmbeddedCover: boolean;
  coverArtPath: string | null;
}

export type CoverArtAction =
  | { type: "keep" }
  | { type: "remove" }
  | { type: "replace_path"; sourceFilePath: string }
  | { type: "replace_bytes"; imageBytesBase64: string; mimeType: string };

export interface SaveTrackTagsDto {
  trackId: string;
  filePath?: string;
  title: string;
  artistName: string;
  albumName: string | null;
  albumArtist: string | null;
  genre: string | null;
  year: number | null;
  trackNumber: number | null;
  discNumber: number;
  coverArtAction: CoverArtAction;
}

export interface BatchTrackUpdates {
  artistName?: string;
  albumName?: string;
  albumArtist?: string | null;
  genre?: string | null;
  year?: number | null;
  discNumber?: number;
  coverArtAction?: CoverArtAction;
}

export interface SaveBatchTagsDto {
  albumId?: string;
  trackIds: string[];
  updates: BatchTrackUpdates;
}

export interface BatchItemErrorDto {
  trackId: string;
  filePath: string;
  error: string;
}

export interface BatchSaveResultDto {
  album?: AlbumDto;
  succeeded: TrackDto[];
  failed: BatchItemErrorDto[];
  totalUpdated: number;
}

export interface LibraryTracksUpdatedEvent {
  trackIds: string[];
  albumIds: string[];
}
