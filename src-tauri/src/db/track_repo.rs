//! Track entity repository for paginated catalog browsing, favorite toggling, and playback updates.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, Row};

use super::error::DatabaseError;
use super::models::{PaginatedTracksDto, TrackDto, TrackFilterDto};

/// Helper to map a rusqlite row into TrackDto.
pub fn map_track_row(row: &Row<'_>) -> Result<TrackDto, rusqlite::Error> {
    let is_fav_int: i32 = row.get(15)?;
    let play_cnt_int: i64 = row.get(16)?;
    Ok(TrackDto {
        id: row.get(0)?,
        file_path: row.get(1)?,
        title: row.get(2)?,
        artist_id: row.get(3)?,
        artist_name: row.get(4)?,
        album_id: row.get(5)?,
        album_name: row.get(6)?,
        album_artist: row.get(7)?,
        duration: row.get(8)?,
        year: row.get(9)?,
        genre: row.get(10)?,
        disc_number: row.get(11)?,
        track_number: row.get(12)?,
        bitrate: row.get(13)?,
        format: row.get(14)?,
        cover_art_path: row.get(17)?,
        is_favorite: is_fav_int == 1,
        play_count: play_cnt_int as u32,
        last_played_at: row.get(18)?,
        file_modified_at: row.get(19)?,
        file_size_bytes: row.get(20)?,
        folder_id: row.get(21)?,
        created_at: row.get(22)?,
        updated_at: row.get(23)?,
    })
}

/// Constant SQL column selection list for track rows.
pub const TRACK_SELECT_FIELDS: &str = r#"
    id, file_path, title, artist_id, artist_name, album_id, album_name, album_artist,
    duration, year, genre, disc_number, track_number, bitrate, format,
    is_favorite, play_count, cover_art_path, last_played_at, file_modified_at,
    file_size_bytes, folder_id, created_at, updated_at
"#;

/// Returns total count of tracks in database.
pub fn count_tracks(conn: &Connection) -> Result<u64, DatabaseError> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
    Ok(count as u64)
}

