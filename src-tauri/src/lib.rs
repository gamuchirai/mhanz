//! Mumhanzi application runtime, lifecycle initialization, and Tauri IPC registration.

use tauri::{Emitter, Manager};

pub mod commands;
pub mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_local_data_dir()
                .expect("Failed to resolve local app data directory");
            let db_path = app_data_dir.join("mumhanzi.db");

            let db_manager = db::DatabaseManager::new_at_path(&db_path)
                .expect("Failed to initialize SQLite database and migrations");

            if db_manager.corrupt_backup_created {
                let _ = app.emit("db:corrupt-backup-restored", ());
            }

            app.manage(db::DbState::new(db_manager));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db::db_get_status,
            commands::db::db_get_folders,
            commands::db::db_add_folder,
            commands::db::db_remove_folder,
            commands::db::db_get_tracks,
            commands::db::db_get_track_by_id,
            commands::db::db_toggle_track_favorite,
            commands::db::db_increment_play_count,
            commands::db::db_get_albums,
            commands::db::db_get_album_details,
            commands::db::db_get_artists,
            commands::db::db_get_artist_profile,
            commands::db::db_get_playlists,
            commands::db::db_get_playlist_details,
            commands::db::db_create_playlist,
            commands::db::db_update_playlist,
            commands::db::db_delete_playlist,
            commands::db::db_add_tracks_to_playlist,
            commands::db::db_remove_playlist_track,
            commands::db::db_reorder_playlist_tracks,
            commands::db::db_get_setting,
            commands::db::db_set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
