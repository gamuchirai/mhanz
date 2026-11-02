//! Track lyrics repository for SQLite persistence, caching, and user timing adjustments.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, Row};
use uuid::Uuid;

use super::error::DatabaseError;
use super::models::{LyricLineDto, TrackLyricsDto, TrackLyricsEntity};

/// Helper to map a SQLite query row into a TrackLyricsEntity.
fn map_lyrics_row(row: &Row<'_>) -> Result<TrackLyricsEntity, rusqlite::Error> {
    let has_lyrics_int: i32 = row.get(2)?;
    let is_synced_int: i32 = row.get(3)?;
    Ok(TrackLyricsEntity {
        id: row.get(0)?,
        track_id: row.get(1)?,
        has_lyrics: has_lyrics_int == 1,
        is_synced: is_synced_int == 1,
        plain_text: row.get(4)?,
        lines_json: row.get(5)?,
        source_type: row.get(6)?,
        source_file_path: row.get(7)?,
        source_modified_at: row.get(8)?,
        user_offset_ms: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

/// Converts a TrackLyricsEntity database model into a presentation layer TrackLyricsDto.
pub fn entity_to_dto(entity: &TrackLyricsEntity) -> TrackLyricsDto {
    let lines: Vec<LyricLineDto> = entity
        .lines_json
        .as_deref()
        .and_then(|json_str| serde_json::from_str(json_str).ok())
        .unwrap_or_default();

    TrackLyricsDto {
        track_id: entity.track_id.clone(),
        has_lyrics: entity.has_lyrics,
        is_synced: entity.is_synced,
        lines,
        plain_text: entity.plain_text.clone(),
        source_type: entity.source_type.clone(),
        user_offset_ms: entity.user_offset_ms,
    }
}

/// Retrieves stored lyrics for a track by unique track identifier.
pub fn get_lyrics_by_track_id(
    conn: &Connection,
    track_id: &str,
) -> Result<Option<TrackLyricsEntity>, DatabaseError> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                id, track_id, has_lyrics, is_synced, plain_text, lines_json,
                source_type, source_file_path, source_modified_at, user_offset_ms,
                created_at, updated_at
            FROM track_lyrics
            WHERE track_id = ?1
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut rows = stmt
        .query(params![track_id])
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    if let Some(row) = rows
        .next()
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?
    {
        let entity =
            map_lyrics_row(row).map_err(|err| DatabaseError::query_failed(err.to_string()))?;
        Ok(Some(entity))
    } else {
        Ok(None)
    }
}

/// Upserts lyrics for a track in SQLite, preserving any previously configured user timing offset.
pub fn upsert_track_lyrics(
    conn: &Connection,
    lyrics: &TrackLyricsEntity,
) -> Result<(), DatabaseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let created_at = if lyrics.created_at > 0 {
        lyrics.created_at
    } else {
        now
    };

    let updated_at = now;

    conn.execute(
        r#"
        INSERT INTO track_lyrics (
            id, track_id, has_lyrics, is_synced, plain_text, lines_json,
            source_type, source_file_path, source_modified_at, user_offset_ms,
            created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
        ON CONFLICT(track_id) DO UPDATE SET
            has_lyrics = excluded.has_lyrics,
            is_synced = excluded.is_synced,
            plain_text = excluded.plain_text,
            lines_json = excluded.lines_json,
            source_type = excluded.source_type,
            source_file_path = excluded.source_file_path,
            source_modified_at = excluded.source_modified_at,
            updated_at = excluded.updated_at;
        "#,
        params![
            lyrics.id,
            lyrics.track_id,
            if lyrics.has_lyrics { 1 } else { 0 },
            if lyrics.is_synced { 1 } else { 0 },
            lyrics.plain_text,
            lyrics.lines_json,
            lyrics.source_type,
            lyrics.source_file_path,
            lyrics.source_modified_at,
            lyrics.user_offset_ms,
            created_at,
            updated_at,
        ],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(())
}

/// Updates the user timing offset in milliseconds for a track, creating an empty stub if needed.
pub fn update_user_offset(
    conn: &Connection,
    track_id: &str,
    offset_ms: i32,
) -> Result<(), DatabaseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let rows_affected = conn
        .execute(
            r#"
            UPDATE track_lyrics
            SET user_offset_ms = ?1, updated_at = ?2
            WHERE track_id = ?3;
            "#,
            params![offset_ms, now, track_id],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    if rows_affected == 0 {
        let stub_id = Uuid::new_v4().to_string();
        conn.execute(
            r#"
            INSERT INTO track_lyrics (
                id, track_id, has_lyrics, is_synced, plain_text, lines_json,
                source_type, source_file_path, source_modified_at, user_offset_ms,
                created_at, updated_at
            ) VALUES (?1, ?2, 0, 0, NULL, NULL, 'none', NULL, NULL, ?3, ?4, ?4)
            ON CONFLICT(track_id) DO UPDATE SET
                user_offset_ms = excluded.user_offset_ms,
                updated_at = excluded.updated_at;
            "#,
            params![stub_id, track_id, offset_ms, now],
        )
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;
    }

    Ok(())
}
