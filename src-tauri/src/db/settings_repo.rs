//! Key value player preferences persistence repository.

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};

use super::error::DatabaseError;

/// Queries a stored setting string value by its key.
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, DatabaseError> {
    let mut stmt = conn
        .prepare("SELECT value FROM player_settings WHERE key = ?1")
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    let mut rows = stmt
        .query_map(params![key], |row| row.get(0))
        .map_err(|err| DatabaseError::query_failed(err.to_string()))?;

    if let Some(res) = rows.next() {
        Ok(Some(res?))
    } else {
        Ok(None)
    }
}

/// Stores or updates an arbitrary key value preference with current timestamp.
pub fn set_setting(conn: &mut Connection, key: &str, value: &str) -> Result<bool, DatabaseError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    conn.execute(
        r#"
        INSERT INTO player_settings (key, value, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        "#,
        params![key, value, now],
    )
    .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    Ok(true)
}
