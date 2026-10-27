# 0015. Playlists and favorites persistence

**Date**: 2026-10-24
**Status**: Accepted

## Summary

This specification defines the persistence architecture connecting Mumhanzi playlist management and liked songs to the local SQLite database. Following the Facade build approach, it transitions the existing user interface shells from placeholder fixtures to durable SQLite storage using Tauri IPC commands and reactive Zustand stores. Users can create, update, reorder, and delete playlists with custom visual gradient presets, while song likes persist instantly across application restarts with optimistic interface updates and rollback protection.

## Requirements

**User stories**:

- As a listener curating playlists, I want my custom playlists and track order saved in SQLite so that my collections persist across application restarts.
- As a listener organizing music, I want to add, remove, and drag reorder playlist tracks with immediate visual feedback so that editing feels fast and responsive.
- As a music lover with favorite songs, I want clicking the heart icon on any song to save my choice to SQLite immediately so that my liked songs stay synchronized everywhere.
- As a listener managing my favorites, I want unliked songs to remain visible until I leave the Liked Songs screen so that I can undo accidental unlikes without losing context.
- As a user opening the application for the first time, I want helpful default playlists preloaded so that I can explore music immediately without manual setup.
- As a listener experiencing an unexpected database error, I want the user interface to revert smoothly and notify me with a toast message so that my screen never displays false state.

**Acceptance criteria**:

- **AC-1**: Database schema migration V002 introduces a nullable `liked_at` integer timestamp column on the tracks table, adds `is_curated` to playlists, and creates an index on `(is_favorite, liked_at DESC)` for fast date ordered favorite queries.
- **AC-2**: Playlist entity and SQLite repository support storing `gradient_preset` keys, optional `cover_art_path` file paths, and an `is_curated` boolean flag alongside title, description, timestamps, and favorite status.
- **AC-3**: Rust and TypeScript IPC command contracts for `db_create_playlist` and `db_update_playlist` accept a structured `PlaylistInputDto` payload object containing name, optional description, optional gradient preset, and optional cover art path.
- **AC-4**: Default sample playlists from fixtures seed into SQLite transactionally on first application startup whenever the playlists table is empty, creating standard editable playlist containers with zero initial track entries to prevent foreign key errors before library scanning.
- **AC-5**: `usePlaylistStore` provides an asynchronous `initializePlaylists` action called during application boot that queries SQLite via `dbGetPlaylists`, hydrating playlist header records into reactive state with an `isLoaded` flag, while opening a playlist detail view lazily fetches its ordered tracklist via `dbGetPlaylistDetails`.
- **AC-6**: `useLikedSongsStore` provides an asynchronous `initializeLikedSongs` action called during application boot that queries SQLite for tracks where `is_favorite = 1` ordered by `liked_at DESC`, converting epoch timestamps to ISO date strings and hydrating the collection with an `isLoaded` flag.
- **AC-7**: Modal playlist operations for creation and deletion await the local SQLite IPC command before closing dialogs or navigating, while inline metadata edits update local store state optimistically and roll back with a toast notification if the database write fails.
- **AC-8**: Adding, removing, or reordering tracks in a playlist updates local store state optimistically and issues asynchronous SQLite IPC commands, with `db_reorder_playlist_tracks` matching strictly on `playlist_tracks.id` entry identifiers and assigning sequential zero based positions 0 to N atomically within a database transaction.
- **AC-9**: Toggling track favorite status writes to SQLite immediately via `db_toggle_track_favorite`, updating `is_favorite` and setting `liked_at` to current unix epoch seconds (or null when unliked), while serializing rapid in flight clicks per track identifier to avoid race conditions.
- **AC-10**: In `useLikedSongsStore`, unliking a track persists the unliked state to SQLite immediately while retaining the track row in the view until navigation, allowing instant undo within the current screen session.
- **AC-11**: Track favorite toggles synchronize reactively across all stores (`useLikedSongsStore`, `usePlayerStore`, `useLibraryStore`, `useAlbumStore`, `usePlaylistStore`) through a centralized `favoritesSync` coordinator, deprecating direct cross store method invocations.
- **AC-12**: Deleting a playlist that is currently playing allows the active song to finish playing, clears the active playlist context title, and removes upcoming playlist tracks from the playback queue via `clearContextIfMatches` in `usePlayerStore`.

