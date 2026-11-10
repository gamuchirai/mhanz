//! Data transfer objects for operating system media controls and transport events.

use serde::{Deserialize, Serialize};

/// Payload sent from frontend player store to update operating system media display.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaMetadataDto {
    pub track_id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration_seconds: Option<f64>,
}

/// Playback status synchronization payload.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaPlaybackStatusDto {
    Playing,
    Paused,
    Stopped,
}

/// Transport action event emitted to the frontend when hardware media keys or
/// operating system flyout controls are clicked.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaControlActionEvent {
    pub action: String,
    pub position_seconds: Option<f64>,
}
