# 0016. Local library scanner and metadata: Rationale

## Context

Mumhanzi is designed as a fast, modern desktop music player that gives listeners immediate access to their personal local music collections. In Phase 1, the user interface shell was created using placeholder mock data fixtures to simulate library navigation, folder management, and track listings. In spec 0012, a robust SQLite database persistence layer was established with relational schema tables for folders, artists, albums, tracks, and playlists.

To transform Mumhanzi into a fully operational music player, the application requires an automated scanning engine capable of exploring local folders on disk, parsing diverse audio file containers and tag formats, extracting embedded cover art pictures, and synchronizing these records into the SQLite database.

Music collections present specific technical forces and challenges:

First, collections vary from a few hundred songs to hundreds of thousands of files across deep directory trees. Scanning must not freeze the application user interface, lock the database for extended periods, or consume excessive memory.

Second, audio metadata quality is notoriously inconsistent. Files often have missing tags, malformed headers, inconsistent character encodings, or missing cover art. The scanner must be resilient, deriving graceful fallbacks such as extracting the title from the file basename and assigning unknown artist or album placeholders without halting or failing.

Third, users frequently rescan folders after modifying a few songs or adding a single album. Re-reading thousands of audio headers on every rescan is wasteful and slow. A fast differential scanning strategy comparing filesystem modification timestamps allows unchanged files to bypass tag parsing completely. Loading existing timestamps into an in memory lookup table before traversing avoids per file database queries and prevents lock contention.

Fourth, embedded cover artwork can be several megabytes per audio file. Storing raw image blobs inside SQLite or extracting duplicate image files for every song on the same album wastes storage and degrades performance. Extracting pictures to an application cache directory using SHA256 content hashes ensures each unique album cover is stored exactly once on disk.

Fifth, listeners curate their music by marking favorites, tracking play counts, and organizing playlists. When a folder is rescanned to pick up tag updates, user specific attributes must never be overwritten or reset. Using single statement atomic upsert queries guarantees these values survive without requiring slow read before write cycles.

## Options considered

### Option 1: In process background worker thread with walkdir and rayon, lofty tag parser, SHA256 disk cover art cache, and chunked SQLite transactions (Chosen)

Run the scanner in a dedicated native worker thread pool using walkdir for filesystem discovery, an in memory timestamp lookup table for differential checks, rayon for multi core parallel tag parsing with lofty, and chunked transactions of 250 tracks into SQLite using atomic upsert statements. Extracted album art pictures are hashed with SHA256 and stored as image files in the local cache directory, with their file paths saved in SQLite. Progress updates are throttled and emitted over Tauri event channels to update the frontend smoothly.

**Pros**:

- Maximum scanning throughput leveraging all available CPU cores for metadata extraction.
- Minimal database lock contention and responsive UI by batching commits into 250 track chunks with atomic upserts.
- Storage efficiency through SHA256 image deduplication, preventing duplicate album covers on disk.
- Lightning fast differential rescans by pre fetching timestamps into an in memory lookup table before parsing tags.
- Full offline desktop execution with zero external subprocess or runtime dependencies.

**Cons**:

- Adds `lofty`, `walkdir`, and `rayon` dependencies to `src-tauri/Cargo.toml`, slightly increasing binary size.
- Parallel scanning requires careful coordination to avoid saturating disk input and output bandwidth on mechanical hard drives.

### Option 2: Asynchronous tokio filesystem scanner with symphonia decoder, single file transactions, and in memory image data URLs

Use tokio asynchronous filesystem operations to traverse folders, parse audio headers using symphonia, commit each track individually in separate SQLite transactions, and convert embedded pictures into base64 data URLs stored directly in the database.

**Pros**:

- Integrates naturally with tokio asynchronous runtime without dedicated thread pools.
- Single crate for both future audio playback decoding and current metadata extraction.

**Cons**:

- Storing base64 encoded images directly in SQLite dramatically inflates database file size and degrades query performance.
- Committing single track transactions incurs massive SQLite write lock overhead, making scans of large libraries extremely slow.
- Symphonia metadata extraction API is more complex and less comprehensive than lofty for niche ID3, Vorbis, and MP4 tag fields.

### Option 3: External CLI subprocess or sidecar tool parsing metadata into JSON

Package or execute an external command line utility such as ffprobe or exiftool as a sidecar process, piping directory paths and reading extracted metadata as JSON over standard input and output streams.

**Pros**:

- Isolates third party parsing bugs and crashes outside the main Mumhanzi process.
- Avoids compiling heavy native audio tag parsing libraries directly into the Rust application binary.

**Cons**:

- Severe process spawning overhead across thousands of files, resulting in orders of magnitude slower scans.
- Platform packaging complexity requiring bundled external binaries for Windows, macOS, and Linux.
- Fragile communication piping and lack of fine grained progress reporting during deep scans.

## Rationale

Option 1 is selected because it directly aligns with Mumhanzi architectural goals of high performance, offline local autonomy, and clean software boundaries.

By combining `walkdir` for filesystem traversal with `rayon` parallel iterators and `lofty` audio tag reading, metadata parsing utilizes available hardware concurrency efficiently. Audio files are read concurrently across CPU cores while database writes are coordinated in batches of 250 tracks through the existing SQLite connection pool. This ensures that the user interface never freezes, while database write transactions remain brief and well within the configured SQLite WAL busy timeout.

Differential scanning delivers significant operational efficiency. Loading all existing file paths and timestamps for a folder into an in memory hash table in a single initial database query allows O(1) checks during discovery. For a library of fifty thousand songs, checking filesystem modification timestamps takes only a couple of seconds, allowing unchanged files to bypass lofty parsing completely. Only newly added or modified files undergo tag reading and artwork extraction.

The artwork strategy of saving extracted pictures to the application local cache directory under their SHA256 content hash provides optimal balance between disk usage and speed. Instead of saving ten identical cover art files for a ten track album, a single image file is saved and referenced by all tracks and the parent album.

Graceful error tolerance ensures that corrupted files, zero byte files, or unsupported audio tags never abort an ongoing scan. Non fatal errors are logged into an error summary and reported to the frontend upon completion, allowing users to inspect problematic files while keeping the rest of their library intact.
