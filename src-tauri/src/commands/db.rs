//! Tauri IPC command handlers for local SQLite database operations.

use tauri::State;

use crate::db::{
    AlbumDetailDto, AlbumDto, ArtistDto, ArtistProfileDto, DatabaseError, DatabaseStatusDto,
    DbState, FolderDto, PaginatedTracksDto, PlaylistDetailDto, PlaylistDto, PlaylistInputDto,
    TrackDto, TrackFilterDto,
};

/// Queries database health, migration schema version, and record statistics.
#[tauri::command]
pub async fn db_get_status(state: State<'_, DbState>) -> Result<DatabaseStatusDto, DatabaseError> {
    state.get_status()
}

/// Retrieves all monitored local library music folders.
#[tauri::command]
pub async fn db_get_folders(state: State<'_, DbState>) -> Result<Vec<FolderDto>, DatabaseError> {
    state.get_folders()
}

/// Registers a new directory path for music monitoring.
#[tauri::command]
pub async fn db_add_folder(
    path: String,
    state: State<'_, DbState>,
) -> Result<FolderDto, DatabaseError> {
    state.add_folder(&path)
}

/// Deactivates and removes a monitored music directory.
#[tauri::command]
pub async fn db_remove_folder(
    id: String,
    state: State<'_, DbState>,
) -> Result<bool, DatabaseError> {
    state.remove_folder(&id)
}

/// Queries paginated tracks with optional filtering.
#[tauri::command]
pub async fn db_get_tracks(
    page: u32,
    limit: u32,
    filter: Option<TrackFilterDto>,
    state: State<'_, DbState>,
) -> Result<PaginatedTracksDto, DatabaseError> {
    state.get_tracks(page, limit, filter)
}

/// Retrieves single track metadata by id.
#[tauri::command]
pub async fn db_get_track_by_id(
    id: String,
    state: State<'_, DbState>,
) -> Result<Option<TrackDto>, DatabaseError> {
    state.get_track_by_id(&id)
}

/// Toggles user liked favorite state on a track.
#[tauri::command]
pub async fn db_toggle_track_favorite(
    id: String,
    state: State<'_, DbState>,
) -> Result<bool, DatabaseError> {
    state.toggle_track_favorite(&id)
}

/// Increments historical playback counter for a track.
#[tauri::command]
pub async fn db_increment_play_count(
    id: String,
    state: State<'_, DbState>,
) -> Result<u32, DatabaseError> {
    state.increment_play_count(&id)
}

/// Queries all indexed albums in alphabetical order.
#[tauri::command]
pub async fn db_get_albums(state: State<'_, DbState>) -> Result<Vec<AlbumDto>, DatabaseError> {
    state.get_albums()
}

/// Queries detailed album metadata and sequenced tracklist.
#[tauri::command]
pub async fn db_get_album_details(
    id: String,
    state: State<'_, DbState>,
) -> Result<Option<AlbumDetailDto>, DatabaseError> {
    state.get_album_details(&id)
}

/// Queries all recording artists.
#[tauri::command]
pub async fn db_get_artists(state: State<'_, DbState>) -> Result<Vec<ArtistDto>, DatabaseError> {
    state.get_artists()
}

/// Queries detailed artist profile with top tracks and albums.
#[tauri::command]
pub async fn db_get_artist_profile(
    id: String,
    state: State<'_, DbState>,
) -> Result<Option<ArtistProfileDto>, DatabaseError> {
    state.get_artist_profile(&id)
}

/// Queries all user created playlists.
#[tauri::command]
pub async fn db_get_playlists(
    state: State<'_, DbState>,
) -> Result<Vec<PlaylistDto>, DatabaseError> {
    state.get_playlists()
}

/// Queries playlist details and full ordered tracklist.
#[tauri::command]
pub async fn db_get_playlist_details(
    id: String,
    state: State<'_, DbState>,
) -> Result<Option<PlaylistDetailDto>, DatabaseError> {
    state.get_playlist_details(&id)
}

/// Creates a new user playlist with structured metadata.
#[tauri::command]
pub async fn db_create_playlist(
    payload: PlaylistInputDto,
    state: State<'_, DbState>,
) -> Result<PlaylistDto, DatabaseError> {
    state.create_playlist(&payload)
}

/// Updates playlist title, description, cover art, or gradient preset.
#[tauri::command]
pub async fn db_update_playlist(
    id: String,
    payload: PlaylistInputDto,
    state: State<'_, DbState>,
) -> Result<PlaylistDto, DatabaseError> {
    state.update_playlist(&id, &payload)
}

/// Deletes a playlist by identifier.
#[tauri::command]
pub async fn db_delete_playlist(
    id: String,
    state: State<'_, DbState>,
) -> Result<bool, DatabaseError> {
    state.delete_playlist(&id)
}

/// Appends tracks to a playlist sequentially.
#[tauri::command]
pub async fn db_add_tracks_to_playlist(
    playlist_id: String,
    track_ids: Vec<String>,
    state: State<'_, DbState>,
) -> Result<u32, DatabaseError> {
    state.add_tracks_to_playlist(&playlist_id, &track_ids)
}

/// Removes a track entry from a playlist by entry identifier.
#[tauri::command]
pub async fn db_remove_playlist_track(
    playlist_id: String,
    entry_id: String,
    state: State<'_, DbState>,
) -> Result<bool, DatabaseError> {
    state.remove_playlist_track(&playlist_id, &entry_id)
}

/// Reorders tracks within a playlist atomically using ordered entry identifiers.
#[tauri::command]
pub async fn db_reorder_playlist_tracks(
    playlist_id: String,
    ordered_entry_ids: Vec<String>,
    state: State<'_, DbState>,
) -> Result<bool, DatabaseError> {
    state.reorder_playlist_tracks(&playlist_id, &ordered_entry_ids)
}

/// Queries a stored player preference setting.
#[tauri::command]
pub async fn db_get_setting(
    key: String,
    state: State<'_, DbState>,
) -> Result<Option<String>, DatabaseError> {
    state.get_setting(&key)
}

/// Stores or updates an arbitrary player preference.
#[tauri::command]
pub async fn db_set_setting(
    key: String,
    value: String,
    state: State<'_, DbState>,
) -> Result<bool, DatabaseError> {
    state.set_setting(&key, &value)
}