## Decision

**Chosen option**: Option 1: Optimistic Zustand store wiring with structured Tauri IPC commands, transactional seeding, and synchronized favorite state management

Connect the existing playlist and liked songs stores to SQLite through expanded Tauri IPC commands with typed payload structs. Store updates occur optimistically for instant responsiveness on high frequency interactions (heart toggles, drag reordering, adding or removing tracks), with automatic snapshot rollback and toast alerts if an IPC invocation fails. Modal actions (playlist creation and deletion) await IPC completion before navigating to prevent inconsistent view routing. Favorites synchronize across all active stores using a central `favoritesSync` coordinator, preserving immediate persistence while respecting the liked songs temporary retention pattern.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```sql
-- Migration V002: Add liked_at timestamp and playlist metadata enhancements

ALTER TABLE tracks ADD COLUMN liked_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_tracks_favorite_liked ON tracks(is_favorite, liked_at DESC);

ALTER TABLE playlists ADD COLUMN is_curated INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_playlists_favorite ON playlists(is_favorite);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_composite ON playlist_tracks(playlist_id, position);
```

**Rust and TypeScript Data Transfer Contracts**:

```rust
// Rust DTOs in src-tauri/src/db/models.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistInputDto {
    pub name: String,
    pub description: Option<String>,
    pub gradient_preset: Option<String>,
    pub cover_art_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TrackFilterDto {
    pub folder_id: Option<String>,
    pub is_favorite: Option<bool>,
    pub search_query: Option<String>,
    pub artist_id: Option<String>,
    pub album_id: Option<String>,
    pub genre: Option<String>,
    pub sort_by: Option<String>,        // e.g. "liked_at", "title", "created_at"
    pub sort_direction: Option<String>, // "asc" or "desc"
}
```

```typescript
// TypeScript contracts in src/types/database.ts
export interface PlaylistInputDto {
  name: string;
  description?: string;
  gradient_preset?: string;
  cover_art_path?: string;
}

export interface TrackFilterDto {
  folder_id?: string;
  is_favorite?: boolean;
  search_query?: string;
  artist_id?: string;
  album_id?: string;
  genre?: string;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
}
```

**State transitions**:

- Playlist lifecycle: Seeded (empty container) or Created -> Hydrated in store -> Opened (detail tracks fetched and cached) -> Updated (name, description, gradient) -> Reordered (positions updated in atomic transaction) -> Deleted (cascades to playlist tracks).
- Favorite lifecycle: Track indexed (is_favorite = 0, liked_at = NULL) -> Liked (is_favorite = 1, liked_at = current timestamp) -> Unliked in view (is_favorite = 0, liked_at = NULL, row retained until navigation) -> Navigated away (purged from active liked list).
- Playback context during playlist deletion: Active track playing with playlist context -> Playlist deleted -> Active track finishes playback, `clearContextIfMatches("playlist", playlistId)` clears context title and removes remaining queued playlist tracks.

**API surface**:

