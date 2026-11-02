//! Listening history and popular tracks repository.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, Row};

use super::error::DatabaseError;
use super::models::{PlayHistoryItemDto, TrackDto};
use super::track_repo;

/// Helper to map joined track columns at a given offset in a Row into TrackDto.
fn map_joined_track_row(row: &Row<'_>, offset: usize) -> Result<TrackDto, rusqlite::Error> {
    let is_fav_int: i32 = row.get(offset + 15)?;
    let play_cnt_int: i64 = row.get(offset + 17)?;
    Ok(TrackDto {
        id: row.get(offset)?,
        file_path: row.get(offset + 1)?,
        title: row.get(offset + 2)?,
        artist_id: row.get(offset + 3)?,
        artist_name: row.get(offset + 4)?,
        album_id: row.get(offset + 5)?,
        album_name: row.get(offset + 6)?,
        album_artist: row.get(offset + 7)?,
        duration: row.get(offset + 8)?,
        year: row.get(offset + 9)?,
        genre: row.get(offset + 10)?,
        disc_number: row.get(offset + 11)?,
        track_number: row.get(offset + 12)?,
        bitrate: row.get(offset + 13)?,
        format: row.get(offset + 14)?,
        is_favorite: is_fav_int == 1,
        liked_at: row.get(offset + 16)?,
        play_count: play_cnt_int as u32,
        cover_art_path: row.get(offset + 18)?,
        last_played_at: row.get(offset + 19)?,
        file_modified_at: row.get(offset + 20)?,
        file_size_bytes: row.get(offset + 21)?,
        folder_id: row.get(offset + 22)?,
        created_at: row.get(offset + 23)?,
        updated_at: row.get(offset + 24)?,
    })
}

/// Prunes older history entries when row count exceeds 1050, retaining the 1000 most recent records.
pub fn prune_history_if_needed(conn: &mut Connection) -> Result<(), DatabaseError> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM listening_history", [], |row| {
            row.get(0)
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    if count > 1050 {
        conn.execute(
            r#"
            DELETE FROM listening_history
            WHERE id NOT IN (
                SELECT id FROM listening_history
                ORDER BY played_at DESC
                LIMIT 1000
            )
            "#,
            [],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;
    }

    Ok(())
}

/// Records a playback session in listening_history, increments track play count, and returns the DTO.
pub fn record_playback(
    conn: &mut Connection,
    track_id: &str,
    context_title: Option<&str>,
    context_type: Option<&str>,
) -> Result<PlayHistoryItemDto, DatabaseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let history_id = format!("hist-{}", uuid::Uuid::new_v4());

    conn.execute(
        r#"
        INSERT INTO listening_history (id, track_id, played_at, context_title, context_type)
        VALUES (?1, ?2, ?3, ?4, ?5)
        "#,
        params![history_id, track_id, now, context_title, context_type],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    // Increment play count and update last_played_at on track
    track_repo::increment_play_count(conn, track_id)?;

    // Batch pruning safeguard
    prune_history_if_needed(conn)?;

    // Fetch the joined track
    let track = track_repo::get_track_by_id(conn, track_id)?.ok_or_else(|| {
        DatabaseError::track_not_found(format!("Track with id {} not found", track_id))
    })?;

    Ok(PlayHistoryItemDto {
        id: history_id,
        track_id: track_id.to_string(),
        played_at: now,
        context_title: context_title.map(|s| s.to_string()),
        context_type: context_type.map(|s| s.to_string()),
        track,
    })
}

