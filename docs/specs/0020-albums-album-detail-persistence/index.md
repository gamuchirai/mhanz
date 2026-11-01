# 0020. Albums and album detail persistence

**Date**: 2026-10-31
**Status**: Accepted

## Summary

This specification defines the persistence architecture connecting the Albums overview grid and Album Detail screens to the local SQLite database. Following the Facade build approach, it transitions the album catalog and detailed tracklists from in memory fixtures to durable SQLite storage using Tauri IPC commands and Zustand store actions. Listeners can browse albums scanned from local folders, open multi disc releases with sequenced tracks and calculated durations, and toggle album favorites with bidirectional song like synchronization.

## Requirements

**User stories**:

- As a listener browsing my local music collection, I want the Albums catalog hydrated directly from SQLite so that I can see all albums discovered by the local library scanner.
- As a listener opening an album, I want its detailed tracklist, calculated total duration, release year, and disc structure loaded from the database so that the album release is faithfully presented.
- As a listener enjoying double albums or box sets, I want multi disc releases grouped cleanly by disc number and track sequence so that album order is preserved.
- As a listener with favorite albums, I want to toggle an album heart icon to persist its favorite status in SQLite immediately and synchronize with all tracks in that album.
- As a listener curating music, I want an album to be marked as favorite automatically whenever fifty percent or more of its tracks are liked.
- As a listener running the app in a web browser without Tauri, I want the album store to fall back gracefully to placeholder fixtures so that development and browser testing work smoothly.

**Acceptance criteria**:

- **AC-1**: SQLite schema migration V004 adds nullable `is_favorite` integer column (default 0) and `favorited_at` integer timestamp column to the `albums` table, with an index on `(is_favorite, favorited_at DESC)` for fast sorting and filtering.
- **AC-2**: The `catalog_repo::get_albums` and `catalog_repo::get_album_details` queries compute `COUNT(t.id)` as `track_count`, `COALESCE(SUM(t.duration), 0.0)` as `total_duration`, and evaluate `is_favorite` as true when either the album record has `is_favorite = 1` or at least fifty percent of its tracks have `is_favorite = 1` with `COUNT(t.id) > 0`.
- **AC-3**: Rust and TypeScript data transfer objects for `AlbumDto` include `total_duration: f64` and `is_favorite: bool`, matching the frontend `Album` domain interface requirements, with nullable fields converted safely (`artist_id` to empty string, `year` to 0, `genre` to empty string, and `cover_art_path` formatted via asset protocol).
- **AC-4**: Tauri IPC command `db_get_album_details` queries SQLite for the album header and all associated tracks ordered strictly by `disc_number ASC, track_number ASC, title ASC`, returning `AlbumDetailDto` with typed `AlbumDto` and `Vec<TrackDto>`.
- **AC-5**: Tauri IPC command `db_toggle_album_favorite` accepts an album identifier and optional `target_favorite` boolean, updates `albums.is_favorite` and `albums.favorited_at` (current epoch seconds when favorited, null when unliked) inside an atomic transaction, sets all tracks in that album to match the target like state (`tracks.is_favorite` and `tracks.liked_at`), and returns an `AlbumFavoriteResultDto` containing `is_favorite` and all `affected_tracks: Vec<TrackDto>`.
- **AC-6**: `useAlbumStore` provides an asynchronous `initializeAlbums` action called during application boot that invokes `dbGetAlbums` when running under Tauri, hydrating album records into reactive state, setting `favoriteAlbumIds` from favorited records, setting `isLoading` to false, and preserving active search and sort preferences.
- **AC-7**: Opening an album detail view in `useAlbumStore` lazily invokes `dbGetAlbumDetails` for the requested album identifier, populates `albumTracks[albumId]` with mapped tracks, and calculates disc grouping without refetching already cached album releases unless invalidated.
- **AC-8**: Toggling an album favorite in `useAlbumStore` applies an optimistic state update to the album and all its cached tracks, issues `db_toggle_album_favorite` with the desired boolean target, broadcasts the full updated tracks through `favoritesSync.broadcastBatch`, and automatically rolls back to a saved snapshot if the IPC invocation fails.
- **AC-9**: When individual tracks are liked or unliked via `favoritesSync` across any store, `useAlbumStore` updates the liked state of matching cached album tracks and recalculates the derived album favorite status based on the fifty percent liked threshold.
- **AC-10**: `useAlbumStore` listens to library scan completion via `onScanCompleted` from `scanner.ts`, automatically re fetching the album catalog from SQLite to incorporate newly scanned releases without resetting scroll position, and re fetching the active album detail tracklist if an album is currently open.
- **AC-11**: When running in a browser environment where `isTauri()` returns false, `useAlbumStore` falls back to placeholder fixture albums from `mockAlbums.ts` for browser previews and headless component tests.
- **AC-12**: Clicking Play All or Shuffle on an album detail screen converts the loaded SQLite `AlbumTrack` entities into player `Track` objects, preserves multi disc order or applies Fisher Yates shuffle, and delegates playback initiation to `usePlayerStore`.