| Endpoint or Command | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| db_get_playlists | Tauri Command | none | Vec\<PlaylistDto\> | Local IPC | DB_QUERY_FAILED |
| db_get_playlist_details | Tauri Command | id: String | Option\<PlaylistDetailDto\> | Local IPC | DB_QUERY_FAILED |
| db_create_playlist | Tauri Command | payload: PlaylistInputDto | PlaylistDto | Local IPC | DB_WRITE_FAILED, INVALID_NAME |
| db_update_playlist | Tauri Command | id: String, payload: PlaylistInputDto | PlaylistDto | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_delete_playlist | Tauri Command | id: String | bool | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_add_tracks_to_playlist | Tauri Command | playlist_id: String, track_ids: Vec\<String\> | u32 | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_remove_playlist_track | Tauri Command | playlist_id: String, entry_id: String | bool | Local IPC | ITEM_NOT_FOUND, DB_WRITE_FAILED |
| db_reorder_playlist_tracks | Tauri Command | playlist_id: String, ordered_entry_ids: Vec\<String\> | bool | Local IPC | PLAYLIST_NOT_FOUND, DB_WRITE_FAILED |
| db_toggle_track_favorite | Tauri Command | id: String | bool | Local IPC | TRACK_NOT_FOUND, DB_WRITE_FAILED |
| db_get_tracks | Tauri Command | page: u32, limit: u32, filter: Option\<TrackFilterDto\> | PaginatedTracksDto | Local IPC | DB_QUERY_FAILED |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| db_get_playlists | Playlist cards list with track counts | SQLite playlists query joined with count of playlist_tracks |
| db_get_playlist_details | Ordered tracklist with metadata | SQLite playlist_tracks joined with tracks table ordered by position |
| db_create_playlist | Generated playlist ID and creation timestamp | Rust UUID v4 generator and unix epoch seconds |
| db_update_playlist | Updated metadata and gradient preset | Input payload stored in SQLite playlists row |
| db_reorder_playlist_tracks | Updated track position sequence | Array index from ordered_entry_ids mapped to position integer column |
| db_toggle_track_favorite | New favorite boolean and liked_at timestamp | Inverted boolean and current unix timestamp written to tracks table |
| db_get_tracks (favorites) | Chronologically ordered liked songs | Query on tracks WHERE is_favorite = 1 ORDER BY liked_at DESC |
| dateLiked in LikedTrack | Formatted ISO 8601 date string | `new Date(liked_at * 1000).toISOString()` |
| coverGradient styling | CSS linear gradient string | Lookup in `MIDNIGHT_GRADIENT_PRESETS` matching `gradient_preset` key |

**Key invariants**:

- Contiguous track positions: Playlist track positions always form a contiguous zero based integer sequence (0, 1, 2, ... N) without gaps or duplicate positions within a playlist.
- Strict entry matching during reorder: Reordering matches strictly on `playlist_tracks.id` primary keys, preventing position collisions when a playlist contains multiple instances of the same track.
- Atomicity of reordering: Reordering tracks within a playlist executes entirely within a single SQLite transaction. If any update fails, the entire transaction rolls back to preserve existing order.
- Immediate favorite persistence: Heart toggles commit immediately to SQLite so that database state never lags behind user intent, even if the user closes the app immediately.
- In flight serialization: Rapid consecutive clicks on the same track identifier queue behind an in flight lock to prevent out of order database updates.
- Optimistic rollback: Inline store modifications (reordering, track additions or removals, liking) preserve a previous state snapshot and revert if the background IPC call fails.
- Safe initial seeding: Sample playlists seed as empty containers with zero initial track references, satisfying foreign key integrity before library folders are scanned.

**Security model**:

- Local desktop execution: Runs exclusively within the local Tauri application process without remote endpoints or multi user concerns.
- Parameterized SQL: All database access utilizes rusqlite parameterized queries (`params![...]`), preventing SQL injection.
- IPC scope restriction: Capabilities in `capabilities/default.json` restrict all database commands to the main application window.
- Cover art path validation: Custom cover image paths must resolve to valid existing local files with supported image extensions (`png`, `jpg`, `jpeg`, `webp`).

**Configuration required**:

No external environment variables or credentials required. Persistence operates directly on the local SQLite file located in the application local data directory.

**Critical test scenarios**:

- Happy path: App boots on clean slate, seeds default playlist containers, queries playlists from SQLite, adds tracks, reorders tracks, and verifies order persistence after restart, verifies **AC-4**, **AC-5**, **AC-8**.
- Happy path: Toggling heart icon in player footer or library updates SQLite immediately, reflects in liked songs view, and persists across reload, verifies **AC-6**, **AC-9**, **AC-11**.
- Unliking retention: Unliking a track in Liked Songs updates SQLite immediately while retaining the track row until navigation away, verifies **AC-10**.
- Optimistic rollback: Simulated IPC failure on playlist update or track reorder reverts local store state to previous snapshot and displays toast notification, verifies **AC-7**, **AC-8**.
- Concurrency and rapid clicks: Rapid clicking on a track heart icon serializes cleanly through in flight queue without race conditions or database deadlocks, verifies **AC-9**.
- Playback deletion safety: Deleting a playlist that is currently playing allows active song to finish playing while clearing playlist context and upcoming queue, verifies **AC-12**.

