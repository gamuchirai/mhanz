//! Tauri IPC command handlers for native audio playback control.

use tauri::State;

use crate::audio::{AudioError, AudioPlaybackStateDto, AudioState};

/// Loads an audio file and initiates playback.
#[tauri::command]
pub async fn audio_play_track(
    track_id: String,
    file_path: String,
    start_position: Option<f64>,
    state: State<'_, AudioState>,
) -> Result<AudioPlaybackStateDto, AudioError> {
    state.0.play_track(track_id, file_path, start_position)
}

/// Pauses the active audio playback stream.
#[tauri::command]
pub async fn audio_pause(
    state: State<'_, AudioState>,
) -> Result<AudioPlaybackStateDto, AudioError> {
    state.0.pause()
}

/// Resumes paused audio playback.
#[tauri::command]
pub async fn audio_resume(
    state: State<'_, AudioState>,
) -> Result<AudioPlaybackStateDto, AudioError> {
    state.0.resume()
}

/// Halts audio playback and resets the playback clock to zero.
#[tauri::command]
pub async fn audio_stop(
    state: State<'_, AudioState>,
) -> Result<AudioPlaybackStateDto, AudioError> {
    state.0.stop()
}

/// Seeks playback to a specified timestamp in seconds.
#[tauri::command]
pub async fn audio_seek(
    position_seconds: f64,
    state: State<'_, AudioState>,
) -> Result<AudioPlaybackStateDto, AudioError> {
    state.0.seek(position_seconds)
}

/// Adjusts playback volume output gain (0.0 to 1.0).
#[tauri::command]
pub async fn audio_set_volume(
    volume: f32,
    state: State<'_, AudioState>,
) -> Result<(), AudioError> {
    state.0.set_volume(volume)
}

/// Toggles or sets the audio output mute flag.
#[tauri::command]
pub async fn audio_set_muted(
    muted: bool,
    state: State<'_, AudioState>,
) -> Result<(), AudioError> {
    state.0.set_muted(muted)
}

/// Retrieves the current audio playback state snapshot.
#[tauri::command]
pub async fn audio_get_state(
    state: State<'_, AudioState>,
) -> Result<AudioPlaybackStateDto, AudioError> {
    state.0.get_state()
}
