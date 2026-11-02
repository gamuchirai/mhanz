//! Lyrics parsing, companion lrc extraction, and metadata tag resolution.

pub mod extractor;
pub mod parser;

pub use extractor::get_or_extract_lyrics;
pub use parser::{parse_lrc, ParsedLyrics};

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;

    use crate::db::connection::DatabaseManager;
    use crate::db::models::TrackDto;
    use crate::db::track_repo;

    #[test]
    fn test_companion_file_priority_over_fallback() {
        let temp_dir =
            std::env::temp_dir().join(format!("mutinhimira_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).expect("Temporary directory created");

        let audio_path = temp_dir.join("song.mp3");
        let lrc_path = temp_dir.join("song.lrc");

        // Create dummy audio file
        File::create(&audio_path).expect("Audio file created");

        // Create companion LRC file
        let mut lrc_file = File::create(&lrc_path).expect("LRC file created");
        writeln!(
            lrc_file,
            "[00:02.00]Companion first line\n[00:08.50]Companion second line"
        )
        .expect("LRC written");

        let manager = DatabaseManager::new_in_memory().expect("Database initialized");
        let track_id = "test-track-companion";

        let track = TrackDto {
            id: track_id.to_string(),
            file_path: audio_path.to_string_lossy().to_string(),
            title: "Companion Song".to_string(),
            artist_id: None,
            artist_name: "Artist".to_string(),
            album_id: None,
            album_name: None,
            album_artist: None,
            duration: 120.0,
            year: None,
            genre: None,
            disc_number: 1,
            track_number: Some(1),
            bitrate: None,
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: false,
            liked_at: None,
            play_count: 0,
            last_played_at: None,
            file_modified_at: 1700000000,
            file_size_bytes: 1000,
            folder_id: None,
            created_at: 1700000000,
            updated_at: 1700000000,
        };

        manager
            .with_conn(|conn| track_repo::upsert_track(conn, &track))
            .expect("Track inserted");

        // 1. Extract lyrics (should read from companion .lrc file)
        let lyrics = manager
            .with_conn(|conn| get_or_extract_lyrics(conn, track_id, false))
            .expect("Lyrics extracted");

        assert!(lyrics.has_lyrics);
        assert!(lyrics.is_synced);
        assert_eq!(lyrics.source_type, "lrc");
        assert_eq!(lyrics.lines.len(), 2);
        assert_eq!(lyrics.lines[0].text, "Companion first line");
        assert_eq!(lyrics.lines[0].time_seconds, 2.0);

        // 2. Modify companion file and adjust cached timestamp to simulate disk modification
        let mut updated_lrc = File::create(&lrc_path).expect("LRC recreated");
        writeln!(updated_lrc, "[00:04.00]Updated companion line").expect("LRC re-written");

        // Simulate stale cache timestamp in SQLite
        manager
            .with_conn(|conn| {
                conn.execute(
                    "UPDATE track_lyrics SET source_modified_at = source_modified_at - 10 WHERE track_id = ?1",
                    rusqlite::params![track_id],
                )
                .map_err(|e| crate::db::DatabaseError::write_failed(e.to_string()))?;
                Ok(())
            })
            .expect("Cache timestamp adjusted");

        let fresh_lyrics = manager
            .with_conn(|conn| get_or_extract_lyrics(conn, track_id, false))
            .expect("Fresh lyrics extracted");

        assert_eq!(fresh_lyrics.lines.len(), 1);
        assert_eq!(fresh_lyrics.lines[0].text, "Updated companion line");
        assert_eq!(fresh_lyrics.lines[0].time_seconds, 4.0);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
