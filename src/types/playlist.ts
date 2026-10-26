/**
 * Playlist domain and state types for playlist management, curation, and track sequencing.
 */

import type { Track } from "./discovery";

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverGradient: string;
  coverUrl?: string;
  isCurated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrackEntry {
  entryId: string;
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
}

export interface HydratedPlaylistTrack {
  entry: PlaylistTrackEntry;
  track: Track;
}

export interface PlaylistCreateInput {
  title: string;
  description?: string;
  coverGradient?: string;
  coverUrl?: string;
}

export interface PlaylistUpdateInput {
  title?: string;
  description?: string;
  coverGradient?: string;
  coverUrl?: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  gradient: string;
}
