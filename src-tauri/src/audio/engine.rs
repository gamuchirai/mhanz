//! Core audio playback engine utilizing Rodio with Symphonia decoders.

use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use tauri::{AppHandle, Emitter};

use crate::db::DatabaseManager;

use super::error::AudioError;
use super::models::{
    AudioPlaybackState, AudioPlaybackStateDto, AudioPositionDto, AudioTrackEndedDto, PlaybackStatus,
};

/// Whitelisted audio file extensions.
const SUPPORTED_EXTENSIONS: &[&str] = &["mp3", "flac", "wav", "m4a", "aac", "ogg", "opus"];

/// Inner mutable audio state protected by a Mutex.
pub struct AudioEngineInner {
    pub stream_handle: Option<OutputStreamHandle>,
    pub sink: Option<Sink>,
    pub state: AudioPlaybackState,
}

/// Native desktop audio engine orchestrating Rodio playback, background progress,
/// track completion tracking, and milestone play count updates.
#[derive(Clone)]
pub struct AudioEngine {
    inner: Arc<Mutex<AudioEngineInner>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
    db_manager: Arc<Mutex<Option<Arc<DatabaseManager>>>>,
    monitor_running: Arc<AtomicBool>,
}

/// Dedicated thread initialization that holds the Rodio OutputStream alive.
fn spawn_audio_stream() -> Option<OutputStreamHandle> {
    let (tx, rx) = std::sync::mpsc::channel();
    let spawn_result = thread::Builder::new()
        .name("Mutinhimira-audio-output".to_string())
        .spawn(move || match OutputStream::try_default() {
            Ok((_stream, handle)) => {
                let _ = tx.send(Some(handle));
                loop {
                    thread::park();
                }
            }
            Err(err) => {
                eprintln!("[AudioEngine] Default audio device unavailable: {}", err);
                let _ = tx.send(None);
            }
        });

    if spawn_result.is_err() {
        return None;
    }

    rx.recv_timeout(Duration::from_millis(1500)).unwrap_or(None)
}

