//! Listening history and popular tracks repository.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::error::DatabaseError;
use super::models::{
    HomeRecommendationCollection, HomeRecommendationKind, HomeRecommendationSource,
    HomeRecommendationsDto, PlayHistoryItemDto, TrackDto,
};
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

/// Prunes history entries older than 30 days (2,592,000 seconds window) based on UTC played_at timestamp (AC-9).
pub fn prune_history_by_age(conn: &mut Connection) -> Result<usize, DatabaseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let cutoff = now - 2_592_000;

    let deleted = conn
        .execute(
            "DELETE FROM listening_history WHERE played_at < ?1",
            params![cutoff],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(deleted)
}

/// Prunes older history entries. Preserved for backwards compatibility, delegating to prune_history_by_age.
pub fn prune_history_if_needed(conn: &mut Connection) -> Result<(), DatabaseError> {
    prune_history_by_age(conn).map(|_| ())
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

    // 30 day age pruning safeguard (AC-9)
    prune_history_by_age(conn)?;

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

/// Computes four dynamic home recommendation collections (Recently Added, Most Played,
/// Best of an Artist, Trending Genre) based on SQLite history and library tracks.
pub fn get_home_recommendations(conn: &Connection) -> Result<HomeRecommendationsDto, DatabaseError> {
    // 1. Capture UTC Unix time in seconds once and calculate 30 day cutoff (AC-5, AC-9)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let cutoff = now - 2_592_000;

    // Total library track count
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
    let library_track_count = count.max(0) as u64;

    let track_select_sql = track_repo::TRACK_SELECT_FIELDS
        .split(',')
        .map(|col| format!("t.{}", col.trim()))
        .collect::<Vec<_>>()
        .join(", ");

    // 2. Recently Added: up to 10 tracks ordered by created_at DESC, title ASC, id ASC (AC-2)
    let recently_added = {
        let sql = format!(
            "SELECT {} FROM tracks t ORDER BY t.created_at DESC, t.title ASC, t.id ASC LIMIT 10",
            track_select_sql
        );
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
        let rows = stmt
            .query_map([], track_repo::map_track_row)
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
        let mut tracks = Vec::new();
        for r in rows {
            tracks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
        }

        let source = if tracks.is_empty() {
            HomeRecommendationSource::None
        } else {
            HomeRecommendationSource::Library
        };

        HomeRecommendationCollection {
            kind: HomeRecommendationKind::RecentlyAdded,
            title: "Recently Added".to_string(),
            source,
            tracks,
        }
    };

    // 3. Most Played: up to 30 tracks where play_count > 0, ordered by play_count DESC, title ASC, id ASC (AC-3, AC-6)
    let most_played = {
        let sql = format!(
            "SELECT {} FROM tracks t WHERE t.play_count > 0 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 30",
            track_select_sql
        );
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
        let rows = stmt
            .query_map([], track_repo::map_track_row)
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
        let mut tracks = Vec::new();
        for r in rows {
            tracks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
        }

        if !tracks.is_empty() {
            HomeRecommendationCollection {
                kind: HomeRecommendationKind::MostPlayed,
                title: "Most Played".to_string(),
                source: HomeRecommendationSource::History,
                tracks,
            }
        } else if library_track_count > 0 {
            // Fallback: up to 30 popular library tracks (AC-6)
            let fallback_tracks = get_popular_tracks(conn, Some(30))?;
            let source = if fallback_tracks.is_empty() {
                HomeRecommendationSource::None
            } else {
                HomeRecommendationSource::Library
            };
            HomeRecommendationCollection {
                kind: HomeRecommendationKind::MostPlayed,
                title: "Most Played".to_string(),
                source,
                tracks: fallback_tracks,
            }
        } else {
            HomeRecommendationCollection {
                kind: HomeRecommendationKind::MostPlayed,
                title: "Most Played".to_string(),
                source: HomeRecommendationSource::None,
                tracks: vec![],
            }
        }
    };

    // 4. Best of an Artist: greatest positive sum of all time play_count, up to 30 tracks (AC-4, AC-6)
    let best_artist = {
        let best_artist_sql = r#"
            SELECT 
                CASE 
                    WHEN t.artist_id IS NOT NULL AND trim(t.artist_id) != '' THEN 'id:' || t.artist_id 
                    ELSE 'name:' || lower(trim(t.artist_name)) 
                END as group_key,
                t.artist_id,
                lower(trim(t.artist_name)) as norm_name,
                SUM(t.play_count) as total_plays
            FROM tracks t
            WHERE t.play_count > 0 AND trim(t.artist_name) != ''
            GROUP BY group_key
            HAVING total_plays > 0
            ORDER BY total_plays DESC, norm_name ASC, group_key ASC
            LIMIT 1
        "#;

        let winning_artist = conn
            .query_row(best_artist_sql, [], |row| {
                let group_key: String = row.get(0)?;
                let artist_id: Option<String> = row.get(1)?;
                let norm_name: String = row.get(2)?;
                let total_plays: i64 = row.get(3)?;
                Ok((group_key, artist_id, norm_name, total_plays))
            })
            .optional()
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        if let Some((group_key, artist_id, norm_name, _total_plays)) = winning_artist {
            let (display_name, tracks) = if group_key.starts_with("id:") {
                let aid = artist_id.unwrap_or_else(|| group_key[3..].to_string());
                let disp_sql = "SELECT t.artist_name FROM tracks t WHERE t.artist_id = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 1";
                let name: String = conn
                    .query_row(disp_sql, params![aid], |r| r.get(0))
                    .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

                let trk_sql = format!(
                    "SELECT {} FROM tracks t WHERE t.artist_id = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 30",
                    track_select_sql
                );
                let mut stmt = conn.prepare(&trk_sql).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                let rows = stmt.query_map(params![aid], track_repo::map_track_row).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                let mut trks = Vec::new();
                for r in rows {
                    trks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
                }
                (name, trks)
            } else {
                let disp_sql = "SELECT t.artist_name FROM tracks t WHERE (t.artist_id IS NULL OR trim(t.artist_id) = '') AND lower(trim(t.artist_name)) = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 1";
                let name: String = conn
                    .query_row(disp_sql, params![norm_name], |r| r.get(0))
                    .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

                let trk_sql = format!(
                    "SELECT {} FROM tracks t WHERE (t.artist_id IS NULL OR trim(t.artist_id) = '') AND lower(trim(t.artist_name)) = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 30",
                    track_select_sql
                );
                let mut stmt = conn.prepare(&trk_sql).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                let rows = stmt.query_map(params![norm_name], track_repo::map_track_row).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                let mut trks = Vec::new();
                for r in rows {
                    trks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
                }
                (name, trks)
            };

            HomeRecommendationCollection {
                kind: HomeRecommendationKind::BestArtist,
                title: format!("Best of {}", display_name),
                source: HomeRecommendationSource::History,
                tracks,
            }
        } else {
            // Fallback (AC-6): identify winning fallback artist by frequency in library tracks
            let fallback_artist_sql = r#"
                SELECT 
                    CASE 
                        WHEN t.artist_id IS NOT NULL AND trim(t.artist_id) != '' THEN 'id:' || t.artist_id 
                        ELSE 'name:' || lower(trim(t.artist_name)) 
                    END as group_key,
                    t.artist_id,
                    lower(trim(t.artist_name)) as norm_name,
                    COUNT(*) as track_count
                FROM tracks t
                WHERE trim(t.artist_name) != ''
                GROUP BY group_key
                ORDER BY track_count DESC, norm_name ASC, group_key ASC
                LIMIT 1
            "#;

            let fallback_artist = conn
                .query_row(fallback_artist_sql, [], |row| {
                    let group_key: String = row.get(0)?;
                    let artist_id: Option<String> = row.get(1)?;
                    let norm_name: String = row.get(2)?;
                    let track_count: i64 = row.get(3)?;
                    Ok((group_key, artist_id, norm_name, track_count))
                })
                .optional()
                .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

            if let Some((group_key, artist_id, norm_name, _count)) = fallback_artist {
                let (display_name, tracks) = if group_key.starts_with("id:") {
                    let aid = artist_id.unwrap_or_else(|| group_key[3..].to_string());
                    let disp_sql = "SELECT t.artist_name FROM tracks t WHERE t.artist_id = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 1";
                    let name: String = conn
                        .query_row(disp_sql, params![aid], |r| r.get(0))
                        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

                    let trk_sql = format!(
                        "SELECT {} FROM tracks t WHERE t.artist_id = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 30",
                        track_select_sql
                    );
                    let mut stmt = conn.prepare(&trk_sql).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                    let rows = stmt.query_map(params![aid], track_repo::map_track_row).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                    let mut trks = Vec::new();
                    for r in rows {
                        trks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
                    }
                    (name, trks)
                } else {
                    let disp_sql = "SELECT t.artist_name FROM tracks t WHERE (t.artist_id IS NULL OR trim(t.artist_id) = '') AND lower(trim(t.artist_name)) = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 1";
                    let name: String = conn
                        .query_row(disp_sql, params![norm_name], |r| r.get(0))
                        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

                    let trk_sql = format!(
                        "SELECT {} FROM tracks t WHERE (t.artist_id IS NULL OR trim(t.artist_id) = '') AND lower(trim(t.artist_name)) = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 30",
                        track_select_sql
                    );
                    let mut stmt = conn.prepare(&trk_sql).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                    let rows = stmt.query_map(params![norm_name], track_repo::map_track_row).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                    let mut trks = Vec::new();
                    for r in rows {
                        trks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
                    }
                    (name, trks)
                };

                let source = if tracks.is_empty() {
                    HomeRecommendationSource::None
                } else {
                    HomeRecommendationSource::Library
                };

                HomeRecommendationCollection {
                    kind: HomeRecommendationKind::BestArtist,
                    title: format!("Best of {}", display_name),
                    source,
                    tracks,
                }
            } else {
                HomeRecommendationCollection {
                    kind: HomeRecommendationKind::BestArtist,
                    title: "Best of an Artist".to_string(),
                    source: HomeRecommendationSource::None,
                    tracks: vec![],
                }
            }
        }
    };

    // 5. Trending Genre: counts listening_history where played_at >= cutoff, grouped by lower(trim(genre)) (AC-5, AC-6)
    let trending_genre = {
        let trending_genre_sql = r#"
            SELECT 
                lower(trim(t.genre)) as norm_genre,
                COUNT(h.id) as play_count
            FROM listening_history h
            JOIN tracks t ON t.id = h.track_id
            WHERE h.played_at >= ?1 AND t.genre IS NOT NULL AND trim(t.genre) != ''
            GROUP BY norm_genre
            ORDER BY play_count DESC, norm_genre ASC
            LIMIT 1
        "#;

        let winning_genre = conn
            .query_row(trending_genre_sql, params![cutoff], |row| {
                let norm_genre: String = row.get(0)?;
                let play_count: i64 = row.get(1)?;
                Ok((norm_genre, play_count))
            })
            .optional()
            .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

        if let Some((norm_genre, _play_count)) = winning_genre {
            let disp_sql = r#"
                SELECT t.genre
                FROM listening_history h
                JOIN tracks t ON t.id = h.track_id
                WHERE h.played_at >= ?1 AND lower(trim(t.genre)) = ?2
                ORDER BY t.title ASC, t.id ASC
                LIMIT 1
            "#;
            let display_name: String = conn
                .query_row(disp_sql, params![cutoff, norm_genre], |r| r.get(0))
                .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

            let trk_sql = format!(
                r#"
                SELECT {}
                FROM tracks t
                JOIN (
                    SELECT track_id, COUNT(*) as recent_cnt
                    FROM listening_history
                    WHERE played_at >= ?1
                    GROUP BY track_id
                ) h ON h.track_id = t.id
                WHERE lower(trim(t.genre)) = ?2
                ORDER BY h.recent_cnt DESC, t.title ASC, t.id ASC
                LIMIT 30
                "#,
                track_select_sql
            );
            let mut stmt = conn
                .prepare(&trk_sql)
                .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
            let rows = stmt
                .query_map(params![cutoff, norm_genre], track_repo::map_track_row)
                .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
            let mut tracks = Vec::new();
            for r in rows {
                tracks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
            }

            HomeRecommendationCollection {
                kind: HomeRecommendationKind::TrendingGenre,
                title: format!("Trending in {}", display_name),
                source: HomeRecommendationSource::History,
                tracks,
            }
        } else {
            // Fallback (AC-6): winning genre from library tracks
            let fallback_genre_sql = r#"
                SELECT 
                    lower(trim(genre)) as norm_genre,
                    COUNT(*) as track_count
                FROM tracks
                WHERE genre IS NOT NULL AND trim(genre) != ''
                GROUP BY norm_genre
                ORDER BY track_count DESC, norm_genre ASC
                LIMIT 1
            "#;

            let fallback_genre = conn
                .query_row(fallback_genre_sql, [], |row| {
                    let norm_genre: String = row.get(0)?;
                    let track_count: i64 = row.get(1)?;
                    Ok((norm_genre, track_count))
                })
                .optional()
                .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

            if let Some((norm_genre, _count)) = fallback_genre {
                let disp_sql = r#"
                    SELECT genre
                    FROM tracks
                    WHERE lower(trim(genre)) = ?1
                    ORDER BY title ASC, id ASC
                    LIMIT 1
                "#;
                let display_name: String = conn
                    .query_row(disp_sql, params![norm_genre], |r| r.get(0))
                    .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

                let trk_sql = format!(
                    "SELECT {} FROM tracks t WHERE lower(trim(t.genre)) = ?1 ORDER BY t.play_count DESC, t.title ASC, t.id ASC LIMIT 30",
                    track_select_sql
                );
                let mut stmt = conn
                    .prepare(&trk_sql)
                    .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                let rows = stmt
                    .query_map(params![norm_genre], track_repo::map_track_row)
                    .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
                let mut tracks = Vec::new();
                for r in rows {
                    tracks.push(r.map_err(|err| DatabaseError::query_failed(err.to_string()))?);
                }

                let source = if tracks.is_empty() {
                    HomeRecommendationSource::None
                } else {
                    HomeRecommendationSource::Library
                };

                HomeRecommendationCollection {
                    kind: HomeRecommendationKind::TrendingGenre,
                    title: format!("Trending in {}", display_name),
                    source,
                    tracks,
                }
            } else {
                HomeRecommendationCollection {
                    kind: HomeRecommendationKind::TrendingGenre,
                    title: "Trending Genre".to_string(),
                    source: HomeRecommendationSource::None,
                    tracks: vec![],
                }
            }
        }
    };

    Ok(HomeRecommendationsDto {
        library_track_count,
        recently_added,
        most_played,
        best_artist,
        trending_genre,
    })
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

    #[test]
    fn test_30_day_history_pruning() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let mut conn_lock = mgr.conn.lock().unwrap();
        let conn = &mut *conn_lock;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let track = TrackDto {
            id: "trk-prune-1".to_string(),
            file_path: "/music/prune1.mp3".to_string(),
            title: "Prune Track".to_string(),
            artist_id: None,
            artist_name: "Artist Prune".to_string(),
            album_id: None,
            album_name: None,
            album_artist: None,
            duration: 120.0,
            year: None,
            genre: Some("Ambient".to_string()),
            disc_number: 1,
            track_number: None,
            bitrate: None,
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: false,
            liked_at: None,
            play_count: 1,
            last_played_at: Some(now),
            file_modified_at: now,
            file_size_bytes: 1000,
            folder_id: None,
            created_at: now,
            updated_at: now,
        };
        track_repo::upsert_track(conn, &track).expect("Track inserted");

        // Old play: 35 days ago (older than 30 days / 2,592,000s cutoff)
        let old_time = now - (35 * 86400);
        conn.execute(
            "INSERT INTO listening_history (id, track_id, played_at) VALUES ('hist-old', 'trk-prune-1', ?1)",
            params![old_time],
        )
        .expect("Old history inserted");

        // Recent play: 5 days ago (within 30 days)
        let recent_time = now - (5 * 86400);
        conn.execute(
            "INSERT INTO listening_history (id, track_id, played_at) VALUES ('hist-recent', 'trk-prune-1', ?1)",
            params![recent_time],
        )
        .expect("Recent history inserted");

        // Execute age pruning
        let deleted = prune_history_by_age(conn).expect("Prune should succeed");
        assert_eq!(deleted, 1);

        // Verify old record was pruned and recent record remains
        let remaining: Vec<String> = conn
            .prepare("SELECT id FROM listening_history ORDER BY played_at ASC")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        assert_eq!(remaining, vec!["hist-recent".to_string()]);
    }

    #[test]
    fn test_home_recommendations_with_history_and_fallbacks() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let mut conn_lock = mgr.conn.lock().unwrap();
        let conn = &mut *conn_lock;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO artists (id, name, created_at, updated_at) VALUES ('art-1', 'Oliver Mtukudzi', ?1, ?1)",
            params![now],
        ).unwrap();
        conn.execute(
            "INSERT INTO artists (id, name, created_at, updated_at) VALUES ('art-2', 'Chiwoniso Maraire', ?1, ?1)",
            params![now],
        ).unwrap();

        // Track A: Artist Oliver, Genre Jazz, play_count 15
        let track_a = TrackDto {
            id: "trk-rec-a".to_string(),
            file_path: "/music/a.mp3".to_string(),
            title: "Song Alpha".to_string(),
            artist_id: Some("art-1".to_string()),
            artist_name: "Oliver Mtukudzi".to_string(),
            album_id: None,
            album_name: Some("Album A".to_string()),
            album_artist: None,
            duration: 180.0,
            year: Some(2020),
            genre: Some("Jazz".to_string()),
            disc_number: 1,
            track_number: Some(1),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: true,
            liked_at: Some(now),
            play_count: 15,
            last_played_at: Some(now),
            file_modified_at: now,
            file_size_bytes: 4000,
            folder_id: None,
            created_at: now - 100,
            updated_at: now,
        };

        // Track B: Artist Oliver, Genre Jazz, play_count 5
        let track_b = TrackDto {
            id: "trk-rec-b".to_string(),
            file_path: "/music/b.mp3".to_string(),
            title: "Song Beta".to_string(),
            artist_id: Some("art-1".to_string()),
            artist_name: "Oliver Mtukudzi".to_string(),
            album_id: None,
            album_name: Some("Album B".to_string()),
            album_artist: None,
            duration: 200.0,
            year: Some(2021),
            genre: Some("Jazz".to_string()),
            disc_number: 1,
            track_number: Some(2),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: false,
            liked_at: None,
            play_count: 5,
            last_played_at: Some(now),
            file_modified_at: now,
            file_size_bytes: 5000,
            folder_id: None,
            created_at: now - 50,
            updated_at: now,
        };

        // Track C: Artist Chiwoniso, Genre Mbira, play_count 8
        let track_c = TrackDto {
            id: "trk-rec-c".to_string(),
            file_path: "/music/c.mp3".to_string(),
            title: "Song Gamma".to_string(),
            artist_id: Some("art-2".to_string()),
            artist_name: "Chiwoniso Maraire".to_string(),
            album_id: None,
            album_name: Some("Album C".to_string()),
            album_artist: None,
            duration: 220.0,
            year: Some(2022),
            genre: Some("Mbira".to_string()),
            disc_number: 1,
            track_number: Some(1),
            bitrate: Some(320),
            format: "mp3".to_string(),
            cover_art_path: None,
            is_favorite: false,
            liked_at: None,
            play_count: 8,
            last_played_at: Some(now),
            file_modified_at: now,
            file_size_bytes: 6000,
            folder_id: None,
            created_at: now - 10,
            updated_at: now,
        };

        track_repo::upsert_track(conn, &track_a).unwrap();
        track_repo::upsert_track(conn, &track_b).unwrap();
        track_repo::upsert_track(conn, &track_c).unwrap();

        // Insert recent history within 30 days for Track A (Jazz) and Track C (Mbira)
        conn.execute(
            "INSERT INTO listening_history (id, track_id, played_at) VALUES ('h-1', 'trk-rec-a', ?1)",
            params![now - 1000],
        ).unwrap();
        conn.execute(
            "INSERT INTO listening_history (id, track_id, played_at) VALUES ('h-2', 'trk-rec-a', ?1)",
            params![now - 2000],
        ).unwrap();
        conn.execute(
            "INSERT INTO listening_history (id, track_id, played_at) VALUES ('h-3', 'trk-rec-c', ?1)",
            params![now - 500],
        ).unwrap();

        let recs = get_home_recommendations(conn).expect("Recommendations queried");
        assert_eq!(recs.library_track_count, 3);

        // 1. Recently Added: newest first (track C created_at now - 10, then B now - 50, then A now - 100)
        assert_eq!(recs.recently_added.kind, HomeRecommendationKind::RecentlyAdded);
        assert_eq!(recs.recently_added.title, "Recently Added");
        assert_eq!(recs.recently_added.source, HomeRecommendationSource::Library);
        assert_eq!(recs.recently_added.tracks.len(), 3);
        assert_eq!(recs.recently_added.tracks[0].id, "trk-rec-c");
        assert_eq!(recs.recently_added.tracks[1].id, "trk-rec-b");
        assert_eq!(recs.recently_added.tracks[2].id, "trk-rec-a");

        // 2. Most Played: play_count DESC (track A 15, then C 8, then B 5)
        assert_eq!(recs.most_played.kind, HomeRecommendationKind::MostPlayed);
        assert_eq!(recs.most_played.title, "Most Played");
        assert_eq!(recs.most_played.source, HomeRecommendationSource::History);
        assert_eq!(recs.most_played.tracks.len(), 3);
        assert_eq!(recs.most_played.tracks[0].id, "trk-rec-a");
        assert_eq!(recs.most_played.tracks[1].id, "trk-rec-c");
        assert_eq!(recs.most_played.tracks[2].id, "trk-rec-b");

        // 3. Best of an Artist: Oliver total 20 (15 + 5), Chiwoniso 8 -> Oliver wins! Formatted title: "Best of Oliver Mtukudzi"
        assert_eq!(recs.best_artist.kind, HomeRecommendationKind::BestArtist);
        assert_eq!(recs.best_artist.title, "Best of Oliver Mtukudzi");
        assert_eq!(recs.best_artist.source, HomeRecommendationSource::History);
        assert_eq!(recs.best_artist.tracks.len(), 2);
        assert_eq!(recs.best_artist.tracks[0].id, "trk-rec-a");
        assert_eq!(recs.best_artist.tracks[1].id, "trk-rec-b");

        // 4. Trending Genre: Jazz has 2 qualifying plays in 30 days, Mbira has 1 -> Jazz wins! Formatted title: "Trending in Jazz"
        assert_eq!(recs.trending_genre.kind, HomeRecommendationKind::TrendingGenre);
        assert_eq!(recs.trending_genre.title, "Trending in Jazz");
        assert_eq!(recs.trending_genre.source, HomeRecommendationSource::History);
        assert_eq!(recs.trending_genre.tracks.len(), 1);
        assert_eq!(recs.trending_genre.tracks[0].id, "trk-rec-a");

        // Clear history and verify fallback behavior (AC-6)
        clear_history(conn).unwrap();
        // Set all play counts to 0 to test pure library fallback
        conn.execute("UPDATE tracks SET play_count = 0", []).unwrap();

        let fallback_recs = get_home_recommendations(conn).expect("Fallback queried");
        assert_eq!(fallback_recs.recently_added.source, HomeRecommendationSource::Library);
        assert_eq!(fallback_recs.most_played.source, HomeRecommendationSource::Library);
        assert_eq!(fallback_recs.best_artist.source, HomeRecommendationSource::Library);
        assert_eq!(fallback_recs.best_artist.title, "Best of Oliver Mtukudzi"); // Oliver has 2 tracks vs Chiwoniso 1
        assert_eq!(fallback_recs.trending_genre.source, HomeRecommendationSource::Library);
        assert_eq!(fallback_recs.trending_genre.title, "Trending in Jazz"); // Jazz has 2 tracks vs Mbira 1
    }

    #[test]
    fn test_home_recommendations_empty_library() {
        let mgr = DatabaseManager::new_in_memory().expect("In memory database should open");
        let conn_lock = mgr.conn.lock().unwrap();
        let conn = &*conn_lock;

        let recs = get_home_recommendations(conn).expect("Recommendations queried");
        assert_eq!(recs.library_track_count, 0);
        assert_eq!(recs.recently_added.source, HomeRecommendationSource::None);
        assert!(recs.recently_added.tracks.is_empty());
        assert_eq!(recs.most_played.source, HomeRecommendationSource::None);
        assert!(recs.most_played.tracks.is_empty());
        assert_eq!(recs.best_artist.source, HomeRecommendationSource::None);
        assert!(recs.best_artist.tracks.is_empty());
        assert_eq!(recs.trending_genre.source, HomeRecommendationSource::None);
        assert!(recs.trending_genre.tracks.is_empty());
    }
}
