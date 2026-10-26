//! SQLite connection management, pragma configuration, and migration execution.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};

use super::error::DatabaseError;

/// Embedded initial V001 migration script.
pub const MIGRATION_V001: &str = include_str!("../../migrations/V001__initial_schema.sql");

/// Construct the compiled migrations suite for Mumhanzi.
pub fn create_migrations() -> Migrations<'static> {
    Migrations::new(vec![M::up(MIGRATION_V001)])
}

/// Applies required SQLite pragmas for thread safety, WAL concurrency, and foreign keys.
pub fn configure_pragmas(conn: &mut Connection) -> Result<(), DatabaseError> {
    conn.busy_timeout(Duration::from_millis(5000))
        .map_err(|err| DatabaseError::write_failed(err.to_string()))?;

    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
        "#,
    )
    .map_err(|err| DatabaseError::write_failed(format!("Failed to apply pragmas: {}", err)))?;

    Ok(())
}

/// Thread safe database manager holding the protected SQLite connection and metadata.
pub struct DatabaseManager {
    /// Mutex guarded connection ensuring serialized write safety across threads.
    pub conn: Mutex<Connection>,
    /// Path to the database file on disk.
    pub path: PathBuf,
    /// Indicates whether a corruption recovery backup was performed during startup.
    pub corrupt_backup_created: bool,
}

impl DatabaseManager {
    /// Initializes an in memory database connection for testing.
    pub fn new_in_memory() -> Result<Self, DatabaseError> {
        let mut conn = Connection::open_in_memory()
            .map_err(|err| DatabaseError::not_initialized(err.to_string()))?;

        configure_pragmas(&mut conn)?;

        let migrations = create_migrations();
        migrations
            .to_latest(&mut conn)
            .map_err(|err| DatabaseError::migration_failed(err.to_string()))?;

        Ok(Self {
            conn: Mutex::new(conn),
            path: PathBuf::from(":memory:"),
            corrupt_backup_created: false,
        })
    }

    /// Initializes a disk backed database connection at the specified file path.
    /// If opening or migration fails due to file corruption, creates a backup copy
    /// and initializes a fresh database schema.
    pub fn new_at_path(db_path: &Path) -> Result<Self, DatabaseError> {
        if let Some(parent) = db_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|err| {
                    DatabaseError::write_failed(format!(
                        "Could not create database directory {}: {}",
                        parent.display(),
                        err
                    ))
                })?;
            }
        }

        let mut corrupt_backup_created = false;
        let mut conn = match Self::open_and_migrate(db_path) {
            Ok(conn) => conn,
            Err(first_err) => {
                if db_path.exists() {
                    let timestamp = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    let backup_filename = format!(
                        "{}.bak.{}",
                        db_path
                            .file_name()
                            .and_then(|f| f.to_str())
                            .unwrap_or("mumhanzi.db"),
                        timestamp
                    );
                    let backup_path = db_path.with_file_name(backup_filename);

                    let _ = fs::copy(db_path, &backup_path);
                    let _ = fs::remove_file(db_path);
                    corrupt_backup_created = true;

                    Self::open_and_migrate(db_path).map_err(|retry_err| {
                        DatabaseError::migration_failed(format!(
                            "Failed to recreate database after corruption (first error: {}, retry error: {})",
                            first_err, retry_err
                        ))
                    })?
                } else {
                    return Err(first_err);
                }
            }
        };

        configure_pragmas(&mut conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
            path: db_path.to_path_buf(),
            corrupt_backup_created,
        })
    }

    /// Internal helper to open a SQLite connection and run all pending migrations.
    fn open_and_migrate(path: &Path) -> Result<Connection, DatabaseError> {
        let mut conn = Connection::open(path)
            .map_err(|err| DatabaseError::not_initialized(err.to_string()))?;

        configure_pragmas(&mut conn)?;

        let migrations = create_migrations();
        migrations
            .to_latest(&mut conn)
            .map_err(|err| DatabaseError::migration_failed(err.to_string()))?;

        Ok(conn)
    }

    /// Obtains exclusive access to the underlying connection to run a closure.
    pub fn with_conn<F, R>(&self, f: F) -> Result<R, DatabaseError>
    where
        F: FnOnce(&mut Connection) -> Result<R, DatabaseError>,
    {
        let mut guard = self
            .conn
            .lock()
            .map_err(|err| DatabaseError::write_failed(format!("Lock poisoned: {}", err)))?;
        f(&mut guard)
    }

    /// Returns the currently active migration version number.
    pub fn schema_version(&self) -> Result<usize, DatabaseError> {
        self.with_conn(|conn| {
            let migrations = create_migrations();
            let current = migrations
                .current_version(conn)
                .map_err(|err| DatabaseError::query_failed(err.to_string()))?;
            Ok(current.into())
        })
    }
}
