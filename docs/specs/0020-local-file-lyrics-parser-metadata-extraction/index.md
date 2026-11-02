# 0020. Local file lyrics parser and metadata extraction

**Date**: 2026-10-31
**Status**: Accepted

## Summary

This specification defines the architecture, native Rust parsing pipelines, SQLite persistence contracts, and presentation layer integration for local file lyrics in Mutinhimira. It adds support for synchronized companion lrc files and embedded audio tags with automatic priority resolution, fast on demand line parsing, and persistent user timing adjustments. Following Clean Architecture boundaries and our Facade delivery strategy, this capability connects filesystem sidecar files to our existing lyrics overlay and fullscreen presentation views, giving listeners accurate synchronized lyrics without third party online dependencies.

## Decision

**Chosen option**: Option 1: Native Rust zero dependency LRC and tag parser with companion file priority, SQLite track_lyrics cache, and dedicated presentation useLyricsStore

Adopt a native Rust lyrics module inside the backend that prioritizes external companion lrc files over embedded audio metadata tags, parses timestamped lines into structured arrays, and validates cache freshness using file modification timestamps. Extracted lyrics are cached in a dedicated SQLite `track_lyrics` table using JSON serialized lines, while user timing adjustments are saved per track. In the presentation shell, a dedicated `useLyricsStore` connects playback progress to the existing `LyricsModal` and `FullscreenLyricsView` components, cleanly replacing temporary mock fixtures with real local lyrics.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`)

## Requirements

**User stories**:

- As a listener with local audio files and companion lrc files, I want Mutinhimira to detect and parse synchronized lyrics so that I can sing along with timed line highlighting during music playback.
- As a listener with tagged audio tracks containing embedded lyrics metadata, I want lyrics extracted directly from the audio file so that tracks without separate lrc files still show lyrics.
- As a music collector whose companion lrc files have slightly inaccurate start times, I want to nudge lyric timing with a manual offset so that timestamps align smoothly with the vocal track.
- As a listener playing tracks that have no lyrics, I want the player overlays to display a clean empty state without throwing errors or breaking audio playback.
- As a user updating or editing companion lrc files, I want modified files detected and reparsed automatically so that my lyrics cache stays current with files on disk.

**Acceptance criteria**:

- **AC-1**: Priority resolution for companion files and embedded tags: When lyrics are requested for a track by ID, the backend checks for an adjacent companion `.lrc` file in the same directory using `audio_path.with_extension("lrc")`, falling back to uppercase `audio_path.with_extension("LRC")`. If found, the companion file takes precedence over embedded tags. If no companion file exists, the parser falls back to embedded audio metadata tags retrieved via lofty with `ItemKey::Lyrics` (covering ID3 `USLT`, Vorbis `LYRICS`, and MP4 `©lyr`, as well as embedded timestamped LRC text). Raw binary ID3 `SYLT` frames are de-scoped to preserve zero dependency parsing.
- **AC-2**: Synchronized and plain text LRC parsing: The native Rust parser extracts standard timestamped lines (`[mm:ss.xx]` and `[mm:ss.xxx]`), applies file header offset tags (`[offset: +/-ms]`) directly to line timestamps, strips other metadata headers (`[ar:...]`, `[ti:...]`, `[al:...]`), strips inline word level timing tags, discards empty whitespace lines, handles multiple timestamps referencing a single line by generating discrete timed entries, sorts all lines chronologically by second offset, and falls back gracefully to plain text for untimed lines.
- **AC-3**: Encoding and BOM resilience: The parser detects and strips UTF-8 byte order marks (`\xEF\xBB\xBF`), attempts UTF-8 string decoding, and applies lossy fallback decoding for legacy byte sequences, preventing crashes or syntax failures on unusual character encodings.
- **AC-4**: Relational SQLite schema migration: A dedicated `track_lyrics` table is created via schema migration V004, linked to `tracks(id)` with a unique constraint and cascade delete, storing `has_lyrics`, `is_synced`, `plain_text`, `lines_json`, `source_type`, `source_file_path`, `source_modified_at`, `user_offset_ms`, and timestamps. On cache updates, existing `user_offset_ms` values are preserved atomically without overwrite.
- **AC-5**: On demand caching and freshness validation: Lyrics discovery and persistence operate strictly on demand when requested by track ID (`lyrics_get_for_track`), keeping bulk folder scans unaffected. If a cached record exists, the backend compares `source_modified_at` against the file modification time on disk; if timestamps match, cached data is served instantly, otherwise lines are reparsed and updated in SQLite.
- **AC-6**: Tauri IPC interface contracts and DTO schemas: Three typed IPC commands are exposed to the presentation layer (`lyrics_get_for_track`, `lyrics_set_user_offset`, `lyrics_rescan_for_track`) returning camelCase serialized DTOs (`TrackLyricsDto`, `LyricLineDto`) with deterministic line identifiers (`format!("{}-l{}", track_id, index)`).
- **AC-7**: Presentation layer state and reactive store: A dedicated Zustand store `useLyricsStore` manages current track lyrics fetching, stores loaded lyrics and user offset, debounces SQLite offset writes by 300 milliseconds during rapid nudges, and keeps high frequency active line index calculation local to presentation views using `effectiveTime = currentTime + (userOffsetMs / 1000.0)`.
- **AC-8**: Seamless overlay and fullscreen integration: Existing `LyricsModal` and `FullscreenLyricsView` components are wired to `useLyricsStore`, replacing mock data fixtures, providing clickable line seeking using `seekTarget = Math.max(0, line.timeSeconds - (userOffsetMs / 1000.0))`, showing animated active line auto scroll, rendering timing nudge controls (`[-0.1s]`, `[+0.1s]`, reset) in the header, and rendering `EmptyLyricsState` cleanly when `has_lyrics` is false.
- **AC-9**: Persistent user timing offset: User offset adjustments nudged in the presentation layer (in increments of 100 milliseconds) are applied in real time to line calculations and persisted to the SQLite `track_lyrics` record via `lyrics_set_user_offset`, retaining timing preferences across application restarts. Positive offset advances lyrics (appear earlier relative to music), while negative offset delays lyrics.
- **AC-10**: Resilient error tolerance: Disconnected drives, unreadable files, missing audio tracks, or corrupt lyric syntax return empty lyric payloads (`has_lyrics: false`, `is_synced: false`, empty lines array) without throwing unhandled exceptions or disrupting continuous audio playback.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Table: `track_lyrics`
- `id`: TEXT PRIMARY KEY (UUID v4)
- `track_id`: TEXT NOT NULL UNIQUE (Foreign key referencing `tracks(id)` ON DELETE CASCADE)
- `has_lyrics`: INTEGER NOT NULL DEFAULT 0 (Boolean flag: 1 if lyrics exist, 0 if empty)
- `is_synced`: INTEGER NOT NULL DEFAULT 0 (Boolean flag: 1 for timed lyrics, 0 for plain text)
- `plain_text`: TEXT (Unsynchronized text or concatenated representation)
- `lines_json`: TEXT (JSON serialized array of timestamped lines: `id`, `timeSeconds`, `text`)
- `source_type`: TEXT NOT NULL (Source indicator: `'lrc'`, `'embedded'`, or `'none'`)
- `source_file_path`: TEXT (Absolute path to companion lrc or audio file)
- `source_modified_at`: INTEGER (File modification epoch seconds for cache validation)
- `user_offset_ms`: INTEGER NOT NULL DEFAULT 0 (User offset in milliseconds, positive advances, negative delays)
- `created_at`: INTEGER NOT NULL (Unix epoch seconds)
- `updated_at`: INTEGER NOT NULL (Unix epoch seconds)

Indexes:
- `CREATE UNIQUE INDEX IF NOT EXISTS idx_track_lyrics_track_id ON track_lyrics(track_id);`

Upsert rule:
```sql
INSERT INTO track_lyrics (
    id, track_id, has_lyrics, is_synced, plain_text, lines_json,
    source_type, source_file_path, source_modified_at, user_offset_ms, created_at, updated_at
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
```

**State transitions**:

```text
NoLyricsRecorded -> CheckingSource -> HasLyricsCached (Synced | PlainText)
HasLyricsCached -> SourceModifiedOnDisk -> ReparsedAndCached (Preserving user_offset_ms)
HasLyricsCached -> TrackDeletedFromLibrary -> CascadedRemoval
AnyState -> ErrorOrMissingFile -> EmptyLyricsPayload (has_lyrics: false)
```

**API surface and DTO contracts**:

Backend Rust DTO structures (serialized with camelCase renaming):

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackLyricsDto {
    pub track_id: String,
    pub has_lyrics: bool,
    pub is_synced: bool,
    pub lines: Vec<LyricLineDto>,
    pub plain_text: Option<String>,
    pub source_type: String, // "lrc" | "embedded" | "none"
    pub user_offset_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricLineDto {
    pub id: String, // deterministic: format!("{}-l{}", track_id, index)
    pub time_seconds: f64,
    pub text: String,
}
```

Frontend TypeScript store interface:

```typescript
export interface LyricsState {
  currentLyrics: TrackLyricsDto | null;
  isLoading: boolean;
  error: string | null;
  lyricsCache: Record<string, TrackLyricsDto>;
  fetchLyrics: (trackId: string) => Promise<void>;
  nudgeUserOffset: (deltaMs: number) => Promise<void>;
  resetUserOffset: () => Promise<void>;
  rescanLyrics: (trackId: string) => Promise<void>;
}
```

Tauri IPC command table:

| Command | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `lyrics_get_for_track` | Tauri IPC | `track_id: String` | `TrackLyricsDto` | Internal Desktop | `TRACK_NOT_FOUND` |
| `lyrics_set_user_offset` | Tauri IPC | `track_id: String`, `offset_ms: i32` | `()` | Internal Desktop | `TRACK_NOT_FOUND`, `DB_ERROR` |
| `lyrics_rescan_for_track` | Tauri IPC | `track_id: String` | `TrackLyricsDto` | Internal Desktop | `TRACK_NOT_FOUND`, `IO_ERROR` |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Fetch lyrics for track | Synchronized line list (`lines`) | Parsed from companion `.lrc` or embedded tags, cached in `track_lyrics.lines_json` |
| Fetch lyrics for track | Plain text view (`plain_text`) | Read from `track_lyrics.plain_text` or derived from untimed tag |
| Display sync state | Timing indicator (`is_synced`) | `track_lyrics.is_synced` column (1 for timed, 0 for plain text) |
| Active lyric highlight | Highlighted line index (`activeIndex`) | Derived locally in view via `effectiveTime = currentTime + (userOffsetMs / 1000.0)` |
| Timing adjustment | Offset value in milliseconds | `track_lyrics.user_offset_ms` loaded into store and adjusted via UI nudge buttons |
| Line click seek | Playback seek target in seconds | Calculated via `seekTarget = Math.max(0, line.timeSeconds - (userOffsetMs / 1000.0))` |
| File cache validation | File modification timestamp | Read via `std::fs::metadata(path).modified()` on disk and compared to `source_modified_at` |

**Key invariants**:

- Each audio track has at most one corresponding record in `track_lyrics`, enforced by the `UNIQUE(track_id)` database constraint.
- When an audio track is deleted from the library, its lyrics cache record is removed automatically via foreign key cascade.
- External companion lrc files in the same directory (`.lrc` or `.LRC`) always take precedence over embedded tags when both exist on disk.
- Line timestamps in `lines_json` are strictly sorted in ascending order by `timeSeconds`.
- User offset polarity: positive offset advances lyrics (lines appear earlier), negative offset delays lyrics.
- Re-parsing an updated companion file preserves existing listener `user_offset_ms` values in SQLite.
- The presentation layer always receives a valid `TrackLyricsDto` structure; absent or unreadable lyrics yield `has_lyrics: false` rather than a rejected promise.

**Security model**:

This feature operates strictly within the local desktop sandbox. Lyrics are read from local files in authorized music folders or beside verified track paths. No external network requests are made, no telemetry is transmitted, and no user identifiable data is stored.

**Critical test scenarios**:

- Happy path: Playing a local audio file with a matching companion lrc file parses lines, caches them in SQLite, highlights active lines in `LyricsModal`, and responds to manual line clicks, verifies **AC-1**, **AC-2**, **AC-6**, **AC-7**, **AC-8**.
- Embedded fallback: Playing a track with embedded ID3 USLT or Vorbis lyrics and no companion lrc file extracts plain text or timed lines through lofty and displays them in the overlay, verifies **AC-1**, **AC-8**.
- Timestamp nudge: Listener clicks offset adjustment buttons in `LyricsModal` header, shifting line highlight timing by +200ms and persisting `user_offset_ms` to SQLite across app reloads, verifies **AC-6**, **AC-7**, **AC-9**.
- Malformed syntax, BOM, and word tags: An lrc file containing a UTF-8 BOM, metadata header tags, inline word tags, and empty blank lines parses valid line text cleanly without crashing or rendering blank buttons, verifies **AC-2**, **AC-3**, **AC-10**.
- File update detection and offset retention: Modifying an external lrc file on disk updates its file modification timestamp, causing the next playback request to reparse the file while retaining previously saved `user_offset_ms` preferences, verifies **AC-4**, **AC-5**.
- Missing lyrics fallback: Playing an instrumental track with no lrc file and no embedded tags returns `has_lyrics: false` and displays `EmptyLyricsState` cleanly, verifies **AC-8**, **AC-10**.

## Build plan

Following the Facade approach, the clickable UI shell was created in Phase 1 (`LyricsModal.tsx` and `FullscreenLyricsView.tsx`). This plan wires the native backend parsing, SQLite persistence, and reactive store integration.

1. Create database migration `V004__track_lyrics.sql` adding the `track_lyrics` table, indices, and Rusqlite repository methods with offset preservation upsert, satisfies **AC-4**, **AC-5**.
2. Implement native Rust lyrics parsing and extraction module in `src-tauri/src/lyrics/` supporting companion lrc discovery, line parsing, header offset application, BOM stripping, encoding fallbacks, and lofty tag extraction, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**.
3. Implement Tauri IPC commands `lyrics_get_for_track`, `lyrics_set_user_offset`, and `lyrics_rescan_for_track` in `src-tauri/src/commands/lyrics.rs` with camelCase serialized DTOs, satisfies **AC-6**.
4. Create frontend lyrics service in `src/services/lyrics.ts` and reactive Zustand store `useLyricsStore.ts` with local active line calculation and debounced offset persistence, satisfies **AC-7**, **AC-9**.
5. Connect `LyricsModal.tsx` and `FullscreenLyricsView.tsx` to `useLyricsStore`, removing mock fixtures from `src/data/mockLyrics.ts`, wiring real time line highlights, seeking arithmetic, and header offset controls, satisfies **AC-8**, **AC-9**, **AC-10**.
6. Write comprehensive Rust unit tests for lrc parsing and Vitest component integration tests for lyrics overlay rendering and offset updates, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-7**, **AC-9**, **AC-10**.

## Consequences

**Positive**:

- Listeners enjoy accurate synchronized and plain text lyrics for their local music library.
- Companion lrc files can be edited or replaced externally without altering audio binary files.
- Dedicated `track_lyrics` SQLite table keeps the main `tracks` table lean and fast.
- Zero new third party dependencies in Rust maintains lightweight binary size and fast build times.

**Negative / tradeoffs**:

- Initial playback of a track with unparsed lyrics requires a disk read and parse operation before displaying lines (mitigated by asynchronous non blocking IPC).
- Online lyrics downloading is deferred to a future phase, so only local files are supported initially.

**Neutral**:

- Requires database migration V004 on existing installations.
- Presentation components switch from synchronous mock fixtures to asynchronous store hydration.

## Follow-up

- [ ] Connect scanner progress lifecycle so that bulk library rescans flag tracks having companion lrc files.
- [ ] Review online lyrics fetching providers when the deferred online lyrics scope feature is prioritized.
