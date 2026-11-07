//! Native operating system media controls manager using souvlaki.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, RwLock};
use std::time::Duration;

use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
    SeekDirection,
};
use tauri::{AppHandle, Emitter, WebviewWindow};

use crate::db::DatabaseManager;
use super::models::{MediaControlActionEvent, MediaMetadataDto, MediaPlaybackStatusDto};

const BUNDLED_ICON_BYTES: &[u8] = include_bytes!("../../icons/icon.png");

/// Thread-safe manager coordinating OS transport controls and hardware media keys.
pub struct MediaControlsManager {
    app_handle: RwLock<Option<AppHandle>>,
    db_manager: RwLock<Option<Arc<DatabaseManager>>>,
    controls: Mutex<Option<MediaControls>>,
    fallback_icon_path: PathBuf,
    is_enabled: AtomicBool,
}

impl MediaControlsManager {
    /// Creates a new manager and ensures the fallback PNG icon is available on disk.
    pub fn new(app_data_dir: PathBuf) -> Self {
        let _ = fs::create_dir_all(&app_data_dir);
        let fallback_icon_path = app_data_dir.join("fallback_icon.png");

        if !fallback_icon_path.exists() {
            let _ = fs::write(&fallback_icon_path, BUNDLED_ICON_BYTES);
        }

        Self {
            app_handle: RwLock::new(None),
            db_manager: RwLock::new(None),
            controls: Mutex::new(None),
            fallback_icon_path,
            is_enabled: AtomicBool::new(true),
        }
    }

    /// Associates the Tauri application handle for event emission.
    pub fn set_app_handle(&self, handle: AppHandle) {
        if let Ok(mut lock) = self.app_handle.write() {
            *lock = Some(handle);
        }
    }

    /// Associates the database manager for artwork lookup.
    pub fn set_db_manager(&self, db: Arc<DatabaseManager>) {
        if let Ok(mut lock) = self.db_manager.write() {
            *lock = Some(db);
        }
    }

    /// Initializes souvlaki OS media controls binding to the window handle.
    pub fn init_with_window(&self, window: &WebviewWindow) {
        #[cfg(target_os = "windows")]
        let hwnd_ptr = match window.hwnd() {
            Ok(hwnd) => Some(hwnd.0),
            Err(err) => {
                eprintln!("[media_controls] Failed to obtain window HWND: {err}");
                None
            }
        };

        #[cfg(not(target_os = "windows"))]
        let hwnd_ptr: Option<*mut std::ffi::c_void> = None;

        let config = PlatformConfig {
            dbus_name: "mutinhimira",
            display_name: "Mutinhimira",
            hwnd: hwnd_ptr,
        };

        match MediaControls::new(config) {
            Ok(mut media_controls) => {
                if self.is_enabled.load(Ordering::SeqCst) {
                    self.attach_event_listener(&mut media_controls);
                }
                if let Ok(mut lock) = self.controls.lock() {
                    *lock = Some(media_controls);
                }
            }
            Err(err) => {
                eprintln!("[media_controls] Failed to initialize native media controls: {err:?}");
            }
        }
    }

    /// Attaches the native event pump to forward transport actions to the frontend.
    fn attach_event_listener(&self, controls: &mut MediaControls) {
        let app_handle_opt = self.app_handle.read().ok().and_then(|h| h.clone());

        let attach_res = controls.attach(move |event| {
            if let Some(ref handle) = app_handle_opt {
                let action_opt = match event {
                    MediaControlEvent::Play => Some(("play", None)),
                    MediaControlEvent::Pause => Some(("pause", None)),
                    MediaControlEvent::Toggle => Some(("toggle", None)),
                    MediaControlEvent::Next => Some(("next", None)),
                    MediaControlEvent::Previous => Some(("previous", None)),
                    MediaControlEvent::Stop => Some(("stop", None)),
                    MediaControlEvent::Seek(dir) => match dir {
                        SeekDirection::Forward => Some(("next", None)),
                        SeekDirection::Backward => Some(("previous", None)),
                    },
                    MediaControlEvent::SeekBy(dir, dur) => {
                        let secs = dur.as_secs_f64();
                        let factor = match dir {
                            SeekDirection::Forward => 1.0,
                            SeekDirection::Backward => -1.0,
                        };
                        Some(("seek_relative", Some(secs * factor)))
                    }
                    MediaControlEvent::SetPosition(pos) => {
                        Some(("seek", Some(pos.0.as_secs_f64())))
                    }
                    _ => None,
                };

                if let Some((action, position_seconds)) = action_opt {
                    let payload = MediaControlActionEvent {
                        action: action.to_string(),
                        position_seconds,
                    };
                    let _ = handle.emit("media-controls:action", payload);
                }
            }
        });

        if let Err(err) = attach_res {
            eprintln!("[media_controls] Failed to attach media controls event handler: {err:?}");
        }
    }

