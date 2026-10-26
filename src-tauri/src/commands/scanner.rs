//! Tauri IPC command handlers for local library folder scanning and progress monitoring.

use tauri::{AppHandle, Manager, State};

use crate::db::DbState;
use crate::scanner::{ActiveScanStatusDto, ScanJobStartDto, ScannerState};

/// Initiates background folder scanning and metadata extraction for a registered folder (AC-11).
#[tauri::command]
pub async fn scanner_scan_folder(
    folder_id: String,
    db_state: State<'_, DbState>,
    scanner_state: State<'_, ScannerState>,
    app: AppHandle,
) -> Result<ScanJobStartDto, String> {
    let covers_dir = app
        .path()
        .app_cache_dir()
        .unwrap_or_else(|_| {
            app.path()
                .app_local_data_dir()
                .expect("Failed to resolve app directory")
        })
        .join("covers");

    scanner_state
        .0
        .start_scan_folder(folder_id, db_state.0.clone(), app, covers_dir)
}

/// Cancels an active or pending background library scan (AC-11).
#[tauri::command]
pub fn scanner_cancel_scan(
    folder_id: Option<String>,
    scanner_state: State<'_, ScannerState>,
) -> Result<bool, String> {
    scanner_state.0.cancel_scan(folder_id)
}

/// Queries current status of the library scanner coordinator (AC-11).
#[tauri::command]
pub fn scanner_get_scan_status(
    scanner_state: State<'_, ScannerState>,
) -> Result<ActiveScanStatusDto, String> {
    Ok(scanner_state.0.get_status())
}
