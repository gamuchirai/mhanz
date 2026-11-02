//! SQLite repository and transactional synchronization for tag editing,
//! in place album updates, artist reconciliation, and orphan cleanup.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, Transaction};
use uuid::Uuid;

use super::models::{BatchTrackUpdates, SaveTrackTagsDto};
use super::writer::PhysicalWriteResult;
use crate::db::models::{AlbumDto, TrackDto};
use crate::db::track_repo::{map_track_row, TRACK_SELECT_FIELDS};

/// Validates that a file path resolves to a canonical path residing inside an active library folder.
pub fn validate_path_in_library_folders(
    conn: &Connection,
    file_path: &Path,
) -> Result<PathBuf, String> {
    let canonical_file =
        fs::canonicalize(file_path).map_err(|err| format!("Invalid audio file path: {}", err))?;

    let mut stmt = conn
        .prepare("SELECT path FROM folders WHERE is_active = 1")
        .map_err(|err| format!("Failed to query library folders: {}", err))?;

    let folder_rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|err| format!("Failed to read library folder paths: {}", err))?;

    let mut is_allowed = false;
    for raw_folder_path in folder_rows.flatten() {
        if let Ok(canonical_folder) = fs::canonicalize(&raw_folder_path) {
            if canonical_file.starts_with(&canonical_folder) {
                is_allowed = true;
                break;
            }
        }
    }

    if !is_allowed {
        return Err(format!(
            "Access denied: file path '{}' does not reside inside any active music library folder",
            canonical_file.display()
        ));
    }

    Ok(canonical_file)
}

/// Resolves or creates an artist record matching artist_name (case-insensitive).
pub fn resolve_or_create_artist(
    tx: &Transaction<'_>,
    artist_name: &str,
    now: i64,
) -> Result<String, rusqlite::Error> {
    let trimmed = artist_name.trim();
    let existing_opt: Option<String> = tx
        .query_row(
            "SELECT id FROM artists WHERE LOWER(name) = LOWER(?1) LIMIT 1",
            [trimmed],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = existing_opt {
        return Ok(id);
    }

    let new_id = Uuid::new_v4().to_string();
    tx.execute(
        r#"
        INSERT INTO artists (id, name, bio, avatar_path, created_at, updated_at)
        VALUES (?1, ?2, NULL, NULL, ?3, ?3)
        "#,
        params![new_id, trimmed, now],
    )?;

    Ok(new_id)
}

/// Resolves existing album or creates a new album record.
#[allow(clippy::too_many_arguments)]
pub fn resolve_or_create_album(
    tx: &Transaction<'_>,
    album_title: &str,
    artist_id: &str,
    artist_name: &str,
    year: Option<i32>,
    genre: Option<&str>,
    cover_art_path: Option<&str>,
    now: i64,
) -> Result<String, rusqlite::Error> {
    let trimmed_title = album_title.trim();
    let existing: Option<(String, Option<String>)> = tx
        .query_row(
            r#"
            SELECT id, cover_art_path FROM albums
            WHERE LOWER(title) = LOWER(?1) AND LOWER(artist_name) = LOWER(?2)
            LIMIT 1
            "#,
            params![trimmed_title, artist_name.trim()],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    if let Some((id, current_cover)) = existing {
        if current_cover.is_none() && cover_art_path.is_some() {
            let _ = tx.execute(
                "UPDATE albums SET cover_art_path = ?1, updated_at = ?2 WHERE id = ?3",
                params![cover_art_path, now, id],
            );
        }
        return Ok(id);
    }

    let new_id = Uuid::new_v4().to_string();
    tx.execute(
        r#"
        INSERT INTO albums (
            id, title, artist_id, artist_name, year, genre, cover_art_path, total_discs, created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8
        )
        "#,
        params![
            new_id,
            trimmed_title,
            artist_id,
            artist_name.trim(),
            year,
            genre,
            cover_art_path,
            now,
        ],
    )?;

    Ok(new_id)
}

/// Purges orphan artists with zero remaining tracks.
pub fn purge_orphan_artists(tx: &Transaction<'_>) -> Result<usize, rusqlite::Error> {
    tx.execute(
        r#"
        DELETE FROM artists
        WHERE id NOT IN (SELECT DISTINCT artist_id FROM tracks WHERE artist_id IS NOT NULL)
        "#,
        [],
    )
}

/// Purges orphan albums with zero remaining tracks.
pub fn purge_orphan_albums(tx: &Transaction<'_>) -> Result<usize, rusqlite::Error> {
    tx.execute(
        r#"
        DELETE FROM albums
        WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)
        "#,
        [],
    )
}

/// Updates SQLite database transactionally for a single track edit (AC-8, AC-9).
pub fn save_track_metadata_transaction(
    conn: &mut Connection,
    payload: &SaveTrackTagsDto,
    write_result: &PhysicalWriteResult,
) -> Result<TrackDto, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let tx = conn
        .transaction()
        .map_err(|err| format!("Failed to begin database transaction: {}", err))?;

    // 1. Resolve or create artist
    let artist_id = resolve_or_create_artist(&tx, &payload.artist_name, now)
        .map_err(|err| format!("Failed to resolve artist record: {}", err))?;

    // 2. Resolve or create album
    let album_artist = payload
        .album_artist
        .as_deref()
        .unwrap_or(&payload.artist_name);

    let album_title = payload.album_name.as_deref().unwrap_or("Unknown Album");
    let album_id = resolve_or_create_album(
        &tx,
        album_title,
        &artist_id,
        album_artist,
        payload.year,
        payload.genre.as_deref(),
        write_result.cover_art_path.as_deref(),
        now,
    )
    .map_err(|err| format!("Failed to resolve album record: {}", err))?;

    // 3. Update track record
    tx.execute(
        r#"
        UPDATE tracks SET
            title = ?1,
            artist_id = ?2,
            artist_name = ?3,
            album_id = ?4,
            album_name = ?5,
            album_artist = ?6,
            genre = ?7,
            year = ?8,
            track_number = ?9,
            disc_number = ?10,
            cover_art_path = ?11,
            file_modified_at = ?12,
            file_size_bytes = ?13,
            updated_at = ?14
        WHERE id = ?15
        "#,
        params![
            payload.title.trim(),
            artist_id,
            payload.artist_name.trim(),
            album_id,
            payload.album_name.as_deref(),
            payload.album_artist.as_deref(),
            payload.genre.as_deref(),
            payload.year,
            payload.track_number,
            payload.disc_number,
            write_result.cover_art_path.as_deref(),
            write_result.file_modified_at,
            write_result.file_size_bytes,
            now,
            payload.track_id,
        ],
    )
    .map_err(|err| format!("Failed to update track in database: {}", err))?;

    // 4. Purge orphan artists and albums
    let _ = purge_orphan_artists(&tx);
    let _ = purge_orphan_albums(&tx);

    // 5. Query updated track dto
    let sql = format!("SELECT {} FROM tracks WHERE id = ?1", TRACK_SELECT_FIELDS);
    let updated_track = tx
        .query_row(&sql, [&payload.track_id], map_track_row)
        .map_err(|err| format!("Failed to read updated track: {}", err))?;

    tx.commit()
        .map_err(|err| format!("Failed to commit database transaction: {}", err))?;

    Ok(updated_track)
}