impl AudioEngine {
    /// Creates a new AudioEngine, initializing the default audio output device.
    pub fn new() -> Self {
        let stream_handle = spawn_audio_stream();

        let initial_state = AudioPlaybackState {
            volume: 0.8,
            is_muted: false,
            ..Default::default()
        };

        let inner = Arc::new(Mutex::new(AudioEngineInner {
            stream_handle,
            sink: None,
            state: initial_state,
        }));

        Self {
            inner,
            app_handle: Arc::new(Mutex::new(None)),
            db_manager: Arc::new(Mutex::new(None)),
            monitor_running: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Associates the Tauri AppHandle for event emission.
    pub fn set_app_handle(&self, handle: AppHandle) {
        if let Ok(mut app_lock) = self.app_handle.lock() {
            *app_lock = Some(handle);
        }
        self.ensure_monitor_thread();
    }

    /// Associates the DatabaseManager for play count and settings updates.
    pub fn set_db_manager(&self, db: Arc<DatabaseManager>) {
        // Load initial volume and mute settings from SQLite player_settings if present
        if let Ok(mut db_lock) = self.db_manager.lock() {
            *db_lock = Some(db.clone());
        }

        let _ = db.with_conn(|conn| {
            if let Ok(Some(vol_str)) =
                crate::db::settings_repo::get_setting(conn, "playback_volume")
            {
                if let Ok(vol) = vol_str.parse::<f32>() {
                    if let Ok(mut inner) = self.inner.lock() {
                        inner.state.volume = vol.clamp(0.0, 1.0);
                    }
                }
            }
            if let Ok(Some(mute_str)) =
                crate::db::settings_repo::get_setting(conn, "playback_is_muted")
            {
                if let Ok(muted) = mute_str.parse::<bool>() {
                    if let Ok(mut inner) = self.inner.lock() {
                        inner.state.is_muted = muted;
                    }
                }
            }
            Ok(())
        });
    }

    /// Validates file path existence, ensures it points to a regular file,
    /// and checks the extension against the whitelist.
    pub fn validate_file_path(raw_path: &str) -> Result<PathBuf, AudioError> {
        let path = Path::new(raw_path);
        if !path.exists() {
            return Err(AudioError::FileNotFound(raw_path.to_string()));
        }

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !SUPPORTED_EXTENSIONS.contains(&ext.as_str()) {
            return Err(AudioError::UnsupportedFormat(format!(
                "File format .{} is not supported. Supported formats: {:?}",
                ext, SUPPORTED_EXTENSIONS
            )));
        }

        std::fs::canonicalize(path).map_err(|err| AudioError::FileNotFound(err.to_string()))
    }

    /// Ensures the Rodio output stream and sink are valid, attempting reinitialization if needed.
    fn ensure_stream_handle(
        inner: &mut AudioEngineInner,
    ) -> Result<OutputStreamHandle, AudioError> {
        if let Some(ref handle) = inner.stream_handle {
            return Ok(handle.clone());
        }

        match spawn_audio_stream() {
            Some(handle) => {
                inner.stream_handle = Some(handle.clone());
                Ok(handle)
            }
            None => Err(AudioError::DeviceError(
                "Failed to initialize audio output device".to_string(),
            )),
        }
    }

    /// Emits state changed event to the frontend.
    fn emit_state_changed(&self, state_dto: &AudioPlaybackStateDto) {
        if let Ok(app_lock) = self.app_handle.lock() {
            if let Some(ref app) = *app_lock {
                let _ = app.emit("audio:state-changed", state_dto);
            }
        }
    }

    /// Emits structured error event to the frontend.
    fn emit_error(&self, error: &AudioError, track_id: Option<String>) {
        if let Ok(app_lock) = self.app_handle.lock() {
            if let Some(ref app) = *app_lock {
                let _ = app.emit("audio:error", error.to_dto(track_id));
            }
        }
    }

    /// Loads an audio file, resets transport state, starts playback, and emits events.
    pub fn play_track(
        &self,
        track_id: String,
        file_path: String,
        start_position: Option<f64>,
    ) -> Result<AudioPlaybackStateDto, AudioError> {
        let canonical_path = match Self::validate_file_path(&file_path) {
            Ok(p) => p,
            Err(err) => {
                self.emit_error(&err, Some(track_id));
                return Err(err);
            }
        };

        let file = match File::open(&canonical_path) {
            Ok(f) => f,
            Err(err) => {
                let audio_err = AudioError::FileNotFound(err.to_string());
                self.emit_error(&audio_err, Some(track_id));
                return Err(audio_err);
            }
        };

        let buf_reader = BufReader::new(file);
        let decoder = match Decoder::new(buf_reader) {
            Ok(d) => d,
            Err(err) => {
                let audio_err = AudioError::DecodeError(format!(
                    "Failed to decode audio file {}: {}",
                    file_path, err
                ));
                self.emit_error(&audio_err, Some(track_id));
                return Err(audio_err);
            }
        };

        let duration = decoder
            .total_duration()
            .map(|d| d.as_secs_f64())
            .unwrap_or(0.0);

        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        let stream_handle = match Self::ensure_stream_handle(&mut inner) {
            Ok(h) => h,
            Err(err) => {
                self.emit_error(&err, Some(track_id));
                return Err(err);
            }
        };

        // Stop previous sink if active
        if let Some(old_sink) = inner.sink.take() {
            old_sink.stop();
        }

        let new_sink = match Sink::try_new(&stream_handle) {
            Ok(s) => s,
            Err(err) => {
                let audio_err = AudioError::DeviceError(err.to_string());
                self.emit_error(&audio_err, Some(track_id));
                return Err(audio_err);
            }
        };

        let current_volume = if inner.state.is_muted {
            0.0
        } else {
            inner.state.volume
        };
        new_sink.set_volume(current_volume);
        new_sink.append(decoder);

        let start_pos = start_position.unwrap_or(0.0).max(0.0);
        if start_pos > 0.0 {
            let _ = new_sink.try_seek(Duration::from_secs_f64(start_pos));
        }

        inner.state.session_id += 1;
        inner.state.track_id = Some(track_id);
        inner.state.file_path = Some(canonical_path.to_string_lossy().to_string());
        inner.state.status = PlaybackStatus::Playing;
        inner.state.position_seconds = start_pos;
        inner.state.duration_seconds = duration;
        inner.state.play_count_recorded = false;
        inner.sink = Some(new_sink);

        let dto = AudioPlaybackStateDto::from(&inner.state);
        drop(inner);

        self.emit_state_changed(&dto);
        self.ensure_monitor_thread();

        Ok(dto)
    }

    /// Pauses currently active playback.
    pub fn pause(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if inner.state.status != PlaybackStatus::Playing {
            return Err(AudioError::NotPlaying);
        }

        if let Some(ref sink) = inner.sink {
            sink.pause();
            inner.state.position_seconds = sink.get_pos().as_secs_f64();
        }
        inner.state.status = PlaybackStatus::Paused;

        let dto = AudioPlaybackStateDto::from(&inner.state);
        drop(inner);

        self.emit_state_changed(&dto);
        Ok(dto)
    }

    /// Resumes playback from paused state.
    pub fn resume(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if inner.state.status != PlaybackStatus::Paused {
            return Err(AudioError::NotPaused);
        }

        if let Some(ref sink) = inner.sink {
            sink.play();
        } else {
            return Err(AudioError::NotLoaded);
        }
        inner.state.status = PlaybackStatus::Playing;

        let dto = AudioPlaybackStateDto::from(&inner.state);
        drop(inner);

        self.emit_state_changed(&dto);
        Ok(dto)
    }

    /// Stops playback and resets position to zero.
    pub fn stop(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if let Some(sink) = inner.sink.take() {
            sink.stop();
        }
        inner.state.status = PlaybackStatus::Stopped;
        inner.state.position_seconds = 0.0;

        let dto = AudioPlaybackStateDto::from(&inner.state);
        drop(inner);

        self.emit_state_changed(&dto);
        Ok(dto)
    }

    /// Seeks active stream to specified second offset.
    pub fn seek(&self, position_seconds: f64) -> Result<AudioPlaybackStateDto, AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        if inner.state.track_id.is_none() {
            return Err(AudioError::NotLoaded);
        }

        let clamped = position_seconds.clamp(0.0, inner.state.duration_seconds.max(0.0));

        if let Some(ref sink) = inner.sink {
            if let Err(err) = sink.try_seek(Duration::from_secs_f64(clamped)) {
                return Err(AudioError::SeekFailed(err.to_string()));
            }
        } else {
            return Err(AudioError::NotLoaded);
        }

        inner.state.position_seconds = clamped;
        let dto = AudioPlaybackStateDto::from(&inner.state);
        drop(inner);

        self.emit_state_changed(&dto);
        Ok(dto)
    }

    /// Sets playback volume (0.0 to 1.0) and persists preference.
    pub fn set_volume(&self, volume: f32) -> Result<(), AudioError> {
        let clamped = volume.clamp(0.0, 1.0);

        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        inner.state.volume = clamped;
        if !inner.state.is_muted {
            if let Some(ref sink) = inner.sink {
                sink.set_volume(clamped);
            }
        }

        drop(inner);

        // Persist to SQLite
        if let Ok(db_lock) = self.db_manager.lock() {
            if let Some(ref db) = *db_lock {
                let _ = db.with_conn(|conn| {
                    crate::db::settings_repo::set_setting(
                        conn,
                        "playback_volume",
                        &clamped.to_string(),
                    )
                });
            }
        }

        Ok(())
    }

    /// Sets mute flag and adjusts Sink output volume accordingly.
    pub fn set_muted(&self, muted: bool) -> Result<(), AudioError> {
        let mut inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;

        inner.state.is_muted = muted;
        if let Some(ref sink) = inner.sink {
            sink.set_volume(if muted { 0.0 } else { inner.state.volume });
        }

        drop(inner);

        // Persist to SQLite
        if let Ok(db_lock) = self.db_manager.lock() {
            if let Some(ref db) = *db_lock {
                let _ = db.with_conn(|conn| {
                    crate::db::settings_repo::set_setting(
                        conn,
                        "playback_is_muted",
                        &muted.to_string(),
                    )
                });
            }
        }

        Ok(())
    }

    /// Queries the current audio playback state snapshot.
    pub fn get_state(&self) -> Result<AudioPlaybackStateDto, AudioError> {
        let inner = self
            .inner
            .lock()
            .map_err(|e| AudioError::LockError(e.to_string()))?;
        Ok(AudioPlaybackStateDto::from(&inner.state))
    }

    /// Spawns the background monitor thread if not already running.
    fn ensure_monitor_thread(&self) {
        if self
            .monitor_running
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }

        let inner_clone = self.inner.clone();
        let app_handle_clone = self.app_handle.clone();
        let db_manager_clone = self.db_manager.clone();
        let running_flag = self.monitor_running.clone();

        thread::Builder::new()
            .name("audio-monitor".to_string())
            .spawn(move || {
                while running_flag.load(Ordering::SeqCst) {
                    thread::sleep(Duration::from_millis(100));

                    let mut inner = match inner_clone.lock() {
                        Ok(l) => l,
                        Err(_) => continue,
                    };

                    if inner.state.status != PlaybackStatus::Playing {
                        continue;
                    }

                    let (sink_empty, current_pos) = if let Some(ref sink) = inner.sink {
                        (sink.empty(), sink.get_pos().as_secs_f64())
                    } else {
                        (true, 0.0)
                    };

                    let track_id_opt = inner.state.track_id.clone();
                    let duration = inner.state.duration_seconds;

                    if sink_empty {
                        // Track completed naturally
                        inner.state.status = PlaybackStatus::Stopped;
                        inner.state.position_seconds = 0.0;
                        if let Some(sink) = inner.sink.take() {
                            sink.stop();
                        }

                        let state_dto = AudioPlaybackStateDto::from(&inner.state);
                        drop(inner);

                        if let Ok(app_lock) = app_handle_clone.lock() {
                            if let Some(ref app) = *app_lock {
                                let _ = app.emit("audio:state-changed", &state_dto);
                                if let Some(ref tid) = track_id_opt {
                                    let _ = app.emit(
                                        "audio:track-ended",
                                        AudioTrackEndedDto {
                                            track_id: tid.clone(),
                                            completed: true,
                                        },
                                    );
                                }
                            }
                        }
                        continue;
                    }

                    // Track is still playing: update position
                    inner.state.position_seconds = current_pos;

                    // Check play counter milestone (30s or half duration)
                    let should_record_play = !inner.state.play_count_recorded
                        && (current_pos >= 30.0
                            || (duration > 0.0 && current_pos >= duration / 2.0));

                    if should_record_play {
                        inner.state.play_count_recorded = true;
                        if let Some(ref tid) = track_id_opt {
                            if let Ok(db_lock) = db_manager_clone.lock() {
                                if let Some(ref db) = *db_lock {
                                    let tid_str = tid.clone();
                                    let _ = db.with_conn(|conn| {
                                        crate::db::track_repo::increment_play_count(conn, &tid_str)
                                    });
                                }
                            }
                        }
                    }

                    let position_dto = AudioPositionDto {
                        track_id: track_id_opt.unwrap_or_default(),
                        position_seconds: current_pos,
                        duration_seconds: duration,
                        is_playing: true,
                    };

                    drop(inner);

                    if let Ok(app_lock) = app_handle_clone.lock() {
                        if let Some(ref app) = *app_lock {
                            let _ = app.emit("audio:position", &position_dto);
                        }
                    }
                }
            })
            .expect("Failed to spawn audio monitor thread");
    }
}

impl Default for AudioEngine {
    fn default() -> Self {
        Self::new()
    }
}