## Decision

**Chosen option**: Option 1: Optimistic Zustand store hydration with V004 SQLite migration, bidirectional track like synchronization, and scanner event coordination

Connect the existing album overview and detail views to SQLite through expanded Tauri IPC commands and a new V004 database migration. The albums catalog hydrates asynchronously during application boot, with detailed disc tracklists loaded lazily upon selecting an album. Album favorite state persists immediately in SQLite with optimistic store updates and rollback protection. Toggling an album favorite synchronizes all tracks in the release with full track data broadcast in batch, while liking fifty percent or more of individual songs automatically elevates an album to favorite status. Active scanner events trigger silent catalog and active detail re hydration to keep the albums view up to date with disk changes.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```sql
-- Migration V004: Albums favorites and duration support
ALTER TABLE albums ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
ALTER TABLE albums ADD COLUMN favorited_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_albums_favorite_date ON albums(is_favorite, favorited_at DESC);
```

**Rust and TypeScript Data Transfer Contracts**:

```rust
// Rust DTOs in src-tauri/src/db/models.rs
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AlbumDto {
    pub id: String,
    pub title: String,
    pub artist_id: Option<String>,
    pub artist_name: String,
    pub year: Option<i32>,
    pub genre: Option<String>,
    pub cover_art_path: Option<String>,
    pub total_discs: i32,
    pub track_count: u32,
    pub total_duration: f64,
    pub is_favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AlbumFavoriteResultDto {
    pub album_id: String,
    pub is_favorite: bool,
    pub affected_tracks: Vec<TrackDto>,
}
```

```typescript
// TypeScript interfaces in src/types/database.ts
export interface AlbumDto {
  id: string;
  title: string;
  artist_id?: string | null;
  artist_name: string;
  year?: number | null;
  genre?: string | null;
  cover_art_path?: string | null;
  total_discs: number;
  track_count: number;
  total_duration: number;
  is_favorite: boolean;
  created_at: number;
  updated_at: number;
}

export interface AlbumFavoriteResultDto {
  album_id: string;
  is_favorite: boolean;
  affected_tracks: TrackDto[];
}
```

**Domain Mapping and Nullable Defaults**:

| Source field in DTO | Target field in UI | Fallback default when null |
|---|---|---|
| `artist_id` (`Option<String>`) | `Album.artistId` (`string`) | `""` |
| `year` (`Option<i32>`) | `Album.releaseYear` (`number`) | `0` |
| `genre` (`Option<String>`) | `Album.genre` (`string`) | `""` |
| `cover_art_path` (`Option<String>`) | `Album.coverUrl` (`string`) | `formatCoverArtUrl(path)` or vinyl placeholder |
| `track_number` (`Option<i32>`) | `AlbumTrack.trackNumber` (`number`) | `1` |
| `file_path` (`string`) | `AlbumTrack.audioUrl` (`string`) | `convertFileSrc(file_path)` |

