//! DTO models and payloads for audio tag probing and physical disk writing.

use serde::{Deserialize, Serialize};

use crate::db::models::{AlbumDto, TrackDto};

/// Probed physical audio tags returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbedAudioTagsDto {
    pub track_id: String,
    pub file_path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub track_number: Option<i32>,
    pub disc_number: i32,
    pub duration: f64,
    pub bitrate: Option<i32>,
    pub format: String,
    pub has_embedded_cover: bool,
    pub cover_art_path: Option<String>,
}

/// Cover art modification instructions.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CoverArtAction {
    Keep,
    Remove,
    ReplacePath {
        #[serde(rename = "sourceFilePath")]
        source_file_path: String,
    },
    ReplaceBytes {
        #[serde(rename = "imageBytesBase64")]
        image_bytes_base64: String,
        #[serde(rename = "mimeType")]
        mime_type: String,
    },
}

impl Default for CoverArtAction {
    fn default() -> Self {
        CoverArtAction::Keep
    }
}

/// Payload for saving single track tag modifications.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTrackTagsDto {
    pub track_id: String,
    pub file_path: Option<String>,
    pub title: String,
    pub artist_name: String,
    pub album_name: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub track_number: Option<i32>,
    pub disc_number: i32,
    pub cover_art_action: CoverArtAction,
}

/// Partial updates dictionary for batch track tag editing.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTrackUpdates {
    pub artist_name: Option<String>,
    pub album_name: Option<String>,
    pub album_artist: Option<String>,
    pub genre: Option<String>,
    pub year: Option<i32>,
    pub disc_number: Option<i32>,
    pub cover_art_action: Option<CoverArtAction>,
}

/// Payload for batch updating multiple audio tracks.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveBatchTagsDto {
    pub album_id: Option<String>,
    pub track_ids: Vec<String>,
    pub updates: BatchTrackUpdates,
}

/// Individual error recorded during batch processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchItemErrorDto {
    pub track_id: String,
    pub file_path: String,
    pub error: String,
}

/// Aggregated result returned after batch save operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveResultDto {
    pub album: Option<AlbumDto>,
    pub succeeded: Vec<TrackDto>,
    pub failed: Vec<BatchItemErrorDto>,
    pub total_updated: usize,
}

/// Tauri event payload emitted when track metadata changes.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTracksUpdatedEvent {
    pub track_ids: Vec<String>,
    pub album_ids: Vec<String>,
}