    /// Resolves the cover art URI as a file:/// URI, falling back to the bundled icon for WebP or missing art.
    pub fn resolve_cover_art_uri(&self, track_id: &str) -> Option<String> {
        let db_opt = self.db_manager.read().ok().and_then(|d| d.clone());

        let cover_art_path: Option<String> = if let Some(db) = db_opt {
            db.with_conn(|conn| crate::db::track_repo::get_track_by_id(conn, track_id))
                .ok()
                .flatten()
                .and_then(|track| track.cover_art_path)
        } else {
            None
        };

        if let Some(path_str) = cover_art_path {
            let path = Path::new(&path_str);
            if path.exists() {
                let is_supported = path
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| {
                        let lower = ext.to_lowercase();
                        lower == "png" || lower == "jpg" || lower == "jpeg"
                    })
                    .unwrap_or(false);

                if is_supported {
                    return Some(format!("file://{}", path.to_string_lossy()));
                }
            }
        }

        if self.fallback_icon_path.exists() {
            Some(format!(
                "file://{}",
                self.fallback_icon_path.to_string_lossy()
            ))
        } else {
            None
        }
    }

    /// Updates Windows SMTC with track title, artist, album name, duration, and cover art.
    pub fn set_metadata(&self, metadata: MediaMetadataDto) -> Result<(), String> {
        if !self.is_enabled.load(Ordering::SeqCst) {
            return Ok(());
        }

        let mut lock = self.controls.lock().map_err(|e| e.to_string())?;
        let controls = match lock.as_mut() {
            Some(c) => c,
            None => return Ok(()),
        };

        let cover_uri = self.resolve_cover_art_uri(&metadata.track_id);
        let duration = metadata.duration_seconds.map(Duration::from_secs_f64);

        let smtc_meta = MediaMetadata {
            title: Some(&metadata.title),
            artist: Some(&metadata.artist),
            album: metadata.album.as_deref(),
            duration,
            cover_url: cover_uri.as_deref(),
        };

        controls
            .set_metadata(smtc_meta)
            .map_err(|e| format!("{e:?}"))?;
        Ok(())
    }

    /// Updates Windows SMTC playback status (Playing, Paused, Stopped) and timeline progress.
    pub fn set_playback_status(
        &self,
        status: MediaPlaybackStatusDto,
        position_seconds: Option<f64>,
    ) -> Result<(), String> {
        if !self.is_enabled.load(Ordering::SeqCst) {
            return Ok(());
        }

        let mut lock = self.controls.lock().map_err(|e| e.to_string())?;
        let controls = match lock.as_mut() {
            Some(c) => c,
            None => return Ok(()),
        };

        let progress =
            position_seconds.map(|secs| MediaPosition(Duration::from_secs_f64(secs.max(0.0))));

        let playback = match status {
            MediaPlaybackStatusDto::Playing => MediaPlayback::Playing { progress },
            MediaPlaybackStatusDto::Paused => MediaPlayback::Paused { progress },
            MediaPlaybackStatusDto::Stopped => MediaPlayback::Stopped,
        };

        controls
            .set_playback(playback)
            .map_err(|e| format!("{e:?}"))?;
        Ok(())
    }

    /// Clears active metadata and sets playback status to stopped.
    pub fn clear(&self) -> Result<(), String> {
        let mut lock = self.controls.lock().map_err(|e| e.to_string())?;
        if let Some(controls) = lock.as_mut() {
            let _ = controls.set_playback(MediaPlayback::Stopped);
            let empty_meta = MediaMetadata {
                title: Some(""),
                artist: Some(""),
                album: None,
                duration: None,
                cover_url: None,
            };
            let _ = controls.set_metadata(empty_meta);
        }
        Ok(())
    }

    /// Enables or disables operating system transport controls.
    pub fn set_enabled(&self, enabled: bool) -> Result<(), String> {
        self.is_enabled.store(enabled, Ordering::SeqCst);
        let mut lock = self.controls.lock().map_err(|e| e.to_string())?;
        if let Some(controls) = lock.as_mut() {
            if enabled {
                self.attach_event_listener(controls);
            } else {
                let _ = controls.set_playback(MediaPlayback::Stopped);
                let _ = controls.detach();
            }
        }
        Ok(())
    }

    /// Detaches the native event handler cleanly on application shutdown.
    pub fn detach(&self) {
        if let Ok(mut lock) = self.controls.lock() {
            if let Some(controls) = lock.as_mut() {
                let _ = controls.detach();
            }
        }
    }
}