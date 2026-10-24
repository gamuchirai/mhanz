//! Structured error handling for database operations and Tauri IPC serialization.

use serde::{Deserialize, Serialize};

/// Strongly typed database error returned across Tauri IPC.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DatabaseError {
    /// Machine readable error code string.
    pub code: String,
    /// Human readable error explanation.
    pub message: String,
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}]: {}", self.code, self.message)
    }
}

impl std::error::Error for DatabaseError {}

impl DatabaseError {
    /// Creates a new DatabaseError with an explicit code and message.
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    /// Database is uninitialized or connection unavailable.
    pub fn not_initialized(msg: impl Into<String>) -> Self {
        Self::new("DB_NOT_INITIALIZED", msg)
    }

    /// Query execution failure.
    pub fn query_failed(msg: impl Into<String>) -> Self {
        Self::new("DB_QUERY_FAILED", msg)
    }

    /// Write or mutation failure.
    pub fn write_failed(msg: impl Into<String>) -> Self {
        Self::new("DB_WRITE_FAILED", msg)
    }

    /// Monitored folder already registered.
    pub fn folder_already_exists(msg: impl Into<String>) -> Self {
        Self::new("FOLDER_ALREADY_EXISTS", msg)
    }

    /// Monitored folder path does not exist or is invalid.
    pub fn invalid_path(msg: impl Into<String>) -> Self {
        Self::new("INVALID_PATH", msg)
    }

    /// Monitored folder not found.
    pub fn folder_not_found(msg: impl Into<String>) -> Self {
        Self::new("FOLDER_NOT_FOUND", msg)
    }

    /// Track identifier not found.
    pub fn track_not_found(msg: impl Into<String>) -> Self {
        Self::new("TRACK_NOT_FOUND", msg)
    }

    /// Playlist identifier not found.
    pub fn playlist_not_found(msg: impl Into<String>) -> Self {
        Self::new("PLAYLIST_NOT_FOUND", msg)
    }

    /// Item in playlist or collection not found.
    pub fn item_not_found(msg: impl Into<String>) -> Self {
        Self::new("ITEM_NOT_FOUND", msg)
    }

    /// Provided name or field is invalid.
    pub fn invalid_name(msg: impl Into<String>) -> Self {
        Self::new("INVALID_NAME", msg)
    }

    /// Schema migration failed.
    pub fn migration_failed(msg: impl Into<String>) -> Self {
        Self::new("MIGRATION_FAILED", msg)
    }
}

impl From<rusqlite::Error> for DatabaseError {
    fn from(err: rusqlite::Error) -> Self {
        Self::query_failed(err.to_string())
    }
}
