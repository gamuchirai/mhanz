//! Unit tests for media controls manager and data models.

use std::fs;

use super::manager::MediaControlsManager;
use super::models::{MediaControlActionEvent, MediaMetadataDto, MediaPlaybackStatusDto};

#[test]
fn test_manager_creates_fallback_icon() {
    let test_dir = std::env::temp_dir().join(format!("test-mc-{}", uuid::Uuid::new_v4()));
    let manager = MediaControlsManager::new(test_dir.clone());

    let fallback_icon = test_dir.join("fallback_icon.png");
    assert!(fallback_icon.exists(), "Fallback icon must be created on disk");

    let uri = manager.resolve_cover_art_uri("non-existent-track");
    assert!(uri.is_some(), "Fallback URI must be returned when track not in DB");
    let uri_str = uri.unwrap();
    assert!(
        uri_str.starts_with("file://"),
        "Fallback URI must start with file://"
    );
    assert!(
        uri_str.contains("fallback_icon.png"),
        "URI must point to fallback_icon.png"
    );

    let _ = fs::remove_dir_all(&test_dir);
}

#[test]
fn test_models_serialization() {
    let meta = MediaMetadataDto {
        track_id: "track-123".to_string(),
        title: "Test Song".to_string(),
        artist: "Test Artist".to_string(),
        album: Some("Test Album".to_string()),
        duration_seconds: Some(215.5),
    };

    let json = serde_json::to_string(&meta).expect("Serialization failed");
    assert!(json.contains("track-123"));
    assert!(json.contains("Test Song"));

    let status = MediaPlaybackStatusDto::Playing;
    let json_status = serde_json::to_string(&status).expect("Serialization failed");
    assert_eq!(json_status, "\"playing\"");

    let event = MediaControlActionEvent {
        action: "play".to_string(),
        position_seconds: Some(42.0),
    };
    let json_event = serde_json::to_string(&event).expect("Serialization failed");
    assert!(json_event.contains("\"play\""));
}
