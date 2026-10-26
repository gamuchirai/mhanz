# 0012. Data model and SQLite storage

**Date**: 2026-10-24
**Status**: In Progress

## Summary

This specification defines the relational database architecture, domain models, and persistence layer for Mumhanzi. It introduces an embedded SQLite storage engine using rusqlite with bundled SQLite, managed schema migrations via rusqlite migration, and a clean domain repository architecture in Rust. Following the Clean Architecture boundaries and Facade delivery strategy, this foundation establishes robust local persistence for audio tracks, albums, artists, playlists, indexed library folders, and user settings, exposing safe and strongly typed Tauri IPC commands to the TypeScript presentation layer.

## Decision

**Chosen option**: Option 3: Embedded SQLite with rusqlite bundled feature, rusqlite migration runner, connection guarded by an asynchronous Mutex with WAL mode, and Clean Architecture Rust repositories exposing db prefixed Tauri commands

Adopt a self contained SQLite engine compiled directly into the Mumhanzi binary using rusqlite with the bundled feature flag. Manage schema versioning through rusqlite migration using embedded SQL files compiled via include str. Concurrency is handled through SQLite Write Ahead Logging mode, foreign keys enforcement, a five second busy timeout, and a thread safe connection wrapper registered into Tauri managed state. Domain repositories isolate SQL operations behind clean interfaces, returning strongly typed Result types that serialize to TypeScript contracts.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`)

## Requirements

**User stories**:

- As a listener with a large music collection, I want my indexed songs, albums, and artists saved into a fast local database so that the application loads instantly without rescanning audio files on every launch.
- As a music collector, I want to create, rename, and organize playlists with custom track ordering so that my curated lists survive application restarts.
- As a listener loving favorite tracks, I want my liked songs and play counts updated reliably so that my music statistics and favorites remain accurate.
- As a desktop user managing multiple music folders, I want my monitored folder locations stored safely so that background library scanning knows exactly where to look.
- As an engineer building Phase 2 features, I want clear and typed Tauri IPC commands for database access so that frontend stores easily wire up to real persistence.
- As a desktop user experiencing unexpected system crashes, I want write ahead logging and automatic corrupt file recovery so that my library database remains resilient.

**Acceptance criteria**:

- **AC-1**: Cargo configuration includes rusqlite with the bundled feature flag and rusqlite migration for self contained, zero dependency compilation across Windows, macOS, and Linux.
- **AC-2**: Initial SQL migration V001 defines normalized relational tables for folders, artists, albums, tracks, playlists, playlist tracks, and player settings with primary keys, unique indices, and foreign keys.
- **AC-3**: Database file location resolves automatically to the standard operating system local application data directory using Tauri path resolver (`app_local_data_dir/mumhanzi.db`).
- **AC-4**: SQLite pragmas are enforced on every opened connection: `journal_mode = WAL`, `synchronous = NORMAL`, `foreign_keys = ON`, and `busy_timeout = 5000`.
- **AC-5**: Database connection and migrations execute synchronously during the Tauri setup lifecycle hook before the frontend webview renders, ensuring the schema is always ready before UI invocations.
- **AC-6**: All database Tauri IPC commands adopt an explicit `db_` prefix and return typed `Result<T, DatabaseError>` payloads where errors serialize with structured error codes and descriptive messages.
- **AC-7**: Folder repository provides functions to list all active monitored folders, register new unique folder paths, and deactivate or remove monitored folder records.
- **AC-8**: Track repository supports paginated retrieval, filtering by folder or favorite status, toggling liked state, incrementing play counters, and updating playback timestamps.
- **AC-9**: Album and artist repositories support retrieval by unique identifier, alphabetical catalog listing, and detailed relationship lookups linking tracks and discographies.
- **AC-10**: Playlist repository enables playlist creation, renaming, description updates, deletion, track appending with position indices, track removal, and batch track reordering.
- **AC-11**: If SQLite file corruption or migration failure occurs on startup, the engine creates a timestamped backup copy (`mumhanzi.db.bak`), initializes a fresh schema, and emits a notification event to the frontend.
- **AC-12**: Settings repository persists arbitrary key value preferences as string records with automatic update timestamps.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```sql
-- Migration V001: Initial Mumhanzi Relational Schema

CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    added_at INTEGER NOT NULL,
    last_scanned_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    bio TEXT,
    avatar_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
    artist_name TEXT NOT NULL,
    year INTEGER,
    genre TEXT,
    cover_art_path TEXT,
    total_discs INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
    artist_name TEXT NOT NULL,
    album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
    album_name TEXT,
    album_artist TEXT,
    duration REAL NOT NULL,
    year INTEGER,
    genre TEXT,
    disc_number INTEGER NOT NULL DEFAULT 1,
    track_number INTEGER,
    bitrate INTEGER,
    format TEXT NOT NULL,
    cover_art_path TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    play_count INTEGER NOT NULL DEFAULT 0,
    last_played_at INTEGER,
    file_modified_at INTEGER NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover_art_path TEXT,
    gradient_preset TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indices for rapid UI searches and foreign key traversals
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_folder_id ON tracks(folder_id);
CREATE INDEX IF NOT EXISTS idx_tracks_is_favorite ON tracks(is_favorite);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_title ON albums(title);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
```

**State transitions**:

- Monitored folder lifecycle: Added (is_active = 1, last_scanned_at = NULL) -> Scanned (last_scanned_at updated) -> Deactivated (is_active = 0) -> Deleted (row removed, cascading to contained tracks).
- Track favorite state: Unliked (is_favorite = 0) <-> Liked (is_favorite = 1, updated_at refreshed).
- Track playback lifecycle: Indexed -> Played (play_count incremented by 1, last_played_at timestamp recorded).
- Playlist track ordering: Appended (position = current count) -> Reordered (positions updated in batch transaction) -> Removed (row deleted, subsequent positions renumbered).

**API surface**:

| Command | Method / Type | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| db_get_status | Tauri Command | none | DatabaseStatusDto | Local IPC | DB_NOT_INITIALIZED |
| db_get_folders | Tauri Command | none | Vec\<FolderDto\> | Local IPC | DB_QUERY_FAILED |
| db_add_folder | Tauri Command | path: String | FolderDto | Local IPC | FOLDER_ALREADY_EXISTS, INVALID_PATH |
| db_remove_folder | Tauri Command | id: String | bool | Local IPC | FOLDER_NOT_FOUND, DB_WRITE_FAILED |
| db_get_tracks | Tauri Command | page: u32, limit: u32, filter: Option\<TrackFilterDto\> | PaginatedTracksDto | Local IPC | DB_QUERY_FAILED |
| db_get_track_by_id | Tauri Command | id: String | Option\<TrackDto\> | Local IPC | DB_QUERY_FAILED |
| db_toggle_track_favorite | Tauri Command | id: String | bool | Local IPC | TRACK_NOT_FOUND, DB_WRITE_FAILED |
| db_increment_play_count | Tauri Command | id: String | u32 | Local IPC | TRACK_NOT_FOUND, DB_WRITE_FAILED |
| db_get_albums | Tauri Command | none | Vec\<AlbumDto\> | Local IPC | DB_QUERY_FAILED |
| db_get_album_details | Tauri Command | id: String | Option\<AlbumDetailDto\> | Local IPC | DB_QUERY_FAILED |
| db_get_artists | Tauri Command | none | Vec\<ArtistDto\> | Local IPC | DB_QUERY_FAILED |
| db_get_artist_profile | Tauri Command | id: String | Option\<ArtistProfileDto\> | Local IPC | DB_QUERY_FAILED |
| db_get_playlists | Tauri Command | none | Vec\<PlaylistDto\> | Local IPC | DB_QUERY_FAILED |
| db_create_playlist | Tauri Command | name: String, description: Option\<String\> | PlaylistDto | Local IPC | DB_WRITE_FAILED, INVALID_NAME |
| db_update_playlist | Tauri Command | id: String, name: String, description: Option\<String\> | PlaylistDto | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_delete_playlist | Tauri Command | id: String | bool | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_add_tracks_to_playlist | Tauri Command | playlist_id: String, track_ids: Vec\<String\> | u32 | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_remove_playlist_track | Tauri Command | playlist_id: String, track_id: String, position: u32 | bool | Local IPC | ITEM_NOT_FOUND, DB_WRITE_FAILED |
| db_reorder_playlist_tracks | Tauri Command | playlist_id: String, ordered_item_ids: Vec\<String\> | bool | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_get_setting | Tauri Command | key: String | Option\<String\> | Local IPC | DB_QUERY_FAILED |
| db_set_setting | Tauri Command | key: String, value: String | bool | Local IPC | DB_WRITE_FAILED |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| db_get_tracks | items list, total count, page | Database tracks table query with limit and offset |
| db_get_track_by_id | track metadata, duration, bitrate | Database tracks table row matching track primary key |
| db_toggle_track_favorite | updated favorite boolean state | Inverted boolean written to tracks.is_favorite column |
| db_increment_play_count | new integer play counter | Incremented integer written to tracks.play_count column |
| db_get_album_details | album header, artist name, tracklist | Join across albums, artists, and tracks sorted by disc and track number |
| db_get_artist_profile | artist bio, top tracks, albums | Join across artists, albums, and tracks ordered by play count |
| db_create_playlist | playlist id, created timestamp | Generated UUID string and current Unix epoch seconds |
| db_reorder_playlist_tracks | updated track positions | Array indices in ordered_item_ids mapped to position integer column |
| db_add_folder | folder id, initial added timestamp | Generated UUID string, verified directory path, Unix epoch seconds |
| db_set_setting | setting key and string value | Input string arguments stored with current Unix timestamp |

**Key invariants**:

- Track file path uniqueness: No two tracks may share the exact same `file_path`. Rescanning a file updates its metadata in place rather than inserting a duplicate record.
- Playlist track position integrity: Track positions within a playlist start at zero and increment sequentially without gaps. Reordering executes inside a transaction to prevent inconsistent intermediate states.
- Foreign key cascade: Deleting a playlist automatically removes all matching entries in `playlist_tracks`. Deleting an album or artist sets the foreign key on child tracks to null while preserving track files.
- Thread safety and lock freedom: Database writes are serialized through an asynchronous Rust Mutex while SQLite Write Ahead Logging allows concurrent reads without locking table readers.

**Security model**:

- Local desktop execution: Single desktop user environment with zero remote web endpoints.
- Parameterized SQL: All database interactions utilize rusqlite parameterized statements (`params![...]`). Direct SQL query concatenation is strictly disallowed.
- Tauri IPC scope: Capabilities in `capabilities/default.json` explicitly restrict all `db_*` commands to the main application window, blocking access from external or unauthorized webviews.
- Path safety: Monitored folder paths must resolve to valid accessible operating system directories.

**Configuration required**:

No external environment variables or cloud credentials required. The SQLite database resides locally at `mumhanzi.db` inside the operating system local app data folder.

**Critical test scenarios**:

- Happy path: Application starts up, runs V001 migrations, creates a playlist, inserts tracks, toggles favorites, and verifies data persistence across restarts, verifies **AC-2**, **AC-5**, **AC-8**, **AC-10**.
- Failure case: Database file write collision or concurrent reader/writer race resolves cleanly through WAL mode and five second busy timeout without table lock errors, verifies **AC-4**, **AC-6**.
- Failure case: Corrupted database file or malformed SQLite header triggers automatic backup copy creation and reinitializes a clean schema gracefully, verifies **AC-11**.
- Transaction rollback: Playlist batch track reordering failure rolls back atomically, leaving original track order unchanged, verifies **AC-6**, **AC-10**.

## Build plan

1. [x] Configure Cargo dependencies in `src-tauri/Cargo.toml` adding rusqlite with bundled feature, rusqlite migration, uuid, and chrono, satisfies **AC-1**, **AC-3**.
2. [x] Write initial schema migration file `src-tauri/migrations/V001__initial_schema.sql` defining folders, artists, albums, tracks, playlists, playlist tracks, and settings with indices, satisfies **AC-2**, **AC-4**.
3. [x] Implement database connection manager and migration runner in `src-tauri/src/db/connection.rs` with WAL mode, foreign keys pragma, busy timeout, and backup recovery, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-11**.
4. [x] Define Rust domain models, DTOs, and error types in `src-tauri/src/db/models.rs` and `src-tauri/src/db/error.rs` matching TypeScript contracts, satisfies **AC-2**, **AC-6**.
5. [x] Implement folder repository in `src-tauri/src/db/folder_repo.rs` with folder listing, insertion, and removal logic, satisfies **AC-4**, **AC-7**.
6. [x] Implement track repository in `src-tauri/src/db/track_repo.rs` supporting pagination, favorite toggling, play count updates, and batch inserts, satisfies **AC-2**, **AC-8**.
7. [x] Implement album and artist catalog repositories in `src-tauri/src/db/catalog_repo.rs` supporting discography and album detail queries, satisfies **AC-2**, **AC-9**.
8. [x] Implement playlist repository in `src-tauri/src/db/playlist_repo.rs` supporting playlist CRUD, track insertion, removal, and transactional reordering, satisfies **AC-2**, **AC-10**.
9. [x] Implement settings repository in `src-tauri/src/db/settings_repo.rs` supporting key value persistence, satisfies **AC-2**, **AC-12**.
10. [x] Implement Tauri IPC commands in `src-tauri/src/commands/db.rs` exposing all database operations with strongly typed JSON results, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.
11. [x] Register database state, commands, and setup lifecycle hook in `src-tauri/src/lib.rs` and configure Tauri capabilities in `capabilities/default.json`, satisfies **AC-5**, **AC-6**.
12. [x] Create frontend TypeScript database client service in `src/services/db.ts` and automated integration tests verifying database command invocation and response parsing, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:

- Complete offline local persistence with zero network requirements or cloud subscription dependencies.
- Fast indexed lookups for track title, artist, album, and playlist searches in under ten milliseconds.
- Clean separation between presentation layer in React and persistence layer in Rust following Clean Architecture boundaries.
- Resilient recovery mechanism safeguarding user playlists and configuration against unexpected file corruption.

**Negative / tradeoffs**:

- Bundled SQLite compilation increases initial Rust native compilation time and binary size by approximately two megabytes.
- Serialization and deserialization across Tauri IPC adds slight processing overhead compared to direct in memory state.

**Neutral**:

- Requires maintaining forward compatible schema migrations as future Phase 2 features (such as library scanner and audio search indexing) introduce new columns or search tables.

## Follow-up

- [ ] Connect scanner service in Feature 15 to batch insert tracks using the new track repository
- [ ] Connect audio playback engine in Feature 14 to increment play counts and update last played timestamps
- [ ] Consider adding SQLite FTS5 full text search table in Feature 17 for high speed fuzzy search indexing
