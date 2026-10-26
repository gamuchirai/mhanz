/**
 * Database client service bridging React components and Zustand stores
 * to the local SQLite database via Tauri IPC commands.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  AlbumDetailDto,
  AlbumDto,
  ArtistDto,
  ArtistProfileDto,
  DatabaseStatusDto,
  FolderDto,
  PaginatedTracksDto,
  PlaylistDetailDto,
  PlaylistDto,
  PlaylistInputDto,
  TrackDto,
  TrackFilterDto,
} from "../types/database";

/**
 * Queries database connection status, schema version, and total record counts.
 */
export async function dbGetStatus(): Promise<DatabaseStatusDto> {
  return invoke<DatabaseStatusDto>("db_get_status");
}

/**
 * Retrieves all monitored local music folders.
 */
export async function dbGetFolders(): Promise<FolderDto[]> {
  return invoke<FolderDto[]>("db_get_folders");
}

/**
 * Registers a new local directory path for library monitoring.
 */
export async function dbAddFolder(path: string): Promise<FolderDto> {
  return invoke<FolderDto>("db_add_folder", { path });
}

/**
 * Deactivates or removes a monitored folder by identifier.
 */
export async function dbRemoveFolder(id: string): Promise<boolean> {
  return invoke<boolean>("db_remove_folder", { id });
}

/**
 * Queries paginated tracks with optional folder, artist, album, genre, or search filters.
 */
export async function dbGetTracks(
  page = 0,
  limit = 50,
  filter?: TrackFilterDto
): Promise<PaginatedTracksDto> {
  return invoke<PaginatedTracksDto>("db_get_tracks", { page, limit, filter });
}

/**
 * Retrieves a single track by its primary key identifier.
 */
export async function dbGetTrackById(id: string): Promise<TrackDto | null> {
  return invoke<TrackDto | null>("db_get_track_by_id", { id });
}

/**
 * Toggles favorite liked status on a track.
 */
export async function dbToggleTrackFavorite(id: string): Promise<boolean> {
  return invoke<boolean>("db_toggle_track_favorite", { id });
}

/**
 * Increments the historical playback counter and updates last played timestamp.
 */
export async function dbIncrementPlayCount(id: string): Promise<number> {
  return invoke<number>("db_increment_play_count", { id });
}

/**
 * Queries all indexed albums in alphabetical order.
 */
export async function dbGetAlbums(): Promise<AlbumDto[]> {
  return invoke<AlbumDto[]>("db_get_albums");
}

/**
 * Retrieves detailed album metadata and full sequential tracklist.
 */
export async function dbGetAlbumDetails(id: string): Promise<AlbumDetailDto | null> {
  return invoke<AlbumDetailDto | null>("db_get_album_details", { id });
}

/**
 * Queries all recording artists in alphabetical order.
 */
export async function dbGetArtists(): Promise<ArtistDto[]> {
  return invoke<ArtistDto[]>("db_get_artists");
}

/**
 * Retrieves artist profile including top played songs and discography albums.
 */
export async function dbGetArtistProfile(id: string): Promise<ArtistProfileDto | null> {
  return invoke<ArtistProfileDto | null>("db_get_artist_profile", { id });
}

/**
 * Queries all user created playlists.
 */
export async function dbGetPlaylists(): Promise<PlaylistDto[]> {
  return invoke<PlaylistDto[]>("db_get_playlists");
}

/**
 * Retrieves full playlist detail and ordered tracklist.
 */
export async function dbGetPlaylistDetails(id: string): Promise<PlaylistDetailDto | null> {
  return invoke<PlaylistDetailDto | null>("db_get_playlist_details", { id });
}

/**
 * Creates a new user playlist with structured metadata.
 */
export async function dbCreatePlaylist(
  input: PlaylistInputDto | string,
  legacyDescription?: string
): Promise<PlaylistDto> {
  const payload: PlaylistInputDto =
    typeof input === "string" ? { name: input, description: legacyDescription } : input;
  return invoke<PlaylistDto>("db_create_playlist", { payload });
}

/**
 * Updates playlist title, description, cover art, or gradient preset.
 */
export async function dbUpdatePlaylist(
  id: string,
  input: PlaylistInputDto | string,
  legacyDescription?: string
): Promise<PlaylistDto> {
  const payload: PlaylistInputDto =
    typeof input === "string" ? { name: input, description: legacyDescription } : input;
  return invoke<PlaylistDto>("db_update_playlist", { id, payload });
}

/**
 * Deletes a playlist and cascades deletion of track association entries.
 */
export async function dbDeletePlaylist(id: string): Promise<boolean> {
  return invoke<boolean>("db_delete_playlist", { id });
}

/**
 * Appends track identifiers to the end of a playlist.
 */
export async function dbAddTracksToPlaylist(
  playlistId: string,
  trackIds: string[]
): Promise<number> {
  return invoke<number>("db_add_tracks_to_playlist", {
    playlistId,
    trackIds,
  });
}

/**
 * Removes a track entry from a playlist by its unique entry identifier.
 */
export async function dbRemovePlaylistTrack(playlistId: string, entryId: string): Promise<boolean> {
  return invoke<boolean>("db_remove_playlist_track", {
    playlistId,
    entryId,
  });
}

/**
 * Reorders tracks within a playlist atomically using ordered entry identifiers.
 */
export async function dbReorderPlaylistTracks(
  playlistId: string,
  orderedEntryIds: string[]
): Promise<boolean> {
  return invoke<boolean>("db_reorder_playlist_tracks", {
    playlistId,
    orderedEntryIds,
  });
}

/**
 * Retrieves an arbitrary stored preference setting by key.
 */
export async function dbGetSetting(key: string): Promise<string | null> {
  return invoke<string | null>("db_get_setting", { key });
}

/**
 * Persists an arbitrary player preference string value.
 */
export async function dbSetSetting(key: string, value: string): Promise<boolean> {
  return invoke<boolean>("db_set_setting", { key, value });
}
