//! Lyrics extraction service resolving companion files and embedded tags with SQLite caching.

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use lofty::file::TaggedFileExt;
use lofty::probe::Probe;
use lofty::tag::ItemKey;
use rusqlite::Connection;
use uuid::Uuid;

use super::parser;
use crate::db::error::DatabaseError;
use crate::db::lyrics_repo;
use crate::db::models::{TrackLyricsDto, TrackLyricsEntity};
use crate::db::track_repo;

/// Returns current unix epoch seconds.
fn current_epoch_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Helper to read file modification timestamp in unix seconds.
fn get_file_modified_time(path: &Path) -> Option<i64> {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
}

/// Retrieves or parses lyrics for a track, validating SQLite cache freshness against disk timestamps.
pub fn get_or_extract_lyrics(
    conn: &Connection,
    track_id: &str,
    force_rescan: bool,
) -> Result<TrackLyricsDto, DatabaseError> {
    // 1. Retrieve track from SQLite (AC-5, AC-10)
    let track = match track_repo::get_track_by_id(conn, track_id)? {
        Some(t) => t,
        None => {
            return Ok(TrackLyricsDto {
                track_id: track_id.to_string(),
                has_lyrics: false,
                is_synced: false,
                lines: Vec::new(),
                plain_text: None,
                source_type: "none".to_string(),
                user_offset_ms: 0,
            });
        }
    };

    let audio_path = Path::new(&track.file_path);

    // 2. Check SQLite cache unless force_rescan is requested (AC-5)
    let cached = lyrics_repo::get_lyrics_by_track_id(conn, track_id)?;
    let existing_user_offset_ms = cached.as_ref().map(|c| c.user_offset_ms).unwrap_or(0);

    if !force_rescan {
        if let Some(ref cache_entry) = cached {
            // Validate cache freshness
            if let Some(ref source_path_str) = cache_entry.source_file_path {
                let source_path = Path::new(source_path_str);
                if source_path.exists() {
                    let disk_modified = get_file_modified_time(source_path);
                    if disk_modified.is_some() && disk_modified == cache_entry.source_modified_at {
                        return Ok(lyrics_repo::entity_to_dto(cache_entry));
                    }
                }
            }
        }
    }

    // 3. Priority 1: Check companion .lrc or .LRC sidecar files (AC-1)
    let companion_lower = audio_path.with_extension("lrc");
    let companion_upper = audio_path.with_extension("LRC");

    let companion_path = if companion_lower.is_file() {
        Some(companion_lower)
    } else if companion_upper.is_file() {
        Some(companion_upper)
    } else {
        None
    };

    if let Some(lrc_path) = companion_path {
        if let Ok(bytes) = std::fs::read(&lrc_path) {
            let mod_time = get_file_modified_time(&lrc_path);
            let parsed = parser::parse_lrc(&bytes, track_id);
            let lines_json = if !parsed.lines.is_empty() {
                serde_json::to_string(&parsed.lines).ok()
            } else {
                None
            };

            let entity = TrackLyricsEntity {
                id: cached
                    .as_ref()
                    .map(|c| c.id.clone())
                    .unwrap_or_else(|| Uuid::new_v4().to_string()),
                track_id: track_id.to_string(),
                has_lyrics: parsed.has_lyrics,
                is_synced: parsed.is_synced,
                plain_text: parsed.plain_text,
                lines_json,
                source_type: "lrc".to_string(),
                source_file_path: Some(lrc_path.to_string_lossy().to_string()),
                source_modified_at: mod_time,
                user_offset_ms: existing_user_offset_ms,
                created_at: cached
                    .as_ref()
                    .map(|c| c.created_at)
                    .unwrap_or_else(current_epoch_seconds),
                updated_at: current_epoch_seconds(),
            };

            lyrics_repo::upsert_track_lyrics(conn, &entity)?;
            return Ok(lyrics_repo::entity_to_dto(&entity));
        }
    }

    // 4. Priority 2: Check embedded tags via lofty (AC-1)
    if audio_path.is_file() {
        if let Ok(probe) = Probe::open(audio_path) {
            if let Ok(tagged_file) = probe.read() {
                let tag = tagged_file
                    .primary_tag()
                    .or_else(|| tagged_file.first_tag());
                let embedded_lyrics: Option<String> = tag.and_then(|t| {
                    t.get(&ItemKey::Lyrics).and_then(|item| match item.value() {
                        lofty::tag::ItemValue::Text(ref s) => Some(s.clone()),
                        _ => None,
                    })
                });

                if let Some(raw_lyrics) = embedded_lyrics {
                    let mod_time = get_file_modified_time(audio_path);
                    let parsed = parser::parse_lrc(raw_lyrics.as_bytes(), track_id);
                    let lines_json = if !parsed.lines.is_empty() {
                        serde_json::to_string(&parsed.lines).ok()
                    } else {
                        None
                    };

                    let entity = TrackLyricsEntity {
                        id: cached
                            .as_ref()
                            .map(|c| c.id.clone())
                            .unwrap_or_else(|| Uuid::new_v4().to_string()),
                        track_id: track_id.to_string(),
                        has_lyrics: parsed.has_lyrics,
                        is_synced: parsed.is_synced,
                        plain_text: parsed.plain_text,
                        lines_json,
                        source_type: "embedded".to_string(),
                        source_file_path: Some(audio_path.to_string_lossy().to_string()),
                        source_modified_at: mod_time,
                        user_offset_ms: existing_user_offset_ms,
                        created_at: cached
                            .as_ref()
                            .map(|c| c.created_at)
                            .unwrap_or_else(current_epoch_seconds),
                        updated_at: current_epoch_seconds(),
                    };

                    lyrics_repo::upsert_track_lyrics(conn, &entity)?;
                    return Ok(lyrics_repo::entity_to_dto(&entity));
                }
            }
        }
    }

    // 5. Fallback: No lyrics discovered (AC-10)
    let mod_time = if audio_path.is_file() {
        get_file_modified_time(audio_path)
    } else {
        None
    };

    let empty_entity = TrackLyricsEntity {
        id: cached
            .as_ref()
            .map(|c| c.id.clone())
            .unwrap_or_else(|| Uuid::new_v4().to_string()),
        track_id: track_id.to_string(),
        has_lyrics: false,
        is_synced: false,
        plain_text: None,
        lines_json: None,
        source_type: "none".to_string(),
        source_file_path: Some(audio_path.to_string_lossy().to_string()),
        source_modified_at: mod_time,
        user_offset_ms: existing_user_offset_ms,
        created_at: cached
            .as_ref()
            .map(|c| c.created_at)
            .unwrap_or_else(current_epoch_seconds),
        updated_at: current_epoch_seconds(),
    };

    lyrics_repo::upsert_track_lyrics(conn, &empty_entity)?;
    Ok(lyrics_repo::entity_to_dto(&empty_entity))
}
