# 0016. Local library scanner and metadata

**Date**: 2026-10-24
**Status**: Accepted

## Summary

This specification defines the architecture, background worker pipelines, metadata extraction rules, and persistence strategies for the Mumhanzi local music library scanner. It introduces high performance audio tag reading and embedded cover art extraction using lofty and walkdir with rayon parallel execution in native Rust. Following the Clean Architecture boundaries and Facade delivery strategy, this capability connects monitored filesystem folders to the SQLite persistence layer, giving users seamless, fast, and automated catalog discovery with live progress feedback in the React presentation shell.

## Decision

**Chosen option**: Option 1: In process background worker thread with walkdir and rayon multi core parallelism, lofty tag and image parsing, SHA256 hashed disk cover art caching, chunked SQLite write transactions, and throttled Tauri progress events

Adopt a native background worker thread managed inside the Rust backend that recursively discovers audio files, checks timestamps for differential scanning, extracts tags and embedded pictures using lofty across CPU cores, and commits records in batches of 250 tracks into SQLite. Extracted cover art is saved into the application cache directory using SHA256 content hashes, avoiding duplicate image storage. Scanning updates are emitted over Tauri event channels at most every 100 milliseconds, allowing the frontend library store to display reactive progress indicators and refresh the track table automatically upon completion.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`)

## Requirements

**User stories**:

- As a listener with local audio files, I want to add my music folders so that Mumhanzi automatically imports my tracks, albums, and artists into my library.
- As a collector with a large library, I want rescans to process quickly so that I do not wait minutes for unchanged files to reindex.
- As a listener viewing albums and songs, I want embedded cover artwork extracted and displayed so that visual album art appears throughout the application.
- As a desktop user with tagged and untagged music, I want missing titles to fall back to clean file basenames and missing artists or albums to show unknown placeholders so that my library remains organized and playable.
- As a listener curating music, I want my favorites, play counts, and playlist associations preserved when rescanning folders so that my personal library statistics never reset.
- As a user managing external storage, I want missing or disconnected drives handled safely so that unplugging a drive does not accidentally erase my saved music catalog.

**Acceptance criteria**:

- **AC-1**: Recursive audio discovery: The scanner traverses configured active music folders recursively using `walkdir` without following directory symlinks, filtering supported audio extensions (`.mp3`, `.flac`, `.m4a`, `.aac`, `.ogg`, `.wav`, `.aiff`, `.opus`) in a case insensitive manner while ignoring hidden system files.
- **AC-2**: Fast differential pre fetch: Before traversing the disk, the scanner loads existing file paths and modification times for the target folder into an in memory lookup table (`SELECT file_path, file_modified_at FROM tracks WHERE folder_id = ?1`). Unchanged files bypass tag parsing and lofty extraction entirely, accelerating subsequent library rescans.
- **AC-3**: Parallel tag and metadata extraction: Modified or newly discovered files are parsed across multiple CPU cores using `rayon` with `lofty`, extracting track title, artist name, album title, album artist, release year, genre, track number, disc number, duration, bitrate, and audio format.
- **AC-4**: Tag fallback derivation: If metadata tags are missing or blank, track title is derived from the audio file basename without extension, artist falls back to `"Unknown Artist"`, and album falls back to `"Unknown Album"`.
- **AC-5**: Embedded cover artwork extraction: Front cover pictures (prioritizing `PictureType::CoverFront` with fallback to the first picture, capping image size at 15 megabytes) found by lofty are extracted, hashed via SHA256, and written to disk in the application local cache directory (`covers/{sha256}.{ext}`). Identical images share the same cached file path, updating `cover_art_path` on albums and tracks without redundant disk writes.
- **AC-6**: Chunked transactional persistence: Extracted track, album, and artist records are committed into the SQLite database in chunked transactions of up to 250 tracks per batch, maintaining database responsiveness and minimizing lock contention.
- **AC-7**: Atomic user stats preservation: Track records are written using SQLite `INSERT INTO tracks ... ON CONFLICT(file_path) DO UPDATE SET ...` omitting user specific columns (`is_favorite`, `play_count`, `last_played_at`, `created_at`) so that user curation and playback counters are preserved atomically without prior select queries.
- **AC-8**: Pruning removed files on completed scans: If and only if a scan completes without cancellation, tracks registered in the database for the monitored folder whose files no longer exist on disk are purged from the database, cascading cleanup to orphan album and artist entries that no longer reference any tracks. If a scan is cancelled, pruning is completely bypassed.
- **AC-9**: Disconnected folder safety: If an entire monitored folder root cannot be found or accessed on disk (for example on a disconnected external storage drive), the scanner preserves existing database tracks, reports the folder as unavailable, and logs a warning rather than wiping the collection.
- **AC-10**: Resilient error tolerance: Corrupted audio files, unreadable tags, or Windows paths exceeding length limits log non fatal warnings and append to a scan error summary, allowing the background scan worker to continue processing remaining library files without crashing.
- **AC-11**: Asynchronous IPC control and live progress events: Tauri IPC command `scanner_scan_folder` kicks off a background worker thread non blocking and returns a `ScanJobStartDto` immediately, rejecting concurrent requests with `SCANNER_BUSY`. Callers can poll status via `scanner_get_scan_status` or cancel via `scanner_cancel_scan`, while the worker emits throttled `library://scan-progress` events at most every 100 milliseconds and a final `library://scan-completed` event.
- **AC-12**: Presentation layer synchronization: The frontend `useLibraryStore` listens to scanner lifecycle events, reflects scanning spinners on active folder cards, displays progress statistics, adapts database track DTOs, converts local cover art paths using `convertFileSrc`, and reloads the reactive song table automatically upon scan completion.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