/// Retrieves a paginated slice of tracks with optional folder, favorite, or search filter.
pub fn get_tracks(
    conn: &Connection,
    page: u32,
    limit: u32,
    filter: Option<TrackFilterDto>,
) -> Result<PaginatedTracksDto, DatabaseError> {
    let safe_limit = if limit == 0 { 50 } else { limit.min(500) };
    let offset = page.saturating_mul(safe_limit);

    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(f) = filter {
        if let Some(folder_id) = f.folder_id {
            where_clauses.push(format!("folder_id = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(folder_id));
        }
        if let Some(fav) = f.is_favorite {
            where_clauses.push(format!("is_favorite = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(if fav { 1 } else { 0 }));
        }
        if let Some(artist_id) = f.artist_id {
            where_clauses.push(format!("artist_id = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(artist_id));
        }
        if let Some(album_id) = f.album_id {
            where_clauses.push(format!("album_id = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(album_id));
        }
        if let Some(genre) = f.genre {
            where_clauses.push(format!("genre = ?{}", params_vec.len() + 1));
            params_vec.push(Box::new(genre));
        }
        if let Some(query) = f.search_query {
            let trimmed = query.trim();
            if !trimmed.is_empty() {
                let pattern = format!("%{}%", trimmed);
                let p1 = params_vec.len() + 1;
                let p2 = params_vec.len() + 2;
                let p3 = params_vec.len() + 3;
                where_clauses.push(format!(
                    "(title LIKE ?{} OR artist_name LIKE ?{} OR album_name LIKE ?{})",
                    p1, p2, p3
                ));
                params_vec.push(Box::new(pattern.clone()));
                params_vec.push(Box::new(pattern.clone()));
                params_vec.push(Box::new(pattern));
            }
        }
    }

    let where_str = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    // Calculate total matching records
    let count_query = format!("SELECT COUNT(*) FROM tracks {}", where_str);
    let mut count_stmt = conn
        .prepare(&count_query)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let rusqlite_params: Vec<&dyn rusqlite::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();
    let total_count: i64 = count_stmt
        .query_row(rusqlite_params.as_slice(), |row| row.get(0))
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    // Query paginated items
    let select_query = format!(
        "SELECT {} FROM tracks {} ORDER BY title ASC, disc_number ASC, track_number ASC LIMIT ?{} OFFSET ?{}",
        TRACK_SELECT_FIELDS,
        where_str,
        params_vec.len() + 1,
        params_vec.len() + 2
    );

    let mut select_stmt = conn
        .prepare(&select_query)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    params_vec.push(Box::new(safe_limit));
    params_vec.push(Box::new(offset));

    let item_params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let rows_iter = select_stmt
        .query_map(item_params.as_slice(), map_track_row)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut items = Vec::new();
    for row_res in rows_iter {
        items.push(row_res?);
    }

    Ok(PaginatedTracksDto {
        items,
        total: total_count as u64,
        page,
        limit: safe_limit,
    })
}

/// Fetches a single track by its primary key identifier.
pub fn get_track_by_id(conn: &Connection, id: &str) -> Result<Option<TrackDto>, DatabaseError> {
    let query = format!("SELECT {} FROM tracks WHERE id = ?1", TRACK_SELECT_FIELDS);
    let mut stmt = conn
        .prepare(&query)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut rows = stmt
        .query_map(params![id], map_track_row)
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    if let Some(first) = rows.next() {
        Ok(Some(first?))
    } else {
        Ok(None)
    }
}

/// Inverts the favorite liked status of a track and returns the updated state.
pub fn toggle_track_favorite(conn: &mut Connection, id: &str) -> Result<bool, DatabaseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let current_fav: Option<i32> = conn
        .query_row(
            "SELECT is_favorite FROM tracks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => {
                DatabaseError::track_not_found(format!("Track with id {} not found", id))
            }
            _ => DatabaseError::query_failed(err.to_string()),
        })?;

    let new_fav = match current_fav {
        Some(1) => 0,
        _ => 1,
    };

    conn.execute(
        "UPDATE tracks SET is_favorite = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_fav, now, id],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(new_fav == 1)
}

/// Increments the play count of a track and updates its last played timestamp.
pub fn increment_play_count(conn: &mut Connection, id: &str) -> Result<u32, DatabaseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let rows_updated = conn
        .execute(
            r#"
            UPDATE tracks
            SET play_count = play_count + 1,
                last_played_at = ?1,
                updated_at = ?1
            WHERE id = ?2
            "#,
            params![now, id],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    if rows_updated == 0 {
        return Err(DatabaseError::track_not_found(format!(
            "Track with id {} not found",
            id
        )));
    }

    let updated_count: i64 = conn
        .query_row(
            "SELECT play_count FROM tracks WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    Ok(updated_count as u32)
}

/// Inserts or updates a track record with conflict resolution on file_path.
pub fn upsert_track(conn: &mut Connection, track: &TrackDto) -> Result<(), DatabaseError> {
    let is_fav = if track.is_favorite { 1 } else { 0 };

    conn.execute(
        r#"
        INSERT INTO tracks (
            id, file_path, title, artist_id, artist_name, album_id, album_name, album_artist,
            duration, year, genre, disc_number, track_number, bitrate, format,
            cover_art_path, is_favorite, play_count, last_played_at, file_modified_at,
            file_size_bytes, folder_id, created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
            ?9, ?10, ?11, ?12, ?13, ?14, ?15,
            ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24
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
            cover_art_path = excluded.cover_art_path,
            file_modified_at = excluded.file_modified_at,
            file_size_bytes = excluded.file_size_bytes,
            updated_at = excluded.updated_at
        "#,
        params![
            track.id,
            track.file_path,
            track.title,
            track.artist_id,
            track.artist_name,
            track.album_id,
            track.album_name,
            track.album_artist,
            track.duration,
            track.year,
            track.genre,
            track.disc_number,
            track.track_number,
            track.bitrate,
            track.format,
            track.cover_art_path,
            is_fav,
            track.play_count,
            track.last_played_at,
            track.file_modified_at,
            track.file_size_bytes,
            track.folder_id,
            track.created_at,
            track.updated_at
        ],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(())
}