**API surface**:

| Command | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `db_get_albums` | IPC Invoke | none | `Vec<AlbumDto>` | Local desktop | Database query error |
| `db_get_album_details` | IPC Invoke | `id: String` | `Option<AlbumDetailDto>` | Local desktop | Album not found, query error |
| `db_toggle_album_favorite` | IPC Invoke | `id: String`, `target_favorite: Option<bool>` | `AlbumFavoriteResultDto` | Local desktop | Album not found, write error |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Browse albums grid | Album artwork, title, artist name, year | SQLite `albums` columns and `t.cover_art_path` |
| Browse albums grid | Track count per album | SQLite `COUNT(t.id)` aggregate in `catalog_repo` |
| Browse albums grid | Total duration in seconds | SQLite `COALESCE(SUM(t.duration), 0.0)` aggregate |
| Browse albums grid | Favorite heart status | SQLite `is_favorite` or derived `liked_tracks * 2 >= total_tracks` |
| Open album detail | Hero banner artwork and metadata | `AlbumDto` in `AlbumDetailDto` |
| Open album detail | Sequenced multi disc tracklist | SQLite `tracks` filtered by `album_id` sorted by disc and track number |
| Toggle album favorite | Explicit target favorite state | Passed from UI heart state (`!isFavorite`) to `db_toggle_album_favorite` |
| Sync other stores | Full track details for Liked Songs | `affected_tracks: Vec<TrackDto>` in `AlbumFavoriteResultDto` |
| Scanner complete | Newly indexed albums and tracks | Refresh from `db_get_albums` and `db_get_album_details` on `onScanCompleted` |

**Key invariants**:

- Bidirectional like rule: liking an album marks all tracks in that album as liked in SQLite; unliking an album unmarks all tracks in that album.
- Derived like rule: an album is considered favorite in queries and store state if at least fifty percent of its tracks are liked (`liked_tracks * 2 >= total_tracks` where `total_tracks > 0`), or if `albums.is_favorite = 1`.
- Track sequencing: tracks in an album detail view are strictly ordered by `disc_number ASC, track_number ASC, title ASC`.
- Single disc vs multi disc: albums with tracks spanning only one disc suppress disc header separators; albums with tracks across multiple discs render distinct disc header sections.
- Environment isolation: `isTauri()` guards determine whether to invoke IPC commands or fall back to mock data.
- Atomic rollback: if a database write fails during an album favorite toggle, the store reverts both album and track states to their previous snapshot and logs a console warning.

**Security model**:

Local single tenant desktop application; no remote authentication or multi tenancy boundaries. All database interactions utilize parameterized queries via rusqlite `params![...]` to prevent SQL injection vulnerabilities.

**Configuration required**:

None. Operates directly on the embedded SQLite database file `mutinhimira.db` in the application local data directory.

**Critical test scenarios**:

- Happy path: Boot application, verify albums load from SQLite, open album detail to observe sequenced multi disc tracks and calculated duration, verifies **AC-2**, **AC-4**, **AC-6**, **AC-7**.
- Favorite toggle: Click album heart, verify SQLite write sets album and all tracks to liked, and verify `favoritesSync.broadcastBatch` broadcasts full track records, verifies **AC-1**, **AC-5**, **AC-8**.
- Derived favorite: Like fifty percent of songs in an album individually, verify the album heart toggles to active automatically in the store, verifies **AC-2**, **AC-9**.
- Scanner refresh: Trigger `onScanCompleted`, verify albums store re queries SQLite without jumping scroll position, and refreshes the active album detail view if open, verifies **AC-10**.
- Browser fallback: Run in browser environment without Tauri, verify store populates fixture albums smoothly, verifies **AC-11**.
- Playback queueing: Click Play All on album detail, verify sequential player tracks populate `usePlayerStore`, verifies **AC-12**.

