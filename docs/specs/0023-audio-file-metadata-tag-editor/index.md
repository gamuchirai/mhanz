# 0023. Audio file metadata tag editor

**Date**: 2026-11-02
**Status**: Proposed

## Summary

This specification defines the native tag editor modal, batch album editing capabilities, and physical audio file writing pipelines for Mutinhimira. It enables users to edit title, artist, album, album artist, genre, year, track number, disc number, and cover artwork directly from track context menus and the album details header. Following our Clean Architecture boundaries and Facade delivery strategy, changes write to disk files atomically using uniquely named Lofty temporary swap files, synchronize relational SQLite records and FTS5 search tables, coordinate with active playback using a reload guard to prevent file lock crashes or premature track skips, and notify frontend stores through event channels.

## Requirements

**User stories**:

- As a listener curating my music collection, I want to edit misspelled track titles, artist names, album titles, and genres directly from the desktop player so that my music library is neatly organized.
- As an album collector, I want to update common album details, year, and cover art across all songs in an album at once from the Album Details screen so that I do not have to edit every track individually, while keeping my album favorite status intact.
- As a music enthusiast, I want to replace or remove embedded cover artwork with high resolution JPEG or PNG images using file dialogs or drag and drop so that my music displays the correct visual identity across all devices.
- As an active listener, I want to edit metadata on the song currently playing without encountering file lock crashes or audio playback interruptions so that my listening experience remains uninterrupted.
- As a careful user, I want metadata edits to write safely to the physical audio file before updating the SQLite database, with atomic error handling so that my database never gets out of sync with my music files on disk.

**Acceptance criteria**:

- **AC-1**: Physical tag probing on modal launch: When opening the metadata editor for any track, the backend accepts `trackId` and optional `filePath`, probes the audio file on disk using Lofty, and returns fresh physical tags (title, artist, album, album artist, genre, release year, track number, disc number, duration, bitrate, container format, and embedded picture status); untagged files return empty string values with fallback placeholders derived from the file name stem and unknown placeholders.
- **AC-2**: Track context menu triggers: Every track row across Your Library, Liked Songs, Search results, Playlists, and Queue includes an "Edit metadata" action in its right click and three dots context menu, which opens the single track tag editor modal populated with the probed file metadata.
- **AC-3**: Album details batch edit trigger: The Album Details header banner provides an "Edit details" button that opens the batch metadata editor prefilled with the album title, album artist, release year, genre, and cover artwork, targeting all tracks belonging to that album in SQLite while preserving the existing album id and favorite status.
- **AC-4**: Multi track batch editor mechanics: In batch mode, fields with identical values across selected tracks display their common value, while differing fields display a placeholder "(Multiple values)"; only fields explicitly changed or cleared by the user are committed, leaving untouched unique fields (such as individual track titles and track numbers) intact.
- **AC-5**: Embedded cover artwork replacement and removal: The editor displays the active cover art with controls to replace or remove it; clicking opens the native system file dialog filtered to image extensions (`.png`, `.jpg`, `.jpeg`, `.webp`), and dragging and dropping an image onto the cover frame replaces it with a local preview; images are capped at 15 megabytes, normalized to JPEG or PNG before embedding, and cached into `covers/{sha256}.{ext}`.
- **AC-6**: Atomic temporary file disk write with Windows retry loop: When saving tag changes, Lofty writes modified tags to a unique temporary sibling file (`.{file_stem}.{uuid}.tmp`) and atomically replaces the original file on disk with a bounded retry loop (5 attempts with 30 millisecond backoff) to handle transient Windows indexer locks; if atomic replacement fails, the temporary file is deleted and an error returned without touching SQLite.
- **AC-7**: Active playback coordination and reload guard: If the file being edited is currently loaded in the Rodio playback engine, the backend invokes a cooperative reload protocol that sets an atomic reload flag, suppresses track ended completion events in the monitor thread, drops the playback sink to close Windows file handles, executes the Lofty write and atomic file swap, reopens the audio stream, seeks back to the previous playback position, restores the prior playing or paused state, and clears the reload flag.
- **AC-8**: In place album update and relational SQLite synchronization: Upon successful disk write, the backend updates the `tracks` table atomically within a transaction, updates `file_modified_at` and `file_size_bytes` to match post write filesystem attributes, updates the existing `albums` row in place (preserving `id`, `is_favorite`, and `favorited_at`), links or inserts matching `artists` rows, cascades `cover_art_path` to the album record, and purges orphan artist records that have zero remaining tracks.
- **AC-9**: Automatic search index updates: Track and album text modifications automatically trigger SQLite FTS5 index updates via existing database triggers (`trg_tracks_au` and `trg_albums_au`), making newly edited titles, artists, albums, and genres immediately searchable in the Search view.
- **AC-10**: Resilient error handling and batch aggregation: If a file write fails due to read only permissions, external process file locks, or unsupported container formats, SQLite transaction rolls back completely for that track; batch saves proceed across remaining healthy files and return a structured summary of succeeded tracks, updated album, and per file failure reasons.
- **AC-11**: Event driven presentation layer synchronization: After saving single or batch edits, the backend emits a Tauri event `library:tracks-updated` with updated track and album identifiers; `useLibraryStore`, `useAlbumStore`, `usePlayerStore`, and `useSearchStore` subscribe to this event to refresh their state reactively without requiring full library rescans.