/// Updates SQLite database transactionally for a batch edit (AC-8, AC-9).
/// Preserves existing album record in place when album_id is specified.
pub fn save_batch_metadata_transaction(
    conn: &mut Connection,
    target_album_id: Option<&str>,
    updates: &BatchTrackUpdates,
    item_results: &[(SaveTrackTagsDto, PhysicalWriteResult)],
) -> Result<(Option<AlbumDto>, Vec<TrackDto>), String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let tx = conn
        .transaction()
        .map_err(|err| format!("Failed to begin batch database transaction: {}", err))?;

    // 1. In place album update if album_id is given
    let resolved_album_id = target_album_id.map(|s| s.to_string());

    if let Some(ref aid) = resolved_album_id {
        // Build dynamic update query to preserve existing album id, favorite status, and created_at
        let mut set_clauses = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref title) = updates.album_name {
            set_clauses.push(format!("title = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(title.trim().to_string()));
        }
        if let Some(ref art) = updates.artist_name {
            set_clauses.push(format!("artist_name = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(art.trim().to_string()));
        }
        if let Some(ref yr) = updates.year {
            set_clauses.push(format!("year = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(*yr));
        }
        if let Some(ref g) = updates.genre {
            set_clauses.push(format!("genre = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(g.clone()));
        }
        if let Some((_, first_result)) = item_results.first() {
            if let Some(ref cover) = first_result.cover_art_path {
                set_clauses.push(format!("cover_art_path = ?{}", params_vec.len() + 1));
                params_vec.push(Box::new(cover.clone()));
            }
        }

        set_clauses.push(format!("updated_at = ?{}", params_vec.len() + 1));
        params_vec.push(Box::new(now));

        let query = format!(
            "UPDATE albums SET {} WHERE id = ?{}",
            set_clauses.join(", "),
            params_vec.len() + 1
        );
        params_vec.push(Box::new(aid.clone()));

        let param_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
        tx.execute(&query, param_refs.as_slice())
            .map_err(|err| format!("Failed to update album in place: {}", err))?;
    }

    // 2. Update each succeeded track
    let mut updated_tracks = Vec::with_capacity(item_results.len());

    for (payload, write_res) in item_results {
        let artist_id = resolve_or_create_artist(&tx, &payload.artist_name, now)
            .map_err(|err| format!("Failed to resolve artist in batch: {}", err))?;

        let album_id = if let Some(ref aid) = resolved_album_id {
            aid.clone()
        } else {
            let album_artist = payload
                .album_artist
                .as_deref()
                .unwrap_or(&payload.artist_name);
            let album_title = payload.album_name.as_deref().unwrap_or("Unknown Album");
            resolve_or_create_album(
                &tx,
                album_title,
                &artist_id,
                album_artist,
                payload.year,
                payload.genre.as_deref(),
                write_res.cover_art_path.as_deref(),
                now,
            )
            .map_err(|err| format!("Failed to resolve album in batch: {}", err))?
        };

        tx.execute(
            r#"
            UPDATE tracks SET
                title = ?1,
                artist_id = ?2,
                artist_name = ?3,
                album_id = ?4,
                album_name = ?5,
                album_artist = ?6,
                genre = ?7,
                year = ?8,
                track_number = ?9,
                disc_number = ?10,
                cover_art_path = ?11,
                file_modified_at = ?12,
                file_size_bytes = ?13,
                updated_at = ?14
            WHERE id = ?15
            "#,
            params![
                payload.title.trim(),
                artist_id,
                payload.artist_name.trim(),
                album_id,
                payload.album_name.as_deref(),
                payload.album_artist.as_deref(),
                payload.genre.as_deref(),
                payload.year,
                payload.track_number,
                payload.disc_number,
                write_res.cover_art_path.as_deref(),
                write_res.file_modified_at,
                write_res.file_size_bytes,
                now,
                payload.track_id,
            ],
        )
        .map_err(|err| {
            format!(
                "Failed to update track {} in batch: {}",
                payload.track_id, err
            )
        })?;

        let sql = format!("SELECT {} FROM tracks WHERE id = ?1", TRACK_SELECT_FIELDS);
        let track_dto = tx
            .query_row(&sql, [&payload.track_id], map_track_row)
            .map_err(|err| format!("Failed to read updated track {}: {}", payload.track_id, err))?;

        updated_tracks.push(track_dto);
    }

    // 3. Purge orphan artists and albums
    let _ = purge_orphan_artists(&tx);
    let _ = purge_orphan_albums(&tx);

    // 4. Query updated album DTO if applicable
    let mut updated_album_dto: Option<AlbumDto> = None;
    if let Some(ref aid) = resolved_album_id {
        let album_sql = r#"
            SELECT
                a.id, a.title, a.artist_id, a.artist_name, a.year, a.genre,
                a.cover_art_path, a.total_discs,
                COUNT(t.id) as track_count,
                COALESCE(SUM(t.duration), 0.0) as total_duration,
                CASE
                    WHEN a.is_favorite = 1 THEN 1
                    WHEN COUNT(t.id) > 0 AND (COALESCE(SUM(CASE WHEN t.is_favorite = 1 THEN 1 ELSE 0 END), 0) * 2 >= COUNT(t.id)) THEN 1
                    ELSE 0
                END as is_favorite,
                a.created_at, a.updated_at
            FROM albums a
            LEFT JOIN tracks t ON t.album_id = a.id
            WHERE a.id = ?1
            GROUP BY a.id
        "#;

        updated_album_dto = tx
            .query_row(album_sql, [aid], |row| {
                let trk_cnt: i64 = row.get(8)?;
                let total_dur: f64 = row.get(9)?;
                let is_fav_int: i32 = row.get(10)?;
                Ok(AlbumDto {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    artist_id: row.get(2)?,
                    artist_name: row.get(3)?,
                    year: row.get(4)?,
                    genre: row.get(5)?,
                    cover_art_path: row.get(6)?,
                    total_discs: row.get(7)?,
                    track_count: trk_cnt as u32,
                    total_duration: total_dur,
                    is_favorite: is_fav_int == 1,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                })
            })
            .ok();
    }

    tx.commit()
        .map_err(|err| format!("Failed to commit batch database transaction: {}", err))?;

    Ok((updated_album_dto, updated_tracks))
}
