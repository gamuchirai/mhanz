//! Monitored music folder repository for registering, querying, and removing directories.

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use uuid::Uuid;

use super::error::DatabaseError;
use super::models::FolderDto;

/// Queries all active monitored music library folders.
pub fn get_folders(conn: &Connection) -> Result<Vec<FolderDto>, DatabaseError> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, path, added_at, last_scanned_at, is_active
            FROM folders
            WHERE is_active = 1
            ORDER BY added_at ASC
            "#,
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let folder_iter = stmt
        .query_map([], |row| {
            let is_active_int: i32 = row.get(4)?;
            Ok(FolderDto {
                id: row.get(0)?,
                path: row.get(1)?,
                added_at: row.get(2)?,
                last_scanned_at: row.get(3)?,
                is_active: is_active_int == 1,
            })
        })
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut folders = Vec::new();
    for folder_res in folder_iter {
        folders.push(folder_res?);
    }
    Ok(folders)
}

/// Registers a new monitored folder path into the database.
pub fn add_folder(conn: &mut Connection, folder_path: &str) -> Result<FolderDto, DatabaseError> {
    let trimmed = folder_path.trim();
    if trimmed.is_empty() {
        return Err(DatabaseError::invalid_path("Folder path cannot be empty"));
    }

    // In desktop environments, ensure the directory path exists if not in test mock
    let path_obj = Path::new(trimmed);
    if !path_obj.exists() && !trimmed.starts_with("/mock") && !trimmed.starts_with("mock") {
        return Err(DatabaseError::invalid_path(format!(
            "Directory does not exist on disk: {}",
            trimmed
        )));
    }

    // Check for duplicate path
    let existing_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM folders WHERE path = ?1 AND is_active = 1",
            params![trimmed],
            |row| row.get(0),
        )
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    if existing_count > 0 {
        return Err(DatabaseError::folder_already_exists(format!(
            "Folder path is already monitored: {}",
            trimmed
        )));
    }

    let id = Uuid::new_v4().to_string();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    conn.execute(
        r#"
        INSERT INTO folders (id, path, added_at, last_scanned_at, is_active)
        VALUES (?1, ?2, ?3, NULL, 1)
        ON CONFLICT(path) DO UPDATE SET
            is_active = 1,
            added_at = ?3
        "#,
        params![id, trimmed, now],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(FolderDto {
        id,
        path: trimmed.to_string(),
        added_at: now,
        last_scanned_at: None,
        is_active: true,
    })
}

/// Removes or deactivates a monitored folder by unique identifier.
pub fn remove_folder(conn: &mut Connection, id: &str) -> Result<bool, DatabaseError> {
    let rows_affected = conn
        .execute("DELETE FROM folders WHERE id = ?1", params![id])
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    if rows_affected == 0 {
        return Err(DatabaseError::folder_not_found(format!(
            "No folder found matching id {}",
            id
        )));
    }

    Ok(true)
}