## Build plan

Following the project Facade delivery approach, the build wires the existing clickable UI shell to SQLite persistence, coordinates cross store state, and verifies desktop behavior:

- [x] Create migration `V004__album_favorites.sql` adding `is_favorite` and `favorited_at` to `albums` table with composite index, and register it in `create_migrations`, satisfies **AC-1**.
- [x] Update `AlbumDto` and `AlbumDetailDto` in Rust and TypeScript, and enhance queries in `catalog_repo::get_albums`, `catalog_repo::get_album_details`, `catalog_repo::get_artist_profile`, and `search_repo::search_library` to include total duration and derived favorite status, satisfies **AC-2**, **AC-3**, **AC-4**.
- [x] Implement `catalog_repo::toggle_album_favorite` transactional helper supporting optional explicit target, expose Tauri IPC command `db_toggle_album_favorite`, and add client service wrapper in `src/services/db.ts`, satisfies **AC-5**.
- [x] Extend `favoritesSync.ts` with `broadcastBatch` supporting full `TrackDto` payloads so that `useLikedSongsStore` hydrates complete track metadata without notification storms, satisfies **AC-5**, **AC-8**.
- [x] Update `useAlbumStore` with `initializeAlbums` and `fetchAlbumDetails` actions backed by `dbGetAlbums` and `dbGetAlbumDetails`, guarded by `isTauri()`, satisfies **AC-6**, **AC-7**, **AC-11**.
- [x] Implement optimistic `toggleFavoriteAlbum` in `useAlbumStore` with snapshot rollback, calling `dbToggleAlbumFavorite` with explicit target and dispatching affected tracks to `favoritesSync.broadcastBatch`, satisfies **AC-8**.
- [x] Wire `favoritesSync` subscriber in `useAlbumStore` to recalculate derived album favorite state when individual tracks change, satisfies **AC-9**.
- [x] Connect `onScanCompleted` listener in `useAlbumStore` to silently re hydrate album records and refresh active album detail upon scan completion, satisfies **AC-10**.
- [x] Integrate album detail playback queueing and track action triggers with `usePlayerStore`, satisfies **AC-12**.
- [x] Write comprehensive integration tests for album persistence, favorite synchronization, batch broadcasting, and mock fallback behavior, satisfies **AC-1** through **AC-12**.

## Migration plan

**Strategy**: Safe forward migration via compiled rusqlite migrations suite.
**Phases**:
1. Phase 1: Migration script `V004__album_favorites.sql` executes on database startup via `create_migrations`, adding columns and index without altering existing data.
2. Phase 2: Application code deploys reading and writing the new columns, while falling back gracefully on empty or un favorited albums.
**Rollback**: SQLite table columns remain backwards compatible; if a revert is required, earlier code versions ignore the additional columns safely.
**Risks**: Large library collections with thousands of tracks could experience slow aggregate queries if the composite index is omitted; index creation in V004 mitigates this risk.

## Consequences

**Positive**:
- Scanned local music albums persist durably across restarts without reliance on static fixtures.
- Album tracklists and multi disc structures render with accurate audio metadata and aggregated durations.
- Bidirectional favorite synchronization keeps album hearts and individual song likes aligned everywhere.
- Automatic scanner refresh ensures newly added music folders appear in Albums immediately.

**Negative / tradeoffs**:
- Computing total duration and liked track ratios adds slight aggregation overhead to the albums query; mitigated by SQLite group by indexing.
- Unliking an album clears likes on all its tracks, which deliberately overwrites previously favorited individual song states for that release.

**Neutral**:
- Requires updating existing mock fixtures and unit tests to accommodate the updated `AlbumDto` structure.

## Follow-up

- [x] Update Feature 20 in `docs/scope/scope.md` to link spec 0020 and enroll build milestones.
- [x] Update review finding F-2 in `docs/reviews/README.md` to reference spec 0020.
