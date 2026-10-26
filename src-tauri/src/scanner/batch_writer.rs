//! Chunked transactional persistence and catalog reconciliation for library scanning.

use std::collections::{HashMap, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, Transaction};
use uuid::Uuid;

use super::models::ScannedTrackData;

/// Batch size for chunked SQLite persistence (AC-6).
pub const CHUNK_BATCH_SIZE: usize = 250;

/// Summary statistics for a committed batch.
#[derive(Debug, Default, Clone, Copy)]
pub struct BatchCommitStats {
    pub new_tracks: usize,
    pub updated_tracks: usize,
}

/// Commits a batch of up to 250 scanned tracks, reconciling artists and albums atomically.
pub fn commit_track_batch(
    conn: &mut Connection,
    tracks: &[ScannedTrackData],
    existing_paths: &HashMap<String, i64>,
) -> Result<BatchCommitStats, rusqlite::Error> {
    if tracks.is_empty() {
        return Ok(BatchCommitStats::default());
    }

    let tx = conn.transaction()?;
    let mut stats = BatchCommitStats::default();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    for track in tracks {
        let is_update = existing_paths.contains_key(&track.file_path);
        if is_update {
            stats.updated_tracks += 1;
        } else {
            stats.new_tracks += 1;
        }

        // 1. Resolve or create Artist record (case-insensitive by name)
        let artist_id = resolve_or_create_artist(&tx, &track.artist_name, now)?;

        // 2. Resolve or create Album record (case-insensitive by title and artist)
        let album_artist_for_album = track
            .album_artist
            .as_deref()
            .unwrap_or(&track.artist_name);

        let album_id = resolve_or_create_album(
            &tx,
            &track.album_title,
            &artist_id,
            album_artist_for_album,
            track.year,
            track.genre.as_deref(),
            track.cover_art_path.as_deref(),
            now,
        )?;

        // 3. Upsert track entity with atomic user stats preservation (AC-7)
        let track_id = Uuid::new_v4().to_string();

        tx.execute(
            r#"
            INSERT INTO tracks (
                id, file_path, title, artist_id, artist_name, album_id, album_name, album_artist,
                duration, year, genre, disc_number, track_number, bitrate, format,
                cover_art_path, is_favorite, play_count, last_played_at, file_modified_at,
                file_size_bytes, folder_id, created_at, updated_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
                ?9, ?10, ?11, ?12, ?13, ?14, ?15,
                ?16, 0, 0, NULL, ?17,
                ?18, ?19, ?20, ?20
            )
            ON CONFLICT(file_path) DO UPDATE SET
                title = excluded.title,
                artist_id = excluded.artist_id,
                artist_name = excluded.artist_name,
                album_id = excluded.album_id,
                album_name = excluded.album_name,
                album_artist = excluded.album_artist,
                duration = excluded.duration,
                year = excluded.year,
                genre = excluded.genre,
                disc_number = excluded.disc_number,
                track_number = excluded.track_number,
                bitrate = excluded.bitrate,
                format = excluded.format,
                cover_art_path = COALESCE(excluded.cover_art_path, tracks.cover_art_path),
                file_modified_at = excluded.file_modified_at,
                file_size_bytes = excluded.file_size_bytes,
                folder_id = excluded.folder_id,
                updated_at = excluded.updated_at
            "#,
            params![
                track_id,
                track.file_path,
                track.title,
                artist_id,
                track.artist_name,
                album_id,
                track.album_title,
                track.album_artist,
                track.duration,
                track.year,
                track.genre,
                track.disc_number,
                track.track_number,
                track.bitrate,
                track.format,
                track.cover_art_path,
                track.file_modified_at,
                track.file_size_bytes,
                track.folder_id,
                now,
            ],
        )?;
    }

    tx.commit()?;
    Ok(stats)
}

/// Resolves an existing artist by case-insensitive name, or inserts a new artist record.
fn resolve_or_create_artist(
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

/// Resolves an existing album by case-insensitive title and artist, or inserts a new album record.
fn resolve_or_create_album(
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
        // If incoming track has cover art and existing album does not, update album cover
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

/// Prunes tracks in `folder_id` that no longer exist on disk, cascading to orphaned albums/artists (AC-8).
///
/// NOTE: This function MUST only be invoked if the scan completed without cancellation.
pub fn prune_missing_folder_tracks(
    conn: &mut Connection,
    folder_id: &str,
    active_disk_paths: &HashSet<String>,
) -> Result<usize, rusqlite::Error> {
    let tx = conn.transaction()?;

    // Find all tracks currently associated with this folder
    let mut stmt = tx.prepare("SELECT id, file_path FROM tracks WHERE folder_id = ?1")?;
    let rows = stmt.query_map([folder_id], |row| {
        let id: String = row.get(0)?;
        let path: String = row.get(1)?;
        Ok((id, path))
    })?;

    let mut track_ids_to_remove = Vec::new();
    for row in rows {
        let (id, path) = row?;
        if !active_disk_paths.contains(&path) {
            track_ids_to_remove.push(id);
        }
    }
    drop(stmt);

    let removed_count = track_ids_to_remove.len();
    if removed_count > 0 {
        // Delete missing tracks
        for id in &track_ids_to_remove {
            tx.execute("DELETE FROM tracks WHERE id = ?1", [id])?;
        }

        // Clean up orphaned albums no longer referencing any tracks
        tx.execute(
            r#"
            DELETE FROM albums
            WHERE id NOT IN (SELECT DISTINCT album_id FROM tracks WHERE album_id IS NOT NULL)
            "#,
            [],
        )?;

        // Clean up orphaned artists no longer referencing any tracks
        tx.execute(
            r#"
            DELETE FROM artists
            WHERE id NOT IN (SELECT DISTINCT artist_id FROM tracks WHERE artist_id IS NOT NULL)
            "#,
            [],
        )?;
    }

    // Update folder last_scanned_at timestamp
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    tx.execute(
        "UPDATE folders SET last_scanned_at = ?1 WHERE id = ?2",
        params![now, folder_id],
    )?;

    tx.commit()?;
    Ok(removed_count)
}