/// Queries distinct recent tracks deduplicated by track identifier, ordered by most recent playback.
pub fn get_recent_plays(
    conn: &Connection,
    limit: Option<u32>,
) -> Result<Vec<PlayHistoryItemDto>, DatabaseError> {
    let max_results = limit.unwrap_or(20) as i64;

    let query = format!(
        r#"
        WITH latest_plays AS (
            SELECT MAX(rowid) as max_rowid
            FROM listening_history
            GROUP BY track_id
        )
        SELECT 
            h.id, h.track_id, h.played_at, h.context_title, h.context_type,
            {}
        FROM listening_history h
        JOIN latest_plays lp ON h.rowid = lp.max_rowid
        JOIN tracks t ON t.id = h.track_id
        ORDER BY h.played_at DESC, h.rowid DESC
        LIMIT ?1
        "#,
        track_repo::TRACK_SELECT_FIELDS
            .split(',')
            .map(|col| format!("t.{}", col.trim()))
            .collect::<Vec<_>>()
            .join(", ")
    );

    let mut stmt = conn
        .prepare(&query)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let rows = stmt
        .query_map([max_results], |row| {
            let id: String = row.get(0)?;
            let track_id: String = row.get(1)?;
            let played_at: i64 = row.get(2)?;
            let context_title: Option<String> = row.get(3)?;
            let context_type: Option<String> = row.get(4)?;
            let track = map_joined_track_row(row, 5)?;

            Ok(PlayHistoryItemDto {
                id,
                track_id,
                played_at,
                context_title,
                context_type,
                track,
            })
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
    }

    Ok(results)
}

/// Queries popular tracks ordered by play_count descending with graceful unplayed backfill.
pub fn get_popular_tracks(
    conn: &Connection,
    limit: Option<u32>,
) -> Result<Vec<TrackDto>, DatabaseError> {
    let max_results = limit.unwrap_or(10) as i64;

    let query_played = format!(
        "SELECT {} FROM tracks WHERE play_count > 0 ORDER BY play_count DESC, title ASC LIMIT ?1",
        track_repo::TRACK_SELECT_FIELDS
    );

    let mut stmt = conn
        .prepare(&query_played)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let played_tracks = stmt
        .query_map([max_results], track_repo::map_track_row)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut tracks = Vec::new();
    for t in played_tracks {
        tracks.push(t.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
    }

    if (tracks.len() as i64) < max_results {
        let remaining = max_results - (tracks.len() as i64);
        let query_backfill = format!(
            "SELECT {} FROM tracks WHERE play_count = 0 ORDER BY is_favorite DESC, liked_at DESC NULLS LAST, created_at DESC LIMIT ?1",
            track_repo::TRACK_SELECT_FIELDS
        );

        let mut backfill_stmt = conn
            .prepare(&query_backfill)
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        let backfill_rows = backfill_stmt
            .query_map([remaining], track_repo::map_track_row)
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        for t in backfill_rows {
            tracks.push(t.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
        }
    }

    Ok(tracks)
}

/// Clears all entries from the listening_history table, preserving track play counts.
pub fn clear_history(conn: &mut Connection) -> Result<(), DatabaseError> {
    conn.execute("DELETE FROM listening_history", [])
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::connection::DatabaseManager;
    use super::super::track_repo;
    use super::*;

    #[test]
    fn test_listening_history_and_popular_tracks() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let mut conn_lock = mgr.conn.lock().unwrap();
        let conn = &mut *conn_lock;

        let track1 = TrackDto {
            id: "trk-hist-1".to_string(),
            file_path: "/music/track1.mp3".to_string(),
            title: "Track One".to_string(),
            artist_id: None,
            artist_name: "Artist Alpha".to_string(),
            album_id: None,
            album_name: Some("Album Alpha".to_string()),
            album_artist: None,
            duration: 200.0,
            year: Some(2023),
            genre: Some("Electronic".to_string()),
            disc_number: 1,
            track_number: Some(1),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: true,
            liked_at: Some(1700000000),
            play_count: 5,
            last_played_at: Some(1700000100),
            file_modified_at: 1700000000,
            file_size_bytes: 5000000,
            folder_id: None,
            created_at: 1700000000,
            updated_at: 1700000000,
        };

        let track2 = TrackDto {
            id: "trk-hist-2".to_string(),
            file_path: "/music/track2.mp3".to_string(),
            title: "Track Two".to_string(),
            artist_id: None,
            artist_name: "Artist Beta".to_string(),
            album_id: None,
            album_name: Some("Album Beta".to_string()),
            album_artist: None,
            duration: 180.0,
            year: Some(2024),
            genre: Some("Indie".to_string()),
            disc_number: 1,
            track_number: Some(2),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: false,
            liked_at: None,
            play_count: 0,
            last_played_at: None,
            file_modified_at: 1700000000,
            file_size_bytes: 4000000,
            folder_id: None,
            created_at: 1700000010,
            updated_at: 1700000010,
        };

        let track3 = TrackDto {
            id: "trk-hist-3".to_string(),
            file_path: "/music/track3.mp3".to_string(),
            title: "Track Three".to_string(),
            artist_id: None,
            artist_name: "Artist Gamma".to_string(),
            album_id: None,
            album_name: Some("Album Gamma".to_string()),
            album_artist: None,
            duration: 210.0,
            year: Some(2024),
            genre: Some("Rock".to_string()),
            disc_number: 1,
            track_number: Some(3),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: false,
            liked_at: None,
            play_count: 20,
            last_played_at: Some(1700000200),
            file_modified_at: 1700000000,
            file_size_bytes: 6000000,
            folder_id: None,
            created_at: 1700000020,
            updated_at: 1700000020,
        };

        track_repo::upsert_track(conn, &track1).expect("Track 1 inserted");
        track_repo::upsert_track(conn, &track2).expect("Track 2 inserted");
        track_repo::upsert_track(conn, &track3).expect("Track 3 inserted");

        // Record playback on track2
        let hist1 = record_playback(conn, "trk-hist-2", Some("Album Beta"), Some("album"))
            .expect("Playback recorded");
        assert_eq!(hist1.track_id, "trk-hist-2");
        assert_eq!(hist1.context_title.as_deref(), Some("Album Beta"));
        assert_eq!(hist1.context_type.as_deref(), Some("album"));
        assert_eq!(hist1.track.title, "Track Two");

        // Verify track2 play_count incremented from 0 to 1
        let updated_t2 = track_repo::get_track_by_id(conn, "trk-hist-2")
            .expect("Query succeeds")
            .expect("Track exists");
        assert_eq!(updated_t2.play_count, 1);
        assert!(updated_t2.last_played_at.is_some());

        // Record another play on track2 (deduplication check)
        record_playback(
            conn,
            "trk-hist-2",
            Some("Custom Playlist"),
            Some("playlist"),
        )
        .expect("Second play recorded");

        // Record play on track1
        record_playback(conn, "trk-hist-1", None, None).expect("Track 1 play recorded");

        // Query recent plays: should return track1 and track2 deduplicated (len = 2)
        let recents = get_recent_plays(conn, Some(10)).expect("Recent plays queried");
        assert_eq!(recents.len(), 2);
        assert_eq!(recents[0].track_id, "trk-hist-1");
        assert_eq!(recents[1].track_id, "trk-hist-2");

        // Query popular tracks:
        // track3 has 20 plays, track1 has 6 plays (5 + 1), track2 has 2 plays (0 + 2).
        let popular = get_popular_tracks(conn, Some(10)).expect("Popular tracks queried");
        assert_eq!(popular.len(), 3);
        assert_eq!(popular[0].id, "trk-hist-3");
        assert_eq!(popular[0].play_count, 20);
        assert_eq!(popular[1].id, "trk-hist-1");
        assert_eq!(popular[1].play_count, 6);
        assert_eq!(popular[2].id, "trk-hist-2");
        assert_eq!(popular[2].play_count, 2);

        // Test clear_history
        clear_history(conn).expect("History cleared");
        let empty_recents = get_recent_plays(conn, Some(10)).expect("Recents queried");
        assert_eq!(empty_recents.len(), 0);

        // Verify play counts are preserved even after history is cleared
        let popular_after_clear = get_popular_tracks(conn, Some(10)).expect("Popular queried");
        assert_eq!(popular_after_clear.len(), 3);
        assert_eq!(popular_after_clear[0].play_count, 20);

        // Verify foreign key cascade deletion
        record_playback(conn, "trk-hist-3", None, None).expect("Play recorded for track 3");
        assert_eq!(get_recent_plays(conn, Some(10)).unwrap().len(), 1);
        conn.execute("DELETE FROM tracks WHERE id = 'trk-hist-3'", [])
            .expect("Track deleted");
        assert_eq!(get_recent_plays(conn, Some(10)).unwrap().len(), 0);
    }
}
