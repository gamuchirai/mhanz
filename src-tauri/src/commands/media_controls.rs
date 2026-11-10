//! IPC commands for operating system media controls and transport synchronization.

use tauri::State;

use crate::media_controls::{MediaControlsState, MediaMetadataDto, MediaPlaybackStatusDto};

/// Updates Windows SMTC with active track metadata and artwork.
#[tauri::command]
pub fn media_controls_set_metadata(
    state: State<'_, MediaControlsState>,
    metadata: MediaMetadataDto,
) -> Result<(), String> {
    state.set_metadata(metadata)
}

/// Updates Windows SMTC with playback status and progress position.
#[tauri::command]
pub fn media_controls_set_playback_status(
    state: State<'_, MediaControlsState>,
    status: MediaPlaybackStatusDto,
    position_seconds: Option<f64>,
) -> Result<(), String> {
    state.set_playback_status(status, position_seconds)
}

/// Toggles operating system media controls on or off based on user preferences.
#[tauri::command]
pub fn media_controls_set_enabled(
    state: State<'_, MediaControlsState>,
    enabled: bool,
) -> Result<(), String> {
    state.set_enabled(enabled)
}

/// Clears operating system media controls when playback stops or queue clears.
#[tauri::command]
pub fn media_controls_clear(state: State<'_, MediaControlsState>) -> Result<(), String> {
    state.clear()
}
