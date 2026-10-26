//! Unit tests for audio models, error conversions, validation, and engine state transitions.

use std::fs::File;
use std::io::Write;

use super::engine::AudioEngine;
use super::error::AudioError;
use super::models::{
    AudioPlaybackState, AudioPlaybackStateDto, AudioPositionDto, AudioTrackEndedDto, PlaybackStatus,
};

#[test]
fn test_audio_models_serialization() {
    let state = AudioPlaybackState {
        track_id: Some("track-123".to_string()),
        file_path: Some("C:/music/song.mp3".to_string()),
        status: PlaybackStatus::Playing,
        position_seconds: 45.2,
        duration_seconds: 210.0,
        volume: 0.85,
        is_muted: false,
        session_id: 1,
        play_count_recorded: false,
    };

    let dto = AudioPlaybackStateDto::from(&state);
    assert_eq!(dto.track_id, Some("track-123".to_string()));
    assert_eq!(dto.status, PlaybackStatus::Playing);
    assert_eq!(dto.position_seconds, 45.2);
    assert_eq!(dto.volume, 0.85);

    let serialized = serde_json::to_string(&dto).expect("Serialization failed");
    assert!(serialized.contains("\"playing\""));
    assert!(serialized.contains("\"track-123\""));

    let pos_dto = AudioPositionDto {
        track_id: "track-123".to_string(),
        position_seconds: 12.5,
        duration_seconds: 180.0,
        is_playing: true,
    };
    let pos_json = serde_json::to_string(&pos_dto).expect("Serialization failed");
    assert!(pos_json.contains("12.5"));

    let ended_dto = AudioTrackEndedDto {
        track_id: "track-123".to_string(),
        completed: true,
    };
    let ended_json = serde_json::to_string(&ended_dto).expect("Serialization failed");
    assert!(ended_json.contains("\"completed\":true"));
}

#[test]
fn test_audio_error_codes() {
    let err_not_found = AudioError::FileNotFound("missing.mp3".to_string());
    assert_eq!(err_not_found.code(), "FILE_NOT_FOUND");
    let dto = err_not_found.to_dto(Some("track-1".to_string()));
    assert_eq!(dto.code, "FILE_NOT_FOUND");
    assert_eq!(dto.track_id, Some("track-1".to_string()));

    let err_fmt = AudioError::UnsupportedFormat("bad.exe".to_string());
    assert_eq!(err_fmt.code(), "UNSUPPORTED_FORMAT");

    let err_decode = AudioError::DecodeError("corrupt".to_string());
    assert_eq!(err_decode.code(), "DECODE_ERROR");

    let err_dev = AudioError::DeviceError("disconnected".to_string());
    assert_eq!(err_dev.code(), "DEVICE_ERROR");

    let err_seek = AudioError::SeekFailed("bad pos".to_string());
    assert_eq!(err_seek.code(), "SEEK_FAILED");

    let err_not_loaded = AudioError::NotLoaded;
    assert_eq!(err_not_loaded.code(), "NOT_LOADED");

    let err_not_playing = AudioError::NotPlaying;
    assert_eq!(err_not_playing.code(), "NOT_PLAYING");

    let err_not_paused = AudioError::NotPaused;
    assert_eq!(err_not_paused.code(), "NOT_PAUSED");
}

#[test]
fn test_file_path_validation() {
    // Non-existent path
    let non_existent = AudioEngine::validate_file_path("C:/path/to/non_existent_file.mp3");
    assert!(non_existent.is_err());
    match non_existent {
        Err(AudioError::FileNotFound(_)) => (),
        other => panic!("Expected FileNotFound, got {:?}", other),
    }

    // Temporary file with unsupported extension
    let temp_dir = std::env::temp_dir();
    let unsupported_path = temp_dir.join("test_audio.txt");
    {
        let mut f = File::create(&unsupported_path).expect("Failed to create temp file");
        writeln!(f, "dummy text").expect("Failed to write");
    }

    let unsupported_res = AudioEngine::validate_file_path(&unsupported_path.to_string_lossy());
    assert!(unsupported_res.is_err());
    match unsupported_res {
        Err(AudioError::UnsupportedFormat(_)) => (),
        other => panic!("Expected UnsupportedFormat, got {:?}", other),
    }

    let _ = std::fs::remove_file(&unsupported_path);

    // Temporary file with supported extension (.wav)
    let supported_path = temp_dir.join("test_audio.wav");
    {
        let mut f = File::create(&supported_path).expect("Failed to create temp wav");
        writeln!(f, "dummy content").expect("Failed to write");
    }

    let supported_res = AudioEngine::validate_file_path(&supported_path.to_string_lossy());
    assert!(supported_res.is_ok());

    let _ = std::fs::remove_file(&supported_path);
}

#[test]
fn test_audio_engine_state_and_controls() {
    let engine = AudioEngine::new();

    // Initial state
    let state = engine.get_state().expect("Failed to get state");
    assert_eq!(state.status, PlaybackStatus::Stopped);
    assert_eq!(state.volume, 0.8);
    assert!(!state.is_muted);
    assert_eq!(state.position_seconds, 0.0);

    // Volume adjustment and clamping
    engine.set_volume(0.5).expect("Set volume failed");
    let state_vol = engine.get_state().expect("Get state failed");
    assert!((state_vol.volume - 0.5).abs() < 0.001);

    engine.set_volume(1.5).expect("Set volume clamped high");
    assert!((engine.get_state().unwrap().volume - 1.0).abs() < 0.001);

    engine.set_volume(-0.5).expect("Set volume clamped low");
    assert!((engine.get_state().unwrap().volume - 0.0).abs() < 0.001);

    // Mute toggling
    engine.set_muted(true).expect("Set muted failed");
    assert!(engine.get_state().unwrap().is_muted);
    engine.set_muted(false).expect("Set unmuted failed");
    assert!(!engine.get_state().unwrap().is_muted);

    // Transport error guards when stopped
    let pause_res = engine.pause();
    assert!(pause_res.is_err());
    match pause_res {
        Err(AudioError::NotPlaying) => (),
        other => panic!("Expected NotPlaying, got {:?}", other),
    }

    let resume_res = engine.resume();
    assert!(resume_res.is_err());
    match resume_res {
        Err(AudioError::NotPaused) => (),
        other => panic!("Expected NotPaused, got {:?}", other),
    }

    let seek_res = engine.seek(10.0);
    assert!(seek_res.is_err());
    match seek_res {
        Err(AudioError::NotLoaded) => (),
        other => panic!("Expected NotLoaded, got {:?}", other),
    }

    // Stop resets to stopped
    let stop_dto = engine.stop().expect("Stop failed");
    assert_eq!(stop_dto.status, PlaybackStatus::Stopped);
}
