//! Unit and integration tests for audio discovery, metadata extraction, batch upserts, and pruning.

#[cfg(test)]
mod tests {
    use std::collections::{HashMap, HashSet};
    use std::fs::{self, File};
    use std::io::Write;
    use std::path::PathBuf;

    use crate::db::DatabaseManager;
    use crate::scanner::batch_writer::{commit_track_batch, prune_missing_folder_tracks};
    use crate::scanner::discovery::{discover_audio_files, is_supported_audio_extension};
    use crate::scanner::models::ScannedTrackData;
    use crate::scanner::service::ScannerManager;

    fn create_test_temp_dir(suffix: &str) -> PathBuf {
        let temp_dir =
            std::env::temp_dir().join(format!("Mutinhimira_test_{}_{}", suffix, uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).expect("Failed to create test temp dir");
        temp_dir
    }

    #[test]
    fn test_supported_extensions() {
        assert!(is_supported_audio_extension("mp3"));
        assert!(is_supported_audio_extension("MP3"));
        assert!(is_supported_audio_extension("flac"));
        assert!(is_supported_audio_extension("wav"));
        assert!(is_supported_audio_extension("ogg"));
        assert!(is_supported_audio_extension("m4a"));
        assert!(is_supported_audio_extension("aac"));
        assert!(is_supported_audio_extension("opus"));
        assert!(is_supported_audio_extension("aiff"));

        assert!(!is_supported_audio_extension("txt"));
        assert!(!is_supported_audio_extension("jpg"));
        assert!(!is_supported_audio_extension("exe"));
    }

    #[test]
    fn test_recursive_discovery_and_differential_checks() {
        let temp_dir = create_test_temp_dir("discovery");
        let sub_dir = temp_dir.join("nested").join("album");
        fs::create_dir_all(&sub_dir).expect("Create nested dir");

        // Create sample audio and non-audio files
        let f1 = temp_dir.join("track1.mp3");
        let f2 = sub_dir.join("track2.flac");
        let f3 = temp_dir.join("readme.txt");
        let f4 = temp_dir.join(".hidden_track.mp3");

        File::create(&f1)
            .unwrap()
            .write_all(b"fake mp3 audio")
            .unwrap();
        File::create(&f2)
            .unwrap()
            .write_all(b"fake flac audio")
            .unwrap();
        File::create(&f3).unwrap().write_all(b"text info").unwrap();
        File::create(&f4).unwrap().write_all(b"hidden").unwrap();

        // 1. Initial discovery with empty existing map (AC-1)
        let empty_map = HashMap::new();
        let res = discover_audio_files(&temp_dir, &empty_map).expect("Discovery should succeed");

        assert_eq!(res.files_to_parse.len(), 2);
        assert_eq!(res.all_disk_paths.len(), 2);
        assert_eq!(res.unchanged_count, 0);

        let discovered_names: Vec<String> = res
            .files_to_parse
            .iter()
            .map(|f| f.path.file_name().unwrap().to_string_lossy().to_string())
            .collect();

        assert!(discovered_names.contains(&"track1.mp3".to_string()));
        assert!(discovered_names.contains(&"track2.flac".to_string()));
        assert!(!discovered_names.contains(&"readme.txt".to_string()));
        assert!(!discovered_names.contains(&".hidden_track.mp3".to_string()));

        // 2. Differential discovery: pre-populate f1 timestamp in map (AC-2)
        let f1_meta = fs::metadata(&f1).unwrap();
        let f1_modified = f1_meta
            .modified()
            .unwrap()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let mut existing_map = HashMap::new();
        existing_map.insert(f1.to_string_lossy().to_string(), f1_modified);

        let diff_res =
            discover_audio_files(&temp_dir, &existing_map).expect("Diff discovery should succeed");
        assert_eq!(diff_res.files_to_parse.len(), 1);
        assert_eq!(diff_res.unchanged_count, 1);
        assert_eq!(diff_res.all_disk_paths.len(), 2);
        assert_eq!(
            diff_res.files_to_parse[0]
                .path
                .file_name()
                .unwrap()
                .to_string_lossy(),
            "track2.flac"
        );

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_disconnected_folder_safety() {
        let non_existent = PathBuf::from("Z:\\definitely_missing_drive_99999\\music");
        let empty_map = HashMap::new();
        let res = discover_audio_files(&non_existent, &empty_map);
        assert!(
            res.is_err(),
            "Should return error when folder root does not exist (AC-9)"
        );
    }

    #[test]
    fn test_batch_upsert_and_user_stats_preservation() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let mut conn = mgr.conn.lock().unwrap();

        // Register test folder
        conn.execute(
            "INSERT INTO folders (id, path, added_at, is_active) VALUES (?1, ?2, ?3, 1)",
            ["folder-test-1", "/music/test", "1000"],
        )
        .unwrap();

        let track1 = ScannedTrackData {
            file_path: "/music/test/song1.mp3".to_string(),
            title: "Original Title".to_string(),
            artist_name: "Original Artist".to_string(),
            album_title: "Original Album".to_string(),
            album_artist: None,
            duration: 180.5,
            year: Some(2024),
            genre: Some("Rock".to_string()),
            disc_number: 1,
            track_number: Some(1),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: Some("/cache/covers/abc.jpg".to_string()),
            file_modified_at: 1000,
            file_size_bytes: 5000000,
            folder_id: "folder-test-1".to_string(),
        };

        let empty_existing = HashMap::new();
        let stats = commit_track_batch(&mut conn, &[track1.clone()], &empty_existing)
            .expect("First batch commit should succeed");

        assert_eq!(stats.new_tracks, 1);
        assert_eq!(stats.updated_tracks, 0);

        // Verify inserted track and user defaults
        let (id, fav, play_count): (String, i32, i64) = conn
            .query_row(
                "SELECT id, is_favorite, play_count FROM tracks WHERE file_path = ?1",
                [&track1.file_path],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();

        assert_eq!(fav, 0);
        assert_eq!(play_count, 0);

        // User interacts: likes the song and plays it 7 times
        conn.execute(
            "UPDATE tracks SET is_favorite = 1, play_count = 7, last_played_at = 2000 WHERE id = ?1",
            [&id],
        )
        .unwrap();

        // Now simulate a rescan where metadata changed on disk (AC-7)
        let mut updated_track1 = track1.clone();
        updated_track1.title = "Updated Remastered Title".to_string();
        updated_track1.bitrate = Some(320);
        updated_track1.file_modified_at = 3000;

        let mut existing_paths = HashMap::new();
        existing_paths.insert(track1.file_path.clone(), 1000);

        let update_stats = commit_track_batch(&mut conn, &[updated_track1], &existing_paths)
            .expect("Rescan batch commit should succeed");

        assert_eq!(update_stats.new_tracks, 0);
        assert_eq!(update_stats.updated_tracks, 1);

        // Verify title updated, but is_favorite, play_count, and last_played_at were preserved!
        let (updated_title, fav_after, play_count_after, last_played_after): (String, i32, i64, Option<i64>) = conn
            .query_row(
                "SELECT title, is_favorite, play_count, last_played_at FROM tracks WHERE file_path = ?1",
                [&track1.file_path],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .unwrap();

        assert_eq!(updated_title, "Updated Remastered Title");
        assert_eq!(fav_after, 1, "is_favorite must be preserved on rescan");
        assert_eq!(
            play_count_after, 7,
            "play_count must be preserved on rescan"
        );
        assert_eq!(
            last_played_after,
            Some(2000),
            "last_played_at must be preserved"
        );
    }

    #[test]
    fn test_pruning_missing_tracks_and_orphans() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let mut conn = mgr.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO folders (id, path, added_at, is_active) VALUES ('f1', '/music/folder', 1000, 1)",
            [],
        )
        .unwrap();

        let track_a = ScannedTrackData {
            file_path: "/music/folder/track_a.mp3".to_string(),
            title: "Track A".to_string(),
            artist_name: "Artist A".to_string(),
            album_title: "Album A".to_string(),
            album_artist: None,
            duration: 120.0,
            year: None,
            genre: None,
            disc_number: 1,
            track_number: None,
            bitrate: None,
            format: "mp3".to_string(),
            cover_art_path: None,
            file_modified_at: 1000,
            file_size_bytes: 1000,
            folder_id: "f1".to_string(),
        };

        let track_b = ScannedTrackData {
            file_path: "/music/folder/track_b.mp3".to_string(),
            title: "Track B".to_string(),
            artist_name: "Artist B".to_string(),
            album_title: "Album B".to_string(),
            album_artist: None,
            duration: 150.0,
            year: None,
            genre: None,
            disc_number: 1,
            track_number: None,
            bitrate: None,
            format: "mp3".to_string(),
            cover_art_path: None,
            file_modified_at: 1000,
            file_size_bytes: 1000,
            folder_id: "f1".to_string(),
        };

        let empty = HashMap::new();
        commit_track_batch(&mut conn, &[track_a, track_b], &empty).unwrap();

        let track_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tracks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(track_count, 2);

        // Pruning: disk scan only found track_a, track_b was deleted from disk (AC-8)
        let mut active_disk = HashSet::new();
        active_disk.insert("/music/folder/track_a.mp3".to_string());

        let removed = prune_missing_folder_tracks(&mut conn, "f1", &active_disk).unwrap();
        assert_eq!(removed, 1);

        let track_count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM tracks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(track_count_after, 1);

        // Orphaned Artist B and Album B must be cleaned up
        let artist_b_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM artists WHERE name = 'Artist B'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(artist_b_count, 0, "Orphaned artist must be deleted");

        // Folder last_scanned_at must be populated
        let last_scanned: Option<i64> = conn
            .query_row(
                "SELECT last_scanned_at FROM folders WHERE id = 'f1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert!(last_scanned.is_some() && last_scanned.unwrap() > 0);
    }

    #[test]
    fn test_scanner_manager_status_and_cancel_guards() {
        let manager = ScannerManager::new();
        let status = manager.get_status();

        assert!(!status.is_scanning);
        assert_eq!(status.phase, "idle");
        assert_eq!(status.scanned_files, 0);

        // Cancel when no scan running should error (AC-11)
        let cancel_res = manager.cancel_scan(None);
        assert_eq!(cancel_res.unwrap_err(), "NO_ACTIVE_SCAN");
    }
}
