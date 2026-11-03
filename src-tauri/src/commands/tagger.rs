//! Tauri IPC command handlers for audio metadata probing, single track tag saving,
//! and batch multi track tag updating.

use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::audio::AudioState;
use crate::db::models::TrackDto;
use crate::db::track_repo;
use crate::db::DatabaseError;
use crate::db::DbState;
use crate::tagger::models::{
    BatchItemErrorDto, BatchSaveResultDto, CoverArtAction, LibraryTracksUpdatedEvent,
    ProbedAudioTagsDto, SaveBatchTagsDto, SaveTrackTagsDto,
};
use crate::tagger::{probe, repo, writer};

/// Helper resolving the persistent album cover cache directory.
fn resolve_covers_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_cache_dir()
        .unwrap_or_else(|_| {
            app.path()
                .app_local_data_dir()
                .expect("Failed to resolve app local data directory")
        })
        .join("covers")
}

fn restore_file_backup(
    audio_state: &AudioState,
    backup: &writer::AudioFileBackup,
) -> Result<(), String> {
    let backup = backup.clone();
    let path = backup.path().to_path_buf();
    audio_state
        .0
        .execute_with_reload_guard(&path, move || writer::restore_audio_file_backup(&backup))
}

fn cleanup_file_backup(backup: &writer::AudioFileBackup) {
    if let Err(err) = writer::discard_audio_file_backup(backup) {
        eprintln!("Warning: {}", err);
    }
}

/// Probes physical audio file tags and stream properties using Lofty (AC-1).
#[tauri::command]
pub async fn tag_editor_probe_file(
    track_id: String,
    file_path: Option<String>,
    db_state: State<'_, DbState>,
    app: AppHandle,
) -> Result<ProbedAudioTagsDto, String> {
    let resolved_path = match file_path {
        Some(p) if !p.trim().is_empty() => p,
        _ => {
            let track_opt = db_state
                .0
                .with_conn(|conn| track_repo::get_track_by_id(conn, &track_id))
                .map_err(|err| format!("Database error fetching track {}: {}", track_id, err))?;
            match track_opt {
                Some(track) => track.file_path,
                None => return Err(format!("Track not found with id {}", track_id)),
            }
        }
    };

    let path_obj = PathBuf::from(&resolved_path);
    let canonical_path = db_state
        .0
        .with_conn(|conn| {
            repo::validate_path_in_library_folders(conn, &path_obj)
                .map_err(DatabaseError::write_failed)
        })
        .map_err(|err| err.to_string())?;

    let covers_dir = resolve_covers_dir(&app);
    probe::probe_audio_file(&track_id, &canonical_path, &covers_dir)
}