The scanner populates and reconciles existing relational tables created in migration V001:

- `folders`: monitored roots (`id`, `path`, `added_at`, `last_scanned_at`, `is_active`).
- `artists`: unique musical artists (`id`, `name`, `bio`, `avatar_path`, `created_at`, `updated_at`). Matched case insensitively by name using `LOWER(name)`.
- `albums`: album collections (`id`, `title`, `artist_id`, `artist_name`, `year`, `genre`, `cover_art_path`, `total_discs`, `created_at`, `updated_at`). Matched case insensitively using `LOWER(title)` and `LOWER(artist_name)`, with `artist_name` derived from `album_artist` tag when present, falling back to track `artist_name`.
- `tracks`: individual audio tracks (`id`, `file_path` UNIQUE, `title`, `artist_id`, `artist_name`, `album_id`, `album_name`, `album_artist`, `duration`, `year`, `genre`, `disc_number`, `track_number`, `bitrate`, `format`, `cover_art_path`, `is_favorite`, `play_count`, `last_played_at`, `file_modified_at`, `file_size_bytes`, `folder_id`, `created_at`, `updated_at`).

IPC DTO contracts and progress state:

```typescript
export interface ScanJobStartDto {
  folderId: string;
  status: "started";
  startedAt: number;
}

export interface ActiveScanStatusDto {
  isScanning: boolean;
  activeFolderId: string | null;
  phase: "idle" | "discovering" | "parsing" | "committing" | "pruning";
  scannedFiles: number;
  totalFiles: number;
  currentFile: string | null;
  startedAt: number | null;
}

export interface ScanProgressPayload {
  folderId: string;
  phase: "discovering" | "parsing" | "committing" | "pruning";
  scannedFiles: number;
  totalFiles: number;
  newTracks: number;
  updatedTracks: number;
  removedTracks: number;
  currentFile: string;
  elapsedMs: number;
}

export interface ScanCompletedPayload {
  folderId: string;
  totalScanned: number;
  newTracks: number;
  updatedTracks: number;
  removedTracks: number;
  elapsedMs: number;
  errors: Array<{ filePath: string; message: string }>;
}
```

**State transitions**:

Folder scan lifecycle state machine:

- Idle: No scan executing in the application.
- Discovering: Scanning filesystem tree recursively, populating candidate paths, comparing against in memory modified timestamp map. Progress payload sets totalFiles to 0 while discovering.
- Parsing: Extracting audio tags and album art using lofty in parallel across rayon worker threads.
- Committing: Writing batches of 250 track entities and related albums or artists into SQLite inside chunked transactions using atomic upsert statements.
- Pruning: If and only if the scan was uncancelled, identifying database tracks missing from the filesystem set and removing orphaned records.
- Completed: Final statistics emitted, folder `last_scanned_at` updated, and status returned to Idle.
- Cancelled: Atomic cancellation token flagged, active batch finalized, pruning skipped, and status returned to Idle.

**API surface**:

