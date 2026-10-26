//! Background scanner coordinator, multi-core worker thread, and throttled event emissions.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use rayon::prelude::*;
use tauri::{AppHandle, Emitter};

use crate::db::DatabaseManager;

use super::batch_writer::{commit_track_batch, prune_missing_folder_tracks, CHUNK_BATCH_SIZE};
use super::discovery::{discover_audio_files, fetch_existing_file_timestamps};
use super::metadata::parse_audio_metadata;
use super::models::{
    ActiveScanStatusDto, ScanCompletedPayload, ScanErrorItem, ScanJobStartDto, ScanPhase,
    ScanProgressPayload,
};

/// Internal shared mutable progress state during an active scan.
#[derive(Debug, Default)]
struct ProgressCounters {
    scanned_files: usize,
    total_files: usize,
    new_tracks: usize,
    updated_tracks: usize,
    removed_tracks: usize,
    current_file: String,
}

/// Thread safe scanner coordinator service.
pub struct ScannerManager {
    is_scanning: Arc<AtomicBool>,
    active_folder_id: Arc<Mutex<Option<String>>>,
    active_phase: Arc<Mutex<ScanPhase>>,
    cancel_flag: Arc<AtomicBool>,
    started_at: Arc<AtomicI64>,
    progress_counters: Arc<Mutex<ProgressCounters>>,
}

impl ScannerManager {
    /// Constructs a new idle scanner manager.
    pub fn new() -> Self {
        Self {
            is_scanning: Arc::new(AtomicBool::new(false)),
            active_folder_id: Arc::new(Mutex::new(None)),
            active_phase: Arc::new(Mutex::new(ScanPhase::Idle)),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            started_at: Arc::new(AtomicI64::new(0)),
            progress_counters: Arc::new(Mutex::new(ProgressCounters::default())),
        }
    }

    /// Queries current scan execution status.
    pub fn get_status(&self) -> ActiveScanStatusDto {
        let is_scanning = self.is_scanning.load(Ordering::SeqCst);
        let active_folder_id = self.active_folder_id.lock().ok().and_then(|f| f.clone());
        let phase = self
            .active_phase
            .lock()
            .map(|p| p.as_str().to_string())
            .unwrap_or_else(|_| "idle".to_string());

        let counters = self
            .progress_counters
            .lock()
            .map(|c| (c.scanned_files, c.total_files, c.current_file.clone()))
            .unwrap_or_default();

        let started_at_val = self.started_at.load(Ordering::SeqCst);
        let started_at = if started_at_val > 0 {
            Some(started_at_val)
        } else {
            None
        };

        ActiveScanStatusDto {
            is_scanning,
            active_folder_id,
            phase,
            scanned_files: counters.0,
            total_files: counters.1,
            current_file: if counters.2.is_empty() {
                None
            } else {
                Some(counters.2)
            },
            started_at,
        }
    }

    /// Cancels an in-progress library scan job (AC-11).
    pub fn cancel_scan(&self, folder_id: Option<String>) -> Result<bool, String> {
        if !self.is_scanning.load(Ordering::SeqCst) {
            return Err("NO_ACTIVE_SCAN".to_string());
        }

        if let Some(ref target_id) = folder_id {
            let active = self.active_folder_id.lock().ok().and_then(|f| f.clone());
            if let Some(active_id) = active {
                if active_id != *target_id {
                    return Err("NO_ACTIVE_SCAN".to_string());
                }
            }
        }

        self.cancel_flag.store(true, Ordering::SeqCst);
        Ok(true)
    }

    /// Kicks off background folder indexing on a worker thread (AC-1, AC-11).
    pub fn start_scan_folder(
        &self,
        folder_id: String,
        db_manager: Arc<DatabaseManager>,
        app_handle: AppHandle,
        covers_cache_dir: PathBuf,
    ) -> Result<ScanJobStartDto, String> {
        // Enforce single active scanner (AC-11)
        if self
            .is_scanning
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err("SCANNER_BUSY".to_string());
        }

