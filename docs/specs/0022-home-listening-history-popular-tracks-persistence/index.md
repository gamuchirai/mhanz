# 0022. Home listening history and popular tracks persistence

**Date**: 2026-11-01
**Status**: Accepted

## Summary

This specification defines the persistence architecture connecting the Home and discovery screen in Mutinhimira to local SQLite storage. Following the Facade build approach, it replaces static prototype fixtures in the recently played carousel, popular tracks list, and hero showcase banner with authentic data from the listener's local music collection. A dedicated listening history table records playback sessions when tracks pass an audio playback milestone of thirty seconds or half duration, while popular songs are selected from SQLite play counts with graceful backfill. A background event emitted by the native audio engine keeps the user interface synchronized in real time without polling, maintaining an instant and responsive desktop experience.

## Requirements

**User stories**:

- As a listener opening Mutinhimira, I want the Recently Played carousel on the Home screen to display songs I actually played from my local library so that I can quickly resume recent music.
- As a listener who revisits favorite music, I want the Popular Tracks list to highlight songs with the highest local play counts so that my top songs are easily accessible.
- As a listener who skips or previews tracks briefly, I want listening history and play counts to record only after thirty seconds or half duration so accidental clicks do not pollute my records.
- As a listener browsing recent listening history, I want repeated plays of the same song deduplicated so each track appears once with its latest play timestamp.
- As a listener clearing playback history, I want an option to clear my recent history log from SQLite while preserving all time play statistics on my library tracks.
- As a user with an empty library or unplayed tracks, I want clear contextual empty states explaining whether to scan music folders or start listening.
- As a developer running in a web browser without the native Tauri runtime, I want the home screen to fall back smoothly to preview fixtures.

**Acceptance criteria**:

- **AC-1**: SQLite schema migration V005 creates the `listening_history` table with columns `id` (primary key text), `track_id` (foreign key text referencing `tracks(id)` with `ON DELETE CASCADE`), `played_at` (integer timestamp), `context_title` (nullable text), and `context_type` (nullable text), alongside indices on `played_at DESC` and `track_id`.
- **AC-2**: SQLite schema migration V005 creates an index `idx_tracks_play_count` on `tracks(play_count DESC, title ASC)` to accelerate popular track queries.
- **AC-3**: Rust backend repository provides `get_recent_plays(limit)` returning distinct recent tracks deduplicated by track identifier, ordered by most recent `played_at` descending, with batch pruning keeping the table bounded to approximately 1000 entries.
- **AC-4**: Rust backend repository provides `get_popular_tracks(limit)` defaulting to 10 tracks, returning songs with `play_count > 0` ordered by `play_count DESC, title ASC`, backfilling remaining slots from unplayed tracks (`play_count = 0`) ordered by `is_favorite DESC, liked_at DESC NULLS LAST, created_at DESC`.
- **AC-5**: The audio playback progress monitor records a listening history entry and increments track play count only upon reaching the playback milestone (thirty seconds of audio or half duration), protected by a session latch to prevent duplicate writes during seeks, executed asynchronously without holding audio mutex locks.
- **AC-6**: When a playback milestone is reached and persisted to SQLite, the backend emits a Tauri window event `audio:history-recorded` containing the newly recorded play history item data transfer object.
- **AC-7**: Native IPC command `audio_play_track` accepts optional `context_title: Option<String>` and `context_type: Option<String>` parameters passed from `usePlayerStore` active playback context, storing them in audio state for milestone history recording.
- **AC-8**: Tauri IPC commands `db_get_recent_plays`, `db_get_popular_tracks`, and `db_clear_playback_history` are registered in command handlers and authorized in Tauri capability permissions.
- **AC-9**: Rust struct `PlayHistoryItemDto` embeds a full joined `track: TrackDto`, and TypeScript client service in `src/services/db.ts` provides typed functions `dbGetRecentPlays`, `dbGetPopularTracks`, and `dbClearPlaybackHistory`, mapping `played_at` seconds to milliseconds (`playedAtTimestamp`) and converting artwork paths via `formatCoverArtUrl`.
- **AC-10**: `usePlayerStore` hydrates `recentPlays`, `popularTracks`, and `libraryTrackCount` from SQLite on application startup or when navigating to the Home screen, retiring the instant optimistic history push from `playTrack` and falling back to mock fixtures in web browser environments.
- **AC-11**: `usePlayerStore` subscribes to the `audio:history-recorded` Tauri event, prepending the new history item to `recentPlays` and refreshing `popularTracks` reactively without page reloads; browser mock mode simulates milestone completion after thirty progress ticks.
- **AC-12**: The Home screen hero banner dynamically displays the top popular track adapted to a showcase card with badge TOP PLAYED (falling back to fixture card when empty), the recently played carousel renders real deduplicated history with quick play triggers, and the popular tracks table lists ranked songs with formatted durations and play counts.
- **AC-13**: When `libraryTrackCount` is zero, the Home screen displays guidance directing the listener to scan music in Your Library; when tracks exist but none have been played, the carousel displays an invitation to start playing songs.
- **AC-14**: Invoking `clearRecentPlays` calls `db_clear_playback_history`, truncating the `listening_history` table in SQLite while leaving all time `play_count` values on `tracks` intact.