| Command / Event | Method / Type | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| scanner_scan_folder | Tauri Command | folder_id: String | ScanJobStartDto | Local IPC | FOLDER_NOT_FOUND, SCANNER_BUSY |
| scanner_cancel_scan | Tauri Command | folder_id: Option\<String\> | bool | Local IPC | NO_ACTIVE_SCAN |
| scanner_get_scan_status | Tauri Command | none | ActiveScanStatusDto | Local IPC | none |
| library://scan-progress | Tauri Event | folder_id, phase, scannedFiles, totalFiles, currentFile | ScanProgressPayload | Local Event | none |
| library://scan-completed | Tauri Event | folder_id, totalScanned, newTracks, updatedTracks, removedTracks, elapsedMs, errors | ScanCompletedPayload | Local Event | none |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| In memory pre fetch | Path to modified time map | Query `SELECT file_path, file_modified_at FROM tracks WHERE folder_id = ?1` |
| Audio discovery | Candidate audio file path list | Recursive walkdir traversal matching allowed extensions |
| File size | Track file size in bytes | Filesystem metadata via `std::fs::Metadata::len()` |
| Differential check | Skip decision for unchanged file | Comparison between disk filesystem modified time and in memory pre fetched timestamp |
| Duration extraction | Track duration in seconds | Lofty stream properties via `AudioFile::properties().duration().as_secs_f64()` |
| Tag extraction | Track title, artist, album, year, genre | Lofty tag accessor methods from parsed audio file headers |
| Fallback title | Clean track title | Path basename without file extension when tag title is empty |
| Fallback artist | Default artist string | String literal "Unknown Artist" when tag artist is empty |
| Fallback album | Default album string | String literal "Unknown Album" when tag album is empty |
| Album artist name | Album artist attribution | Lofty tag `album_artist` frame when present, falling back to track `artist_name` |
| Artwork extraction | Cached picture file path | SHA256 content hash of embedded picture bytes written to app cache folder |
| Artwork webview url | Displayable image URI | Frontend conversion using `@tauri-apps/api/core` `convertFileSrc` |
| Batch persistence | Inserted or updated track rows | Chunked transactions committing up to 250 tracks per batch using `ON CONFLICT` upsert |
| User stats retention | Preserved favorite and play counts | Preserved by omitting them from `ON CONFLICT DO UPDATE SET` assignments |
| Pruning removed files | Deleted track rows | Database records in folder missing from active filesystem set, run only on full completion |
| Progress updates | Scanned count, percentage, current path | Atomic counter increments emitted over Tauri event channel |

**Key invariants**:

- Single active scanner: Only one scan job executes at any given time. Concurrent calls return `SCANNER_BUSY` to prevent thread and database lock contention.
- In memory differential lookup: Comparing modification times uses a pre fetched in memory map, avoiding per file database queries during traversal.
- File path uniqueness: Every track record has a unique `file_path`. Rescanning an existing file updates its metadata via upsert without creating duplicate rows.
- Atomic user stats preservation: User generated flags and statistics (`is_favorite`, `play_count`, `last_played_at`, `created_at`) are excluded from upsert assignments and never overwritten.
- Unchanged file bypass: Files whose modification time matches the database record are not parsed with lofty, preventing unnecessary CPU and disk usage.
- Safe folder boundaries: Symbolic links are not followed, avoiding recursion loops and unauthorized directory traversal.
- Missing folder protection: If a monitored folder root is completely missing (unplugged removable drive), tracks are preserved and the folder is flagged unavailable.
- Cancellation pruning safety: Missing file pruning runs strictly after a complete uncancelled scan. Cancelled scans never delete tracks.
- Non blocking UI: Scanning operates on background worker threads, never blocking the main Tauri event loop or frontend user interactions.

**Security model**:

- Local desktop scope: Operates strictly within the user desktop environment without remote endpoints or cloud transmissions.
- Filesystem bounds: Scans only user configured folder paths registered in the `folders` database table. Directory symlinks are not followed.
- Local cache storage: Extracted cover art files are stored inside the standard application cache directory resolved through Tauri path APIs (`app_cache_dir/covers/`).
- Tauri IPC capability: Scanner commands are scoped to the main window in `capabilities/default.json`.

**Configuration required**:

No external environment variables or API keys required. The application utilizes the standard operating system cache folder (`mumhanzi/covers/`) for extracted artwork files.

**Critical test scenarios**:

