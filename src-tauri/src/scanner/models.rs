//! Domain models, DTOs, and event payloads for library scanning.

use serde::{Deserialize, Serialize};

/// High level scan phase.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScanPhase {
    Idle,
    Discovering,
    Parsing,
    Committing,
    Pruning,
}

impl ScanPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::Discovering => "discovering",
            Self::Parsing => "parsing",
            Self::Committing => "committing",
            Self::Pruning => "pruning",
        }
    }
}

/// Returned when a background scan job successfully starts.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScanJobStartDto {
    pub folder_id: String,
    pub status: String,
    pub started_at: i64,
}

/// Current status of the scanner coordinator.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveScanStatusDto {
    pub is_scanning: bool,
    pub active_folder_id: Option<String>,
    pub phase: String,
    pub scanned_files: usize,
    pub total_files: usize,
    pub current_file: Option<String>,
    pub started_at: Option<i64>,
}

/// Throttled progress payload emitted via Tauri event `library://scan-progress`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgressPayload {
    pub folder_id: String,
    pub phase: String,
    pub scanned_files: usize,
    pub total_files: usize,
    pub new_tracks: usize,
    pub updated_tracks: usize,
    pub removed_tracks: usize,
    pub current_file: String,
    pub elapsed_ms: u64,
}

/// Error item logged during scanning.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScanErrorItem {
    pub file_path: String,
    pub message: String,
}

/// Final summary payload emitted via Tauri event `library://scan-completed`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScanCompletedPayload {
    pub folder_id: String,
    pub total_scanned: usize,
    pub new_tracks: usize,
    pub updated_tracks: usize,
    pub removed_tracks: usize,
    pub elapsed_ms: u64,
    pub errors: Vec<ScanErrorItem>,
}

/// Internal extracted track metadata ready for persistence.
#[derive(Debug, Clone)]
pub struct ScannedTrackData {
    pub file_path: String,
    pub title: String,
    pub artist_name: String,
    pub album_title: String,
    pub album_artist: Option<String>,
    pub duration: f64,
    pub year: Option<i32>,
    pub genre: Option<String>,
    pub disc_number: i32,
    pub track_number: Option<i32>,
    pub bitrate: Option<i32>,
    pub format: String,
    pub cover_art_path: Option<String>,
    pub file_modified_at: i64,
    pub file_size_bytes: i64,
    pub folder_id: String,
}
