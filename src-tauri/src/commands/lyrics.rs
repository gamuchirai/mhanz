//! Tauri IPC command handlers for track lyrics extraction, caching, and timing adjustments.

use tauri::State;

use crate::db::{DatabaseError, DbState, TrackLyricsDto};
use crate::lyrics;

/// Retrieves cached lyrics or extracts them on demand for a specified track.
#[tauri::command]
pub async fn lyrics_get_for_track(
    track_id: String,
    state: State<'_, DbState>,
) -> Result<TrackLyricsDto, DatabaseError> {
    state
        .0
        .with_conn(|conn| lyrics::get_or_extract_lyrics(conn, &track_id, false))
}

/// Updates the user timing offset in milliseconds for a specified track.
#[tauri::command]
pub async fn lyrics_set_user_offset(
    track_id: String,
    offset_ms: i32,
    state: State<'_, DbState>,
) -> Result<(), DatabaseError> {
    state
        .0
        .with_conn(|conn| crate::db::lyrics_repo::update_user_offset(conn, &track_id, offset_ms))
}

/// Forces a fresh re-scan of companion lrc or embedded tags on disk for a specified track.
#[tauri::command]
pub async fn lyrics_rescan_for_track(
    track_id: String,
    state: State<'_, DbState>,
) -> Result<TrackLyricsDto, DatabaseError> {
    state
        .0
        .with_conn(|conn| lyrics::get_or_extract_lyrics(conn, &track_id, true))
}