/// Commits edited tags to physical audio file and updates SQLite transactionally (AC-1, AC-6, AC-7, AC-8).
#[tauri::command]
pub async fn tag_editor_save_track(
    payload: SaveTrackTagsDto,
    db_state: State<'_, DbState>,
    audio_state: State<'_, AudioState>,
    app: AppHandle,
) -> Result<TrackDto, String> {
    let raw_path = match &payload.file_path {
        Some(p) if !p.trim().is_empty() => p.clone(),
        _ => {
            let track_opt = db_state
                .0
                .with_conn(|conn| track_repo::get_track_by_id(conn, &payload.track_id))
                .map_err(|err| format!("Database error fetching track: {}", err))?;
            match track_opt {
                Some(t) => t.file_path,
                None => return Err(format!("Track not found with id {}", payload.track_id)),
            }
        }
    };

    let path_obj = PathBuf::from(&raw_path);
    let canonical_path = db_state
        .0
        .with_conn(|conn| {
            repo::validate_path_in_library_folders(conn, &path_obj)
                .map_err(DatabaseError::write_failed)
        })
        .map_err(|err| err.to_string())?;

    let covers_dir = resolve_covers_dir(&app);
    let backup = writer::backup_audio_file(&canonical_path)?;

    // Physical write under reload guard
    let payload_clone = payload.clone();
    let covers_dir_clone = covers_dir.clone();
    let path_for_write = canonical_path.clone();
    let write_result = match audio_state
        .0
        .execute_with_reload_guard(&canonical_path, move || {
            writer::write_tags_to_file(&path_for_write, &payload_clone, &covers_dir_clone)
        }) {
        Ok(write_result) => write_result,
        Err(err) => {
            return match restore_file_backup(&audio_state, &backup) {
                Ok(()) => Err(err),
                Err(restore_err) => Err(format!("{}. {}", err, restore_err)),
            };
        }
    };

    // Commit to SQLite
    let updated_track = match db_state.0.with_conn(|conn| {
        repo::save_track_metadata_transaction(conn, &payload, &write_result)
            .map_err(DatabaseError::write_failed)
    }) {
        Ok(updated_track) => updated_track,
        Err(err) => {
            let db_error = err.to_string();
            return match restore_file_backup(&audio_state, &backup) {
                Ok(()) => Err(db_error),
                Err(restore_err) => Err(format!("{}. {}", db_error, restore_err)),
            };
        }
    };
    cleanup_file_backup(&backup);

    // Emit event
    let album_ids = updated_track.album_id.clone().into_iter().collect();
    let event_payload = LibraryTracksUpdatedEvent {
        track_ids: vec![payload.track_id],
        album_ids,
    };
    let _ = app.emit("library:tracks-updated", &event_payload);

    Ok(updated_track)
}