- Happy path: User adds a music folder containing nested MP3 and FLAC files, scanner parses metadata and extracts artwork, commits tracks in batches, and displays populated library, verifies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-11**, **AC-12**.
- Fast rescan: Rescanning an existing folder with unchanged files verifies modification timestamps against in memory pre fetched map, skipping lofty tag parsing and completing in milliseconds, verifies **AC-2**.
- User stats preservation: Rescanning an altered audio file whose favorite status was toggled keeps `is_favorite = 1` and preserves play counts via atomic upsert, verifies **AC-7**.
- File deletion and pruning: Deleting an audio file from disk and running a full uncancelled rescan deletes the corresponding track from SQLite and cleans up orphaned albums, verifies **AC-8**.
- Cancellation safety: Cancelling an active scan aborts processing gracefully and does not prune unscanned tracks, verifies **AC-8**, **AC-11**.
- Missing folder resilience: Attempting to scan an unmounted drive preserves existing database records and sets a warning without deleting tracks, verifies **AC-9**.
- Malformed file tolerance: Encountering an empty zero byte audio file or corrupted ID3 tag logs a non fatal warning and continues scanning remaining files smoothly, verifies **AC-10**.

## Build plan

1. [x] Add `lofty`, `walkdir`, and `rayon` dependencies to `src-tauri/Cargo.toml`, satisfies **AC-1**, **AC-3**.
2. [x] Implement audio file discovery and path filtering service in `src-tauri/src/scanner/discovery.rs` supporting recursion, symlink avoidance, and in memory differential timestamp checks, satisfies **AC-1**, **AC-2**, **AC-9**.
3. [x] Implement tag reader and artwork extractor in `src-tauri/src/scanner/metadata.rs` using lofty, SHA256 cover art caching, MIME extension mapping, picture size clamping, and title, artist, and album fallback rules, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-10**.
4. [x] Implement catalog reconciliation and chunked SQLite writer in `src-tauri/src/scanner/batch_writer.rs` persisting tracks, albums, and artists in batches of 250 using atomic upsert statements while preserving favorites and play counts, satisfies **AC-6**, **AC-7**, **AC-8**.
5. [x] Implement scanner coordinator and worker thread manager in `src-tauri/src/scanner/service.rs` with cancellation tokens, busy guards, and throttled Tauri event progress emission, satisfies **AC-10**, **AC-11**.
6. [x] Expose Tauri IPC commands `scanner_scan_folder`, `scanner_cancel_scan`, and `scanner_get_scan_status` in `src-tauri/src/commands/scanner.rs`, register them in `src-tauri/src/lib.rs`, and update permissions in `capabilities/default.json`, satisfies **AC-11**.
7. [x] Create frontend TypeScript scanner client in `src/services/scanner.ts` with typed IPC wrappers, DTO adapters, and event listener subscriptions, satisfies **AC-11**, **AC-12**.
8. [x] Wire `useLibraryStore` and folder components in `src/store/useLibraryStore.ts` and `src/components/library/` to trigger native folder scans, display live progress indicators, convert image URLs with `convertFileSrc`, and refresh local music tracks upon completion, satisfies **AC-12**.
9. [x] Write unit and integration tests covering path discovery, metadata extraction, artwork hashing, batch commits, and frontend store event synchronization, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-12**.

## Consequences

**Positive**:

- Real music playback preparation: The local library view transitions from placeholder fixtures to genuine local user music.
- Blazing fast differential rescans: In memory comparison of file modification timestamps avoids reading file headers for unchanged files, allowing subsequent scans of tens of thousands of songs in seconds.
- High efficiency artwork handling: SHA256 image content hashing ensures identical album art across multiple tracks is written only once to disk, saving space and memory.
- Non blocking user experience: Scanning happens in background threads with throttled event updates, keeping the user interface smooth and responsive.
- Robust user data protection: Atomic upserts ensure favorites and play counts are never lost during library updates, while cancelled scans never prune songs.

**Negative / tradeoffs**:

- Initial scan duration: First time indexing of massive music libraries with thousands of unindexed files requires significant disk input and output and CPU time.
- Disk cache consumption: Extracting embedded artwork stores image files in the application cache directory, consuming local disk space proportional to album count.

**Neutral**:

- Requires maintaining consistent audio format extensions as new audio codecs or containers are requested in future milestones.

## Follow-up

- [ ] Connect audio playback engine in Feature 14 to play tracks scanned and stored by the new scanner service
- [ ] Connect fast local library search indexing in Feature 17 to build SQLite FTS5 search indexes from scanned track metadata
- [ ] Consider adding file watcher notifications in a future enhancement for automatic background rescanning when music folders change on disk
