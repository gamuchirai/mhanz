//! Audio domain models and data transfer objects for playback state and events.

use serde::{Deserialize, Serialize};

/// Playback status lifecycle states.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum PlaybackStatus {
    #[default]
    Stopped,
    Loading,
    Playing,
    Paused,
}

/// In memory runtime audio playback state tracking active track and output settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioPlaybackState {
    pub track_id: Option<String>,
    pub file_path: Option<String>,
    pub status: PlaybackStatus,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub volume: f32,
    pub is_muted: bool,
    pub session_id: u64,
    pub play_count_recorded: bool,
}

impl Default for AudioPlaybackState {
    fn default() -> Self {
        Self {
            track_id: None,
            file_path: None,
            status: PlaybackStatus::Stopped,
            position_seconds: 0.0,
            duration_seconds: 0.0,
            volume: 0.8,
            is_muted: false,
            session_id: 0,
            play_count_recorded: false,
        }
    }
}

/// Data transfer object emitted to frontend when audio state transitions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AudioPlaybackStateDto {
    pub track_id: Option<String>,
    pub file_path: Option<String>,
    pub status: PlaybackStatus,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub volume: f32,
    pub is_muted: bool,
}

impl From<&AudioPlaybackState> for AudioPlaybackStateDto {
    fn from(state: &AudioPlaybackState) -> Self {
        Self {
            track_id: state.track_id.clone(),
            file_path: state.file_path.clone(),
            status: state.status,
            position_seconds: state.position_seconds,
            duration_seconds: state.duration_seconds,
            volume: state.volume,
            is_muted: state.is_muted,
        }
    }
}

/// High resolution position event payload emitted periodically during playback.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AudioPositionDto {
    pub track_id: String,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub is_playing: bool,
}

/// Track completion event payload emitted when playback finishes naturally.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AudioTrackEndedDto {
    pub track_id: String,
    pub completed: bool,
}

/// Structured error payload emitted when audio loading, decoding, or devices fail.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AudioErrorDto {
    pub code: String,
    pub message: String,
    pub track_id: Option<String>,
}
