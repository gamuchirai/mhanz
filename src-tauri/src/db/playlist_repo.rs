//! Playlist repository supporting creation, renaming, deletion, track appending, and transactional reordering.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use super::error::DatabaseError;
use super::models::{PlaylistDetailDto, PlaylistDto, PlaylistInputDto, PlaylistTrackDto, TrackDto};

/// Returns total count of user playlists.
pub fn count_playlists(conn: &Connection) -> Result<u64, DatabaseError> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM playlists", [], |row| row.get(0))
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
    Ok(count as u64)
}

/// Retrieves all user playlists sorted by creation time.
pub fn get_playlists(conn: &Connection) -> Result<Vec<PlaylistDto>, DatabaseError> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                p.id, p.name, p.description, p.cover_art_path, p.gradient_preset,
                p.is_favorite, p.is_curated,
                COUNT(pt.id) as track_count,
                p.created_at, p.updated_at
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
            GROUP BY p.id
            ORDER BY p.is_curated DESC, p.created_at DESC
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let iter = stmt
        .query_map([], |row| {
            let is_fav_int: i32 = row.get(5)?;
            let is_curated_int: i32 = row.get(6)?;
            let trk_cnt: i64 = row.get(7)?;
            Ok(PlaylistDto {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                cover_art_path: row.get(3)?,
                gradient_preset: row.get(4)?,
                is_favorite: is_fav_int == 1,
                is_curated: is_curated_int == 1,
                track_count: trk_cnt as u32,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut list = Vec::new();
    for p_res in iter {
        list.push(p_res?);
    }
    Ok(list)
}

/// Creates a new empty user playlist with structured metadata.
pub fn create_playlist(
    conn: &mut Connection,
    payload: &PlaylistInputDto,
) -> Result<PlaylistDto, DatabaseError> {
    let trimmed = payload.name.trim();
    if trimmed.is_empty() {
        return Err(DatabaseError::invalid_name("Playlist name cannot be empty"));
    }

    let id = payload
        .id
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    conn.execute(
        r#"
        INSERT INTO playlists (
            id, name, description, cover_art_path, gradient_preset,
            is_favorite, is_curated, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6, ?6)
        "#,
        params![
            id,
            trimmed,
            payload.description,
            payload.cover_art_path,
            payload.gradient_preset,
            now
        ],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(PlaylistDto {
        id,
        name: trimmed.to_string(),
        description: payload.description.clone(),
        cover_art_path: payload.cover_art_path.clone(),
        gradient_preset: payload.gradient_preset.clone(),
        is_favorite: false,
        is_curated: false,
        track_count: 0,
        created_at: now,
        updated_at: now,
    })
}

/// Updates playlist metadata ensuring curated playlists are immutable.
pub fn update_playlist(
    conn: &mut Connection,
    id: &str,
    payload: &PlaylistInputDto,
) -> Result<PlaylistDto, DatabaseError> {
    let trimmed = payload.name.trim();
    if trimmed.is_empty() {
        return Err(DatabaseError::invalid_name("Playlist name cannot be empty"));
    }

    let is_curated_int: i32 = conn
        .query_row(
            "SELECT is_curated FROM playlists WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => {
                DatabaseError::playlist_not_found(format!("Playlist with id {} not found", id))
            }
            _ => DatabaseError::query_failed(err.to_string()),
        })?;

    if is_curated_int == 1 {
        return Err(DatabaseError::write_failed(
            "Curated playlists cannot be modified",
        ));
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let rows_updated = conn
        .execute(
            r#"
            UPDATE playlists
            SET name = ?1,
                description = ?2,
                cover_art_path = ?3,
                gradient_preset = ?4,
                updated_at = ?5
            WHERE id = ?6
            "#,
            params![
                trimmed,
                payload.description,
                payload.cover_art_path,
                payload.gradient_preset,
                now,
                id
            ],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    if rows_updated == 0 {
        return Err(DatabaseError::playlist_not_found(format!(
            "Playlist with id {} not found",
            id
        )));
    }

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let playlist_row = conn
        .query_row(
            r#"
            SELECT id, name, description, cover_art_path, gradient_preset,
                   is_favorite, is_curated, created_at, updated_at
            FROM playlists WHERE id = ?1
            "#,
            params![id],
            |row| {
                let is_fav_int: i32 = row.get(5)?;
                let is_cur_int: i32 = row.get(6)?;
                Ok(PlaylistDto {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    cover_art_path: row.get(3)?,
                    gradient_preset: row.get(4)?,
                    is_favorite: is_fav_int == 1,
                    is_curated: is_cur_int == 1,
                    track_count: count as u32,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    Ok(playlist_row)
}

/// Deletes a playlist and cascades deletion of its playlist_tracks entries.
pub fn delete_playlist(conn: &mut Connection, id: &str) -> Result<bool, DatabaseError> {
    let is_curated_int: i32 = conn
        .query_row(
            "SELECT is_curated FROM playlists WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => {
                DatabaseError::playlist_not_found(format!("Playlist with id {} not found", id))
            }
            _ => DatabaseError::query_failed(err.to_string()),
        })?;

    if is_curated_int == 1 {
        return Err(DatabaseError::write_failed(
            "Curated playlists cannot be deleted",
        ));
    }

    let rows_deleted = conn
        .execute("DELETE FROM playlists WHERE id = ?1", params![id])
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    if rows_deleted == 0 {
        return Err(DatabaseError::playlist_not_found(format!(
            "Playlist with id {} not found",
            id
        )));
    }

    Ok(true)
}

/// Appends multiple tracks to the end of a playlist sequentially.
pub fn add_tracks_to_playlist(
    conn: &mut Connection,
    playlist_id: &str,
    track_ids: &[String],
) -> Result<u32, DatabaseError> {
    // Verify playlist exists
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM playlists WHERE id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    if exists == 0 {
        return Err(DatabaseError::playlist_not_found(format!(
            "Playlist with id {} not found",
            playlist_id
        )));
    }

    let current_max: Option<i32> = conn
        .query_row(
            "SELECT MAX(position) FROM playlist_tracks WHERE playlist_id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )
        .unwrap_or(None);

    let initial_pos = match current_max {
        Some(pos) => pos + 1,
        None => 0,
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let tx = conn
        .transaction()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    let mut inserted_count: u32 = 0;
    for (i, track_id) in track_ids.iter().enumerate() {
        let entry_id = Uuid::new_v4().to_string();
        let pos = initial_pos + i as i32;
        tx.execute(
            r#"
            INSERT INTO playlist_tracks (id, playlist_id, track_id, position, added_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
            params![entry_id, playlist_id, track_id, pos, now],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

        inserted_count += 1;
    }

    tx.commit()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(inserted_count)
}

/// Removes a specific playlist track entry by its entry identifier and renumbers subsequent positions.
pub fn remove_playlist_track(
    conn: &mut Connection,
    playlist_id: &str,
    entry_id: &str,
) -> Result<bool, DatabaseError> {
    let tx = conn
        .transaction()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    let current_pos: Option<i32> = tx
        .query_row(
            "SELECT position FROM playlist_tracks WHERE playlist_id = ?1 AND id = ?2",
            params![playlist_id, entry_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let position = match current_pos {
        Some(pos) => pos,
        None => {
            return Err(DatabaseError::item_not_found(format!(
                "Entry {} in playlist {} not found",
                entry_id, playlist_id
            )))
        }
    };

    tx.execute(
        "DELETE FROM playlist_tracks WHERE playlist_id = ?1 AND id = ?2",
        params![playlist_id, entry_id],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    // Renumber subsequent positions to eliminate gaps
    tx.execute(
        r#"
        UPDATE playlist_tracks
        SET position = position - 1
        WHERE playlist_id = ?1 AND position > ?2
        "#,
        params![playlist_id, position],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    tx.commit()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(true)
}

/// Atomically reorders tracks within a playlist given ordered entry identifiers.
pub fn reorder_playlist_tracks(
    conn: &mut Connection,
    playlist_id: &str,
    ordered_entry_ids: &[String],
) -> Result<bool, DatabaseError> {
    let tx = conn
        .transaction()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    // Verify playlist exists
    let exists: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM playlists WHERE id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    if exists == 0 {
        return Err(DatabaseError::playlist_not_found(format!(
            "Playlist with id {} not found",
            playlist_id
        )));
    }

    for (new_pos, entry_id) in ordered_entry_ids.iter().enumerate() {
        tx.execute(
            r#"
            UPDATE playlist_tracks
            SET position = ?1
            WHERE playlist_id = ?2 AND id = ?3
            "#,
            params![new_pos as i32, playlist_id, entry_id],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;
    }

    tx.commit()
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(true)
}

/// Retrieves playlist header and complete ordered tracklist with track metadata.
pub fn get_playlist_details(
    conn: &Connection,
    id: &str,
) -> Result<Option<PlaylistDetailDto>, DatabaseError> {
    let mut p_stmt = conn
        .prepare(
            r#"
            SELECT
                p.id, p.name, p.description, p.cover_art_path, p.gradient_preset,
                p.is_favorite, p.is_curated,
                COUNT(pt.id) as track_count,
                p.created_at, p.updated_at
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
            WHERE p.id = ?1
            GROUP BY p.id
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut p_iter = p_stmt
        .query_map(params![id], |row| {
            let is_fav_int: i32 = row.get(5)?;
            let is_curated_int: i32 = row.get(6)?;
            let trk_cnt: i64 = row.get(7)?;
            Ok(PlaylistDto {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                cover_art_path: row.get(3)?,
                gradient_preset: row.get(4)?,
                is_favorite: is_fav_int == 1,
                is_curated: is_curated_int == 1,
                track_count: trk_cnt as u32,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let playlist = match p_iter.next() {
        Some(res) => res?,
        None => return Ok(None),
    };

    let query = r#"
        SELECT
            pt.id, pt.playlist_id, pt.position, pt.added_at,
            t.id, t.file_path, t.title, t.artist_id, t.artist_name, t.album_id, t.album_name, t.album_artist,
            t.duration, t.year, t.genre, t.disc_number, t.track_number, t.bitrate, t.format,
            t.is_favorite, t.liked_at, t.play_count, t.cover_art_path, t.last_played_at, t.file_modified_at,
            t.file_size_bytes, t.folder_id, t.created_at, t.updated_at
        FROM playlist_tracks pt
        JOIN tracks t ON t.id = pt.track_id
        WHERE pt.playlist_id = ?1
        ORDER BY pt.position ASC
        "#;

    let mut pt_stmt = conn
        .prepare(query)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let pt_iter = pt_stmt
        .query_map(params![id], |row| {
            let is_fav_int: i32 = row.get(19)?;
            let play_cnt_int: i64 = row.get(21)?;
            let track = TrackDto {
                id: row.get(4)?,
                file_path: row.get(5)?,
                title: row.get(6)?,
                artist_id: row.get(7)?,
                artist_name: row.get(8)?,
                album_id: row.get(9)?,
                album_name: row.get(10)?,
                album_artist: row.get(11)?,
                duration: row.get(12)?,
                year: row.get(13)?,
                genre: row.get(14)?,
                disc_number: row.get(15)?,
                track_number: row.get(16)?,
                bitrate: row.get(17)?,
                format: row.get(18)?,
                is_favorite: is_fav_int == 1,
                liked_at: row.get(20)?,
                play_count: play_cnt_int as u32,
                cover_art_path: row.get(22)?,
                last_played_at: row.get(23)?,
                file_modified_at: row.get(24)?,
                file_size_bytes: row.get(25)?,
                folder_id: row.get(26)?,
                created_at: row.get(27)?,
                updated_at: row.get(28)?,
            };

            let pos_int: i32 = row.get(2)?;
            Ok(PlaylistTrackDto {
                id: row.get(0)?,
                playlist_id: row.get(1)?,
                position: pos_int as u32,
                added_at: row.get(3)?,
                track,
            })
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut tracks = Vec::new();
    for trk_res in pt_iter {
        tracks.push(trk_res?);
    }

    Ok(Some(PlaylistDetailDto { playlist, tracks }))
}
