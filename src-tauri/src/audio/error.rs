//! Audio error types and serializable IPC errors.

use serde::Serialize;
use thiserror::Error;

use super::models::AudioErrorDto;

/// Enumeration of audio subsystem failures.
#[derive(Debug, Error)]
pub enum AudioError {
    #[error("Audio file not found: {0}")]
    FileNotFound(String),

    #[error("Unsupported audio format: {0}")]
    UnsupportedFormat(String),

    #[error("Audio decode failure: {0}")]
    DecodeError(String),

    #[error("Audio output device error: {0}")]
    DeviceError(String),

    #[error("Audio seek operation failed: {0}")]
    SeekFailed(String),

    #[error("No audio track is currently loaded")]
    NotLoaded,

    #[error("Playback is not currently active")]
    NotPlaying,

    #[error("Playback is not currently paused")]
    NotPaused,

    #[error("Invalid volume parameter: {0}")]
    InvalidVolume(String),

    #[error("Internal audio mutex lock error: {0}")]
    LockError(String),

    #[error("Underlying storage error: {0}")]
    StorageError(String),
}

impl AudioError {
    /// Returns the standardized uppercase machine error code string.
    pub fn code(&self) -> &'static str {
        match self {
            Self::FileNotFound(_) => "FILE_NOT_FOUND",
            Self::UnsupportedFormat(_) => "UNSUPPORTED_FORMAT",
            Self::DecodeError(_) => "DECODE_ERROR",
            Self::DeviceError(_) => "DEVICE_ERROR",
            Self::SeekFailed(_) => "SEEK_FAILED",
            Self::NotLoaded => "NOT_LOADED",
            Self::NotPlaying => "NOT_PLAYING",
            Self::NotPaused => "NOT_PAUSED",
            Self::InvalidVolume(_) => "INVALID_VOLUME",
            Self::LockError(_) => "LOCK_ERROR",
            Self::StorageError(_) => "STORAGE_ERROR",
        }
    }

    /// Converts the error into an AudioErrorDto.
    pub fn to_dto(&self, track_id: Option<String>) -> AudioErrorDto {
        AudioErrorDto {
            code: self.code().to_string(),
            message: self.to_string(),
            track_id,
        }
    }
}

impl Serialize for AudioError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AudioError", 2)?;
        s.serialize_field("code", self.code())?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}