/// Commits edited tags across multiple tracks in a single batch (AC-4, AC-6, AC-7, AC-8, AC-9).
#[tauri::command]
pub async fn tag_editor_save_batch(
    payload: SaveBatchTagsDto,
    db_state: State<'_, DbState>,
    audio_state: State<'_, AudioState>,
    app: AppHandle,
) -> Result<BatchSaveResultDto, String> {
    let covers_dir = resolve_covers_dir(&app);
    let mut item_results: Vec<(
        SaveTrackTagsDto,
        writer::PhysicalWriteResult,
        writer::AudioFileBackup,
    )> = Vec::new();
    let mut failed: Vec<BatchItemErrorDto> = Vec::new();

    for track_id in &payload.track_ids {
        let track_res = db_state
            .0
            .with_conn(|conn| track_repo::get_track_by_id(conn, track_id))
            .map_err(|err| format!("Database error fetching track {}: {}", track_id, err));

        let track = match track_res {
            Ok(Some(t)) => t,
            Ok(None) => {
                failed.push(BatchItemErrorDto {
                    track_id: track_id.clone(),
                    file_path: String::new(),
                    error: format!("Track not found with id {}", track_id),
                });
                continue;
            }
            Err(e) => {
                failed.push(BatchItemErrorDto {
                    track_id: track_id.clone(),
                    file_path: String::new(),
                    error: e,
                });
                continue;
            }
        };

        let file_path = PathBuf::from(&track.file_path);
        let canonical_path = match db_state.0.with_conn(|conn| {
            repo::validate_path_in_library_folders(conn, &file_path)
                .map_err(DatabaseError::write_failed)
        }) {
            Ok(cp) => cp,
            Err(err) => {
                failed.push(BatchItemErrorDto {
                    track_id: track_id.clone(),
                    file_path: track.file_path.clone(),
                    error: err.to_string(),
                });
                continue;
            }
        };

        // Merge batch updates onto track properties
        let item_payload = SaveTrackTagsDto {
            track_id: track.id.clone(),
            file_path: Some(track.file_path.clone()),
            title: track.title.clone(),
            artist_name: payload
                .updates
                .artist_name
                .as_deref()
                .unwrap_or(&track.artist_name)
                .to_string(),
            album_name: payload
                .updates
                .album_name
                .as_ref()
                .cloned()
                .or(track.album_name.clone()),
            album_artist: payload
                .updates
                .album_artist
                .clone()
                .unwrap_or_else(|| track.album_artist.clone()),
            genre: payload
                .updates
                .genre
                .clone()
                .unwrap_or_else(|| track.genre.clone()),
            year: payload.updates.year.unwrap_or(track.year),
            track_number: track.track_number,
            disc_number: payload.updates.disc_number.unwrap_or(track.disc_number),
            cover_art_action: payload
                .updates
                .cover_art_action
                .clone()
                .unwrap_or(CoverArtAction::Keep),
        };

        let backup = match writer::backup_audio_file(&canonical_path) {
            Ok(backup) => backup,
            Err(err) => {
                failed.push(BatchItemErrorDto {
                    track_id: track.id.clone(),
                    file_path: track.file_path.clone(),
                    error: err,
                });
                continue;
            }
        };

        let payload_for_write = item_payload.clone();
        let covers_dir_clone = covers_dir.clone();
        let path_for_write = canonical_path.clone();

        let write_op = audio_state
            .0
            .execute_with_reload_guard(&canonical_path, move || {
                writer::write_tags_to_file(&path_for_write, &payload_for_write, &covers_dir_clone)
            });

        match write_op {
            Ok(write_res) => {
                item_results.push((item_payload, write_res, backup));
            }
            Err(err) => {
                let error = match restore_file_backup(&audio_state, &backup) {
                    Ok(()) => err,
                    Err(restore_err) => format!("{}. {}", err, restore_err),
                };
                failed.push(BatchItemErrorDto {
                    track_id: track.id.clone(),
                    file_path: track.file_path.clone(),
                    error,
                });
            }
        }
    }

    if item_results.is_empty() {
        return Ok(BatchSaveResultDto {
            album: None,
            succeeded: Vec::new(),
            failed,
            total_updated: 0,
        });
    }

    let db_item_results: Vec<_> = item_results
        .iter()
        .map(|(item_payload, write_result, _)| (item_payload.clone(), write_result.clone()))
        .collect();
    let db_result = db_state
        .0
        .with_conn(|conn| {
            repo::save_batch_metadata_transaction(
                conn,
                payload.album_id.as_deref(),
                &payload.updates,
                &db_item_results,
            )
            .map_err(DatabaseError::write_failed)
        })
        .map_err(|err| err.to_string());
    let (album_dto, succeeded_tracks) = match db_result {
        Ok(result) => result,
        Err(db_error) => {
            let mut rollback_errors = Vec::new();
            for (_, _, backup) in &item_results {
                if let Err(err) = restore_file_backup(&audio_state, backup) {
                    rollback_errors.push(err);
                }
            }
            return if rollback_errors.is_empty() {
                Err(db_error)
            } else {
                Err(format!(
                    "{}. Failed to restore one or more files: {}",
                    db_error,
                    rollback_errors.join("; ")
                ))
            };
        }
    };
    for (_, _, backup) in &item_results {
        cleanup_file_backup(backup);
    }

    let total_updated = succeeded_tracks.len();

    // Collect track and album ids for event notification
    let mut updated_album_ids = Vec::new();
    if let Some(ref alb) = album_dto {
        updated_album_ids.push(alb.id.clone());
    } else if let Some(ref aid) = payload.album_id {
        updated_album_ids.push(aid.clone());
    }
    for t in &succeeded_tracks {
        if let Some(ref aid) = t.album_id {
            if !updated_album_ids.contains(aid) {
                updated_album_ids.push(aid.clone());
            }
        }
    }

    let updated_track_ids: Vec<String> = succeeded_tracks.iter().map(|t| t.id.clone()).collect();
    let event = LibraryTracksUpdatedEvent {
        track_ids: updated_track_ids,
        album_ids: updated_album_ids,
    };
    let _ = app.emit("library:tracks-updated", &event);

    Ok(BatchSaveResultDto {
        album: album_dto,
        succeeded: succeeded_tracks,
        failed,
        total_updated,
    })
}