## Decision

**Chosen option**: Option 1: Dedicated SQLite listening history table with milestone playback recording, sliding window retention, and reactive event synchronization.

Implement a dedicated `listening_history` relational table in SQLite migration V005, recording playback events automatically when the audio engine reaches thirty seconds or half duration. Rust backend repositories expose fast queries for deduplicated recent plays and top played tracks with graceful backfill. Playback context is passed to the audio engine upon track play. A Tauri event `audio:history-recorded` notifies `usePlayerStore` to prepend new history items reactively. The Home page components connect directly to hydrated store state, displaying real local music metrics with contextual empty states and dynamic showcase banner.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `tailwind-4-docs` (`lombiq/tailwind-agent-skills`, `.agents/skills/tailwind-4-docs/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```sql
-- Migration V005: Listening history table and popular tracks index

CREATE TABLE IF NOT EXISTS listening_history (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    played_at INTEGER NOT NULL,
    context_title TEXT,
    context_type TEXT
);

-- Index for rapid retrieval of recent plays in reverse chronological order
CREATE INDEX IF NOT EXISTS idx_listening_history_played_at 
ON listening_history(played_at DESC);

-- Index for track foreign key lookups and cascade operations
CREATE INDEX IF NOT EXISTS idx_listening_history_track_id 
ON listening_history(track_id);

-- Index on tracks to accelerate popular tracks queries
CREATE INDEX IF NOT EXISTS idx_tracks_play_count 
ON tracks(play_count DESC, title ASC);
```

**State transitions**:

```
Audio Playback Milestone Latch Lifecycle:
[Track Loaded via audio_play_track]
       │ (receives context_title and context_type)
       ▼ (position = 0s, play_count_recorded = false)
[Playing Audio]
       │
       ├─ Seek / Pause / Resume ──► [Playing Audio] (play_count_recorded remains false)
       │
       ▼ (position >= 30s OR position >= duration / 2)
[Milestone Triggered]
       │
       ├─ Set play_count_recorded = true (prevents duplicate writes on subsequent seeks)
       ├─ Spawn non-blocking background task via tauri::async_runtime::spawn_blocking:
       │    1. Insert listening_history row (id, track_id, played_at, context_title, context_type)
       │    2. Increment tracks.play_count and update tracks.last_played_at
       │    3. If total history rows > 1050, batch prune oldest rows to 1000
       └─ Emit Tauri window event: "audio:history-recorded" with PlayHistoryItemDto
       │
       ▼
[Continued Playback / Track Ended]
       │
       ▼ (New track loaded via audio_play_track)
[Track Loaded] (reset play_count_recorded = false)
```

**API surface**:

| Surface | Layer | Key inputs | Key outputs | Auth / Scope | Key errors |
|---|---|---|---|---|---|
| audio_play_track | Tauri IPC command | track_id: String, file_path: String, start_pos: f64, duration: f64, context_title: Option\<String\>, context_type: Option\<String\> | () | local desktop | file not found, audio format error |
| db_get_recent_plays | Tauri IPC command | limit: Option\<u32\> | Vec\<PlayHistoryItemDto\> | local desktop | database query error |
| db_get_popular_tracks | Tauri IPC command | limit: Option\<u32\> | Vec\<TrackDto\> | local desktop | database query error |
| db_clear_playback_history | Tauri IPC command | none | () | local desktop | database write error |
| audio:history-recorded | Tauri window event | none (payload emitted by audio thread) | PlayHistoryItemDto | local desktop | none |
| audioPlayTrack | TS audio service | trackId: string, filePath: string, startPos: number, duration: number, contextTitle?: string, contextType?: string | Promise\<void\> | public frontend | ipc error |
| dbGetRecentPlays | TS database service | limit?: number | Promise\<PlayHistoryItem[]\> | public frontend | ipc error with fallback |
| dbGetPopularTracks | TS database service | limit?: number | Promise\<Track[]\> | public frontend | ipc error with fallback |
| dbClearPlaybackHistory | TS database service | none | Promise\<void\> | public frontend | ipc error |
| initializeHomeDiscovery | Zustand player store | none | Promise\<void\> | public store | logged, sets isHydrated |
| clearRecentPlays | Zustand player store | none | Promise\<void\> | public store | optimistic update, persists to db |

**DTO contracts**:

```rust
// Rust backend: src-tauri/src/db/models.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayHistoryItemDto {
    pub id: String,
    pub track_id: String,
    pub played_at: i64,
    pub context_title: Option<String>,
    pub context_type: Option<String>,
    pub track: TrackDto,
}
```

```typescript
// TypeScript frontend: src/types/database.ts
export interface PlayHistoryItemDto {
  id: string;
  track_id: string;
  played_at: number;
  context_title: string | null;
  context_type: string | null;
  track: TrackDto;
}
```

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Render recent plays carousel | Track title, artist, album, duration, artwork, played timestamp | Joined `listening_history` and `tracks` columns from `db_get_recent_plays` |
| Quick play recent carousel item | Playback queue and audio file path | `Track` object attached to `PlayHistoryItem` |
| Render popular tracks table | Track title, artist name, duration, play count, liked state | `TrackDto` rows returned by `db_get_popular_tracks` |
| Popular track rank indicator | Two digit rank string (01 through 10) | Derived from zero based row index in `TrackTable` |
| Render hero showcase banner | Featured track title, artist, album art, play button trigger | Derived from `popularTracks[0]` with badge TOP PLAYED, falling back to fixture card when empty |
| Milestone history recording | Event identifier, timestamp, context title, context type | UUID generated in Rust, system clock epoch seconds, active context in audio state |
| Carousel empty state check | Guidance message type (scan library vs start playing) | Comparison of `libraryTrackCount` against `recentPlays.length` in `usePlayerStore` |

**Key invariants**:

- In desktop mode, `usePlayerStore` must never overwrite hydrated SQLite history with mock fixtures when database queries succeed.
- Each track must appear at most once in the recently played carousel, showing its most recent playback timestamp.
- The `listening_history` table maintains a sliding window of approximately 1000 rows, batch pruning older records whenever total rows exceed 1050.
- Seeking before or after thirty seconds must never trigger duplicate history entries or multiple play count increments within the same play session.
- Deleting or pruning a track in the local library scanner cascades deletion to all associated `listening_history` rows via `ON DELETE CASCADE`.
- Invoking `clearRecentPlays` clears all rows in `listening_history` but leaves the `play_count` column in `tracks` completely unchanged.
- All artwork paths must be converted through `formatCoverArtUrl` to ensure compatibility with the custom Tauri asset protocol.

**Security model**:

- Execution runs strictly within the local desktop sandbox using Tauri v2 inter process communication.
- Database access uses localized rusqlite prepared statements with parameterized arguments, preventing SQL injection vulnerabilities.
- No network requests, remote telemetry, or external API tokens are required.

**Configuration required**:

- No new environment variables, configuration files, or secret keys are needed.

**Critical test scenarios**:

- Happy path recent plays: Playing a track past thirty seconds records a history entry in SQLite, emits `audio:history-recorded`, and updates the Home carousel with the played track, verifies **AC-3**, **AC-5**, **AC-6**, **AC-11**.
- Happy path popular tracks: Querying popular tracks returns songs ranked by `play_count` descending, displaying formatted play counts and durations in the table, verifies **AC-4**, **AC-12**.
- Seek deduplication: Seeking repeatedly across the thirty second mark during a single track play session increments play count exactly once and creates one history record, verifies **AC-5**.
- History deduplication: Playing the same song across multiple distinct sessions updates its position to the front of the carousel with the latest timestamp without duplicate cards, verifies **AC-3**, **AC-12**.
- Graceful popular tracks backfill: In a library where only two songs have been played, the popular tracks query returns those two played songs followed by eight unplayed favorite or recent songs, verifies **AC-4**.
- Clear history retention: Clicking clear recent plays truncates `listening_history` and empties the carousel while preserving track play counts in `tracks`, verifies **AC-14**.
- Contextual empty states: Launching with zero library tracks prompts to scan folders; launching with scanned songs but zero plays prompts to play songs, verifies **AC-13**.
- Foreign key cascade: Removing a track file from disk and running a library rescan cleans up matching rows in `listening_history`, verifies **AC-1**.
- Web browser preview fallback: Running in a web browser without Tauri runtime falls back to mock fixtures smoothly, verifies **AC-10**.

## Migration plan

**Strategy**: SQLite sequential schema migration (V005).

**Phases**:

1. Migration file `src-tauri/migrations/V005__listening_history.sql` creates table `listening_history`, indices on `played_at` and `track_id`, and index on `tracks(play_count DESC, title ASC)`.
2. Register migration in `src-tauri/src/db/connection.rs` inside `create_migrations`.
3. Rust backend repository and command handlers implement data access and register IPC commands in `src-tauri/src/lib.rs` and permissions in `capabilities/default.json`.
4. Audio engine progress loop links playback milestones to background database inserts and Tauri event broadcasts.
5. Frontend services and `usePlayerStore` wire hydration, event listeners, and UI components.

**Rollback**:

- If migration fails, SQLite rolls back the migration transaction automatically.
- Dropping `listening_history` and removing index `idx_tracks_play_count` restores the exact V004 database state without data loss to existing catalog tables.

**Risks**:

- High disk write activity during large initial library scans could cause database lock contention; mitigated by running milestone writes with exponential backoff on a background thread (`spawn_blocking`).

## Build plan

1. SQLite migration V005: Create `src-tauri/migrations/V005__listening_history.sql` with table `listening_history`, indices, and tracks play count index, and register in `src-tauri/src/db/connection.rs`, satisfies **AC-1**, **AC-2**.
2. Rust backend repository: Implement `history_repo.rs` with `get_recent_plays`, `get_popular_tracks`, `record_playback`, and `clear_history` with batch pruning, satisfies **AC-3**, **AC-4**.
3. Tauri IPC commands and permissions: Expose `db_get_recent_plays`, `db_get_popular_tracks`, and `db_clear_playback_history` in `src-tauri/src/commands/db.rs`, update `invoke_handler!` in `src-tauri/src/lib.rs`, and update `capabilities/default.json`, satisfies **AC-8**.
4. Audio engine context and milestone coordination: Update `audio_play_track` to accept `context_title` and `context_type`, record history upon milestone via non blocking task, and emit `audio:history-recorded` Tauri event, satisfies **AC-5**, **AC-6**, **AC-7**.
5. TypeScript database service client: Add `dbGetRecentPlays`, `dbGetPopularTracks`, and `dbClearPlaybackHistory` in `src/services/db.ts` with DTO adapters and `formatCoverArtUrl` artwork formatting, satisfies **AC-9**.
6. Zustand player store hydration and event sync: Extend `src/store/usePlayerStore.ts` with `initializeHomeDiscovery`, `audio:history-recorded` event listener, scanner sync, and browser mock fallback, satisfies **AC-10**, **AC-11**, **AC-14**.
7. Home UI components wiring: Connect `RecentCarousel.tsx`, `TrackTable.tsx`, `HeroBanner.tsx`, and `Home.tsx` to hydrated store data, implementing contextual empty states, dynamic hero card, and play triggers, satisfies **AC-12**, **AC-13**.
8. Unit and integration tests: Add backend Rust tests and frontend Vitest integration tests covering history recording, popular tracks backfill, deduplication, clear history, and browser fallback, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**.

## Consequences

**Positive**:

- Real listening history and popular tracks replace static placeholder mock fixtures across the Home discovery screen.
- Milestone recording at thirty seconds ensures that brief skips or accidental track clicks do not distort listening history or play counts.
- Dedicated history table enables accurate auditing, timestamp tracking, and deduplication while keeping track rows clean.
- Background event emission keeps the Home screen updated reactively when music is playing without inefficient polling intervals.
- Graceful backfill ensures the Popular Tracks table remains aesthetically balanced and usable even in freshly scanned music collections.

**Negative / tradeoffs**:

- Creating a new history table requires an additional database migration and slightly increases database disk storage over time (capped by the 1000 row sliding window).
- Requires coordination between the audio engine thread and SQLite connection manager to record events without disrupting audio stream timing.

**Neutral**:

- Preserves existing selectors `useRecentPlays` and `usePopularTracks` in `usePlayerStore`, avoiding component refactoring across other parts of the application.

## Follow-up

- [ ] In a future phase, explore customizable time ranges for popular tracks (such as most played this month or this week) once listening history data accumulates over several months.
- [ ] Connect the CuratedGrid "Made for you" section on the Home screen to local playlist recommendations and recently scanned albums.