## Build plan

1. Create database schema migration V002 adding `liked_at` column to tracks table, `is_curated` column to playlists table, and composite index on `(is_favorite, liked_at DESC)`, satisfies **AC-1**.
2. Update Rust playlist domain models and repository methods to support structured `PlaylistInputDto` with `gradient_preset` and `cover_art_path`, and align `remove_playlist_track` to take `entry_id`, satisfies **AC-2**, **AC-3**, **AC-8**.
3. Update Rust track repository to record `liked_at` timestamp on favorite toggles, add `sort_by` and `sort_direction` to `TrackFilterDto`, and query favorites ordered by `liked_at DESC`, satisfies **AC-1**, **AC-6**, **AC-9**.
4. Implement Rust database seeding service to insert initial sample playlist containers transactionally on startup when the database is empty, satisfies **AC-4**.
5. Update Tauri IPC commands in `src-tauri/src/commands/db.rs` to expose updated playlist and favorite methods, satisfies **AC-3**, **AC-8**, **AC-9**.
6. Update frontend database client service in `src/services/db.ts` and types in `src/types/database.ts` with typed payload contracts and unit tests, satisfies **AC-3**, **AC-5**, **AC-6**.
7. Create centralized favorite synchronization coordinator in `src/services/favoritesSync.ts` with in flight request deduplication and cross store event broadcast, satisfies **AC-9**, **AC-11**.
8. Wire `src/store/useLikedSongsStore.ts` with `initializeLikedSongs`, SQLite queries, instant persistence, and optimistic rollback, satisfies **AC-6**, **AC-9**, **AC-10**.
9. Wire `src/store/usePlaylistStore.ts` with `initializePlaylists`, lazy tracklist hydration via `dbGetPlaylistDetails`, optimistic CRUD, track curation, and atomic reordering persistence, satisfies **AC-5**, **AC-7**, **AC-8**.
10. Extend `usePlayerStore.ts` with `playbackContext` and connect playlist deletion in `usePlaylistStore` to clear active playlist context and upcoming queue without interrupting current track, satisfies **AC-12**.
11. Write comprehensive unit and integration test suite covering store hydration, optimistic rollback, reordering transactions, and cross store sync, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:

- Playlists, track order, and favorites persist reliably across application restarts in local SQLite storage.
- User interface feels immediate and smooth thanks to optimistic updates on high frequency interactions with automatic error rollback.
- Cross store synchronization ensures favorite heart states are never out of sync between views.
- Default seeded playlists provide an engaging out of the box experience without risking foreign key errors.

**Negative / tradeoffs**:

- Optimistic state updates require snapshot management and error toast handling across stores.
- Managing in flight request locks adds a small layer of coordination logic for rapid heart toggles.

**Neutral**:

- Extends existing SQLite schema with migration V002 without requiring data migration for previous tracks.

## Migration plan

**Strategy**: Strangler migration within frontend stores, transitioning from in memory fixtures to SQLite persistence while preserving identical component prop contracts.
**Phases**:
1. Implement Rust V002 migration, seeding service, and updated Tauri IPC commands.
2. Update frontend database client service and add centralized favorite sync coordinator.
3. Switch `usePlaylistStore` and `useLikedSongsStore` to hydrate from SQLite on startup while keeping component contracts unchanged.
**Rollback**: If SQLite persistence encounters issues, stores can fall back to in memory fixtures by toggling an initialization flag.
**Risks**: Database lock contention during heavy simultaneous operations, mitigated by SQLite WAL mode and five second busy timeout.

## Follow-up

- [ ] Verify that background library scanning in feature 15 populates tracks table without resetting existing `is_favorite` or `liked_at` values.