## Decision

**Chosen option**: Option 1: Dual mode single track and album batch tag editor modal with Lofty atomic sibling file writing, cooperative Rodio playback reload guard, in place album identity preservation, and event driven store synchronization

Build a polished tag editing modal supporting both single track editing from context menus and batch editing from the Album Details page header. On launch, the editor invokes native Rust commands that accept track identifiers and re probe disk tags via Lofty. On save, the backend validates canonical paths within active library folders, coordinates with the Rodio audio engine via an atomic reload guard to drop open Windows file handles safely without triggering premature track skips, writes tags to unique sibling temporary files before atomic replacement with bounded retries, normalizes replacement artwork to JPEG or PNG, updates existing album records in place to protect user favorites, commits transactional updates to SQLite, emits `library:tracks-updated` events, and refreshes Zustand stores across the application.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

The feature modifies existing SQLite entities without requiring schema migrations:

- `tracks`: Updates `title`, `artist_id`, `artist_name`, `album_id`, `album_name`, `album_artist`, `year`, `genre`, `disc_number`, `track_number`, `cover_art_path`, `file_modified_at`, `file_size_bytes`, and `updated_at`.
- `albums`: Updates existing album row in place matching the edited album entity, preserving its primary key `id`, user favorite status `is_favorite`, and `favorited_at`; cascades `cover_art_path`, updates `title`, `artist_name`, `year`, `genre`, and `updated_at`. If an edit moves tracks out of an old album, any old album left with zero tracks is deleted.
- `artists`: Inserts or links matching `name`, and deletes orphan rows with zero remaining tracks.
- `library_search_index`: Synchronized automatically by SQLite triggers `trg_tracks_au` and `trg_albums_au`.

**State transitions**:

Single track modal state machine:
- `idle`: Modal closed.
- `probing`: Modal open, fetching fresh disk tags via `tag_editor_probe_file(trackId, filePath)`.
- `editing`: User modifying text fields or dropping replacement cover art.
- `saving`: UI shows spinner, invoking `tag_editor_save_track`.
- `success`: Stores updated via event, toast displayed, modal closes.
- `error`: Error banner displayed with message, inputs remain editable.

Batch album editor state machine:
- `idle`: Editor closed.
- `batch_editing`: Modal open with selected track list, common fields displayed, differing fields shown as "(Multiple values)".
- `saving`: Invoking `tag_editor_save_batch`.
- `partial_or_full_success`: Succeeded tracks and album updated in stores; failure summary alert presented if any tracks failed.

**API surface**:

Tauri IPC commands:

| Command | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|
| `tag_editor_probe_file` | `trackId: String, filePath: Option<String>` | `ProbedAudioTagsDto` | Desktop local | `NOT_FOUND`, `INVALID_PATH`, `PROBE_FAILED` |
| `tag_editor_save_track` | `payload: SaveTrackTagsDto` | `TrackDto` | Desktop local | `OUTSIDE_LIBRARY`, `LOCKED_FILE`, `WRITE_FAILED`, `DB_ERROR` |
| `tag_editor_save_batch` | `payload: SaveBatchTagsDto` | `BatchSaveResultDto` | Desktop local | `OUTSIDE_LIBRARY`, `PARTIAL_FAILURE`, `DB_ERROR` |

Tauri events:

| Event name | Payload contract | Subscribers |
|---|---|---|
| `library:tracks-updated` | `{ trackIds: string[], albumIds: string[] }` | `useLibraryStore`, `useAlbumStore`, `usePlayerStore`, `useSearchStore` |

DTO contracts:

```typescript
export interface ProbedAudioTagsDto {
  trackId: string;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string | null;
  genre: string | null;
  year: number | null;
  trackNumber: number | null;
  discNumber: number;
  duration: number;
  bitrate: number | null;
  format: string;
  hasEmbeddedCover: boolean;
  coverArtPath: string | null;
}

export type CoverArtAction =
  | { type: "keep" }
  | { type: "remove" }
  | { type: "replace_path"; sourceFilePath: string }
  | { type: "replace_bytes"; imageBytesBase64: string; mimeType: string };

export interface SaveTrackTagsDto {
  trackId: string;
  filePath?: string;
  title: string;
  artistName: string;
  albumName: string | null;
  albumArtist: string | null;
  genre: string | null;
  year: number | null;
  trackNumber: number | null;
  discNumber: number;
  coverArtAction: CoverArtAction;
}

export interface SaveBatchTagsDto {
  albumId?: string;
  trackIds: string[];
  updates: {
    artistName?: string;
    albumName?: string;
    albumArtist?: string | null;
    genre?: string | null;
    year?: number | null;
    discNumber?: number;
    coverArtAction?: CoverArtAction;
  };
}

export interface BatchItemErrorDto {
  trackId: string;
  filePath: string;
  error: string;
}

export interface BatchSaveResultDto {
  album?: AlbumDto;
  succeeded: TrackDto[];
  failed: BatchItemErrorDto[];
  totalUpdated: number;
}
```

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Probe file | Physical tags, duration, bitrate | Derived directly from file on disk via Lofty `Probe::open` |
| Probe file fallback | Title and artist placeholders | Derived from file stem and unknown placeholders when tags are missing |
| Open single editor | Current fields, cover thumbnail | SQLite track row supplemented by `tag_editor_probe_file` |
| Open album batch editor | Common vs differing values | Sourced from SQLite track entities loaded for the target `albumId` |
| Replace cover art | New `cover_art_path` | SHA256 hashed file path written into local cache `covers/{sha256}.{ext}` |
| Commit track tags | Updated `file_modified_at` | Read from post write file metadata on disk using `std::fs::metadata` |
| Commit track tags | Updated `file_size_bytes` | Read from post write file metadata on disk using `std::fs::metadata` |
| Relational link | `tracks.artist_id` | Matched or inserted row id in `artists` table matching `LOWER(artist_name)` |
| Relational link | `tracks.album_id` | Existing `albumId` preserved for in place album edits, or resolved matching row |
| Cascade album cover | `albums.cover_art_path` | Derived from replacement cover art path |

**Key invariants**:

- Physical write precedes database commit: SQLite is never updated unless Lofty successfully writes the tag to disk.
- Unique atomic temporary files: Writes write to unique temporary paths `.{file_stem}.{uuid}.tmp` and perform atomic renames, preventing batch collisions and file truncation.
- Bounded Windows lock retry: Atomic file replacement runs with a 5 attempt retry loop to absorb transient Windows Defender or search indexer locks.
- Active playing stream preservation: Writing to the currently playing song uses an atomic reload guard, closes file handles cleanly, rewrites tags, reopens the stream at the previous position, and avoids premature track completion events.
- Album identity and favorite preservation: Album batch edits update existing album records in place, preserving album primary key identifiers and user favorite status.
- Image format normalization: Replacement images are restricted to JPEG and PNG, transcoding WebP before embedding in Lofty to guarantee container tag compatibility.
- Search index parity: All text modifications update SQLite FTS5 search index entries automatically through database triggers.
- Path confinement: File writes are restricted to canonical paths inside active configured music library folders.

**Security model**:

- Desktop local application: Single user desktop permissions.
- Path traversal prevention: File paths must resolve to canonical paths residing inside active folders configured in `folders` table.
- Image payload safety: Cover art image files and byte buffers are validated for supported image magic bytes (PNG, JPEG), transcoded if WebP, and capped at 15 megabytes to prevent memory exhaustion or malicious embedding.

**Configuration required**:

No new environment variables or credentials required.

**Critical test scenarios**:

- Happy path single track edit: Open editor from Your Library track context menu, update title, artist, year, and cover art, verify disk tags via Lofty, verify SQLite row, verify search index, verifies **AC-1**, **AC-2**, **AC-5**, **AC-6**, **AC-8**, **AC-9**, **AC-11**.
- Happy path album batch edit: Click "Edit details" on Album Details page, change album title, genre, and release year across 10 tracks, verify all 10 audio files on disk update, verify album id and favorite status are preserved, verify album and track rows update, verifies **AC-3**, **AC-4**, **AC-8**, **AC-11**.
- Active playing track edit with reload guard: Play track in player footer, trigger metadata edit, save changes, verify audio continues playing from same position without skipping to next track, and player footer updates active track metadata, verifies **AC-7**, **AC-11**.
- Permission failure rollback: Attempt to edit a read only audio file, verify Lofty returns typed error, verify temporary file is deleted, verify SQLite tracks and albums remain unchanged, verifies **AC-6**, **AC-10**.
- Partial failure in batch edit: Run batch edit on 5 tracks where 1 file is locked by an external process, verify 4 tracks succeed and update database, verify 1 failure is reported in batch summary, verifies **AC-4**, **AC-10**, **AC-11**.

## Build plan

Following the Facade delivery strategy, the implementation proceeds from UI components and client contracts to native Lofty tag pipelines and database integration:

1. Create TypeScript DTO contracts, tag editor client service, and Zustand modal store (`useTagEditorStore`), satisfies **AC-1**, **AC-4**.
2. Build `TagEditorModal` for single track editing with input fields, cover art preview, native file picker, and drag and drop replacement, satisfies **AC-2**, **AC-5**.
3. Build `BatchTagEditorModal` and wire "Edit details" button on Album Details header banner with multiple values detection and field clearing support, satisfies **AC-3**, **AC-4**.
4. Wire track context menus across SongTable rows in Library, Liked Songs, Playlists, Search, and Queue to trigger `TagEditorModal`, satisfies **AC-2**.
5. Implement native Rust Lofty probing, image normalization, and unique temporary file writer with Windows retry loop in `src-tauri/src/tagger/`, satisfies **AC-1**, **AC-5**, **AC-6**.
6. Implement Rodio audio playback coordination module with atomic reload guard to suppress track ended monitor events and restore playing state, satisfies **AC-7**.
7. Implement SQLite transaction repository for track updates, in place album updating, artist reconciliation, post write timestamp extraction, and orphan cleanup, satisfies **AC-8**, **AC-9**.
8. Implement Tauri IPC commands `tag_editor_probe_file`, `tag_editor_save_track`, and `tag_editor_save_batch` with canonical library path validation, and emit `library:tracks-updated` event, satisfies **AC-1**, **AC-6**, **AC-10**, **AC-11**.
9. Integrate client service and event listener with Zustand player, library, album, and search stores to refresh UI state reactively upon successful saves, satisfies **AC-2**, **AC-3**, **AC-7**, **AC-8**, **AC-11**.
10. Add automated Vitest frontend tests and Rust native integration tests covering single and batch edits, playback hot reload guard, and error rollbacks, satisfies **AC-1**, **AC-6**, **AC-7**, **AC-10**, **AC-11**.

## Consequences

**Positive**:

- Gives users full control over their audio metadata and embedded cover art directly inside Mutinhimira without third party tag software.
- Guarantees disk and database parity by using disk first writes with uniquely named temporary file replacements and Windows lock retries.
- Protects playing music from audio engine lock conflicts and premature track skips through the atomic reload guard.
- Protects user album favorites and navigation stability by updating album records in place during batch edits.
- Keeps all presentation stores synchronized via clean Tauri event notifications.

**Negative / tradeoffs**:

- Writing tags to disk requires disk input output and temporary file allocation, which takes slightly longer than in memory database only updates.
- Temporary playback stream reload during active track tagging may produce a brief micro pause while audio decoders re initialize.
- Batch updates across hundreds of tracks simultaneously on slower mechanical drives may take several seconds.

**Neutral**:

- Updating album or artist names may re link associated playlist items while keeping track identifiers stable.
- SQLite database size remains stable as orphan artist entities are automatically pruned.

## Follow-up

- [ ] Add multi select checkbox selection across all track tables to allow arbitrary multi track batch tagging beyond album boundaries.
- [ ] Explore online MusicBrainz metadata scraping in a future Phase 3 spec to auto fill missing tags.