        // Look up folder path in database
        let folder_path_buf = {
            let conn = db_manager
                .conn
                .lock()
                .map_err(|e| format!("Failed to acquire database lock: {}", e))?;
            let mut stmt = conn
                .prepare("SELECT path FROM folders WHERE id = ?1 AND is_active = 1")
                .map_err(|e| e.to_string())?;

            let path_opt: Option<String> = stmt
                .query_row([&folder_id], |row| row.get(0))
                .ok();

            match path_opt {
                Some(p) => PathBuf::from(p),
                None => {
                    self.is_scanning.store(false, Ordering::SeqCst);
                    return Err("FOLDER_NOT_FOUND".to_string());
                }
            }
        };

        // Disconnected folder safety check (AC-9)
        if !folder_path_buf.exists() || !folder_path_buf.is_dir() {
            self.is_scanning.store(false, Ordering::SeqCst);
            return Err(format!(
                "FOLDER_UNAVAILABLE: Monitored folder does not exist or drive is disconnected: {}",
                folder_path_buf.display()
            ));
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        self.started_at.store(now, Ordering::SeqCst);
        self.cancel_flag.store(false, Ordering::SeqCst);
        if let Ok(mut fid) = self.active_folder_id.lock() {
            *fid = Some(folder_id.clone());
        }
        if let Ok(mut ph) = self.active_phase.lock() {
            *ph = ScanPhase::Discovering;
        }
        if let Ok(mut c) = self.progress_counters.lock() {
            *c = ProgressCounters::default();
        }

        // Clone shared references for background worker thread
        let is_scanning_clone = self.is_scanning.clone();
        let active_folder_id_clone = self.active_folder_id.clone();
        let active_phase_clone = self.active_phase.clone();
        let cancel_flag_clone = self.cancel_flag.clone();
        let counters_clone = self.progress_counters.clone();
        let folder_id_worker = folder_id.clone();

        std::thread::Builder::new()
            .name("mumhanzi-scanner-worker".to_string())
            .spawn(move || {
                let start_instant = Instant::now();
                let mut scan_errors: Vec<ScanErrorItem> = Vec::new();
                let mut last_progress_emit = Instant::now();
                const THROTTLE_INTERVAL: Duration = Duration::from_millis(100);

                // Helper to emit throttled progress
                let maybe_emit_progress = |force: bool,
                                           phase_str: &'static str,
                                           current_file_path: &str,
                                           last_emit: &mut Instant| {
                    if force || last_emit.elapsed() >= THROTTLE_INTERVAL {
                        *last_emit = Instant::now();
                        let payload = {
                            let mut counters = counters_clone.lock().unwrap();
                            counters.current_file = current_file_path.to_string();
                            ScanProgressPayload {
                                folder_id: folder_id_worker.clone(),
                                phase: phase_str.to_string(),
                                scanned_files: counters.scanned_files,
                                total_files: counters.total_files,
                                new_tracks: counters.new_tracks,
                                updated_tracks: counters.updated_tracks,
                                removed_tracks: counters.removed_tracks,
                                current_file: current_file_path.to_string(),
                                elapsed_ms: start_instant.elapsed().as_millis() as u64,
                            }
                        };
                        let _ = app_handle.emit("library://scan-progress", payload);
                    }
                };

                // 1. Discovering Phase: Pre fetch DB timestamps and traverse folder
                let existing_timestamps: HashMap<String, i64> = {
                    let conn_res = db_manager.conn.lock();
                    match conn_res {
                        Ok(conn) => fetch_existing_file_timestamps(&conn, &folder_id_worker)
                            .unwrap_or_default(),
                        Err(_) => HashMap::new(),
                    }
                };

                maybe_emit_progress(true, "discovering", "", &mut last_progress_emit);

                let discovery_res = discover_audio_files(&folder_path_buf, &existing_timestamps);
                let (files_to_parse, all_disk_paths, unchanged_count) = match discovery_res {
                    Ok(res) => (res.files_to_parse, res.all_disk_paths, res.unchanged_count),
                    Err(err) => {
                        scan_errors.push(ScanErrorItem {
                            file_path: folder_path_buf.to_string_lossy().to_string(),
                            message: err.to_string(),
                        });
                        (Vec::new(), std::collections::HashSet::new(), 0)
                    }
                };

                let total_candidate_files = files_to_parse.len() + unchanged_count;
                if let Ok(mut c) = counters_clone.lock() {
                    c.total_files = total_candidate_files;
                    c.scanned_files = unchanged_count;
                }

                if let Ok(mut ph) = active_phase_clone.lock() {
                    *ph = ScanPhase::Parsing;
                }

                // 2. Parsing & Committing in chunks across CPU cores with Rayon (AC-3, AC-6)
                for chunk in files_to_parse.chunks(CHUNK_BATCH_SIZE) {
                    if cancel_flag_clone.load(Ordering::SeqCst) {
                        break;
                    }

                    // Parallel extraction of audio tags and artwork across Rayon threads (AC-3)
                    let parsed_tracks: Vec<crate::scanner::models::ScannedTrackData> = chunk
                        .par_iter()
                        .filter_map(|file| {
                            match parse_audio_metadata(file, &folder_id_worker, &covers_cache_dir) {
                                Ok(data) => Some(data),
                                Err(err_msg) => {
                                    // Resilient error tolerance: capture non-fatal error (AC-10)
                                    eprintln!("Audio parse warning for {}: {}", file.path_str, err_msg);
                                    None
                                }
                            }
                        })
                        .collect();

                    if cancel_flag_clone.load(Ordering::SeqCst) {
                        break;
                    }

                    // Commit batch into SQLite (AC-6, AC-7)
                    if let Ok(mut ph) = active_phase_clone.lock() {
                        *ph = ScanPhase::Committing;
                    }

                    if let Ok(mut conn) = db_manager.conn.lock() {
                        match commit_track_batch(&mut conn, &parsed_tracks, &existing_timestamps) {
                            Ok(stats) => {
                                if let Ok(mut c) = counters_clone.lock() {
                                    c.scanned_files += chunk.len();
                                    c.new_tracks += stats.new_tracks;
                                    c.updated_tracks += stats.updated_tracks;
                                }
                            }
                            Err(err) => {
                                scan_errors.push(ScanErrorItem {
                                    file_path: "batch_commit".to_string(),
                                    message: format!("SQLite batch commit error: {}", err),
                                });
                            }
                        }
                    }

                    let last_file_name = chunk
                        .last()
                        .map(|f| f.path_str.as_str())
                        .unwrap_or("");
                    maybe_emit_progress(false, "committing", last_file_name, &mut last_progress_emit);
                }

                // 3. Pruning Phase (AC-8): If and only if the scan was uncancelled
                let is_cancelled = cancel_flag_clone.load(Ordering::SeqCst);
                if !is_cancelled {
                    if let Ok(mut ph) = active_phase_clone.lock() {
                        *ph = ScanPhase::Pruning;
                    }
                    maybe_emit_progress(true, "pruning", "", &mut last_progress_emit);

                    if let Ok(mut conn) = db_manager.conn.lock() {
                        match prune_missing_folder_tracks(&mut conn, &folder_id_worker, &all_disk_paths) {
                            Ok(removed) => {
                                if let Ok(mut c) = counters_clone.lock() {
                                    c.removed_tracks = removed;
                                }
                            }
                            Err(err) => {
                                scan_errors.push(ScanErrorItem {
                                    file_path: "pruning".to_string(),
                                    message: format!("Pruning error: {}", err),
                                });
                            }
                        }
                    }
                }

                // Finalize Scan
                let final_counters = counters_clone.lock().unwrap();
                let completed_payload = ScanCompletedPayload {
                    folder_id: folder_id_worker,
                    total_scanned: final_counters.scanned_files,
                    new_tracks: final_counters.new_tracks,
                    updated_tracks: final_counters.updated_tracks,
                    removed_tracks: final_counters.removed_tracks,
                    elapsed_ms: start_instant.elapsed().as_millis() as u64,
                    errors: scan_errors,
                };

                let _ = app_handle.emit("library://scan-completed", completed_payload);

                // Reset state back to Idle
                if let Ok(mut ph) = active_phase_clone.lock() {
                    *ph = ScanPhase::Idle;
                }
                if let Ok(mut fid) = active_folder_id_clone.lock() {
                    *fid = None;
                }
                is_scanning_clone.store(false, Ordering::SeqCst);
            })
            .map_err(|e| format!("Failed to spawn worker thread: {}", e))?;

        Ok(ScanJobStartDto {
            folder_id,
            status: "started".to_string(),
            started_at: now,
        })
    }
}
