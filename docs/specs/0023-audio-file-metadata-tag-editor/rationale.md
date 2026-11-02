# 0023. Audio file metadata tag editor (Rationale)

## Context

Mutinhimira is a modern desktop music player built for local audio library playback. While earlier milestones established background library indexing with Lofty and SQLite persistence for tracks, albums, and playlists, users currently have no mechanism inside the application to correct misspelled track titles, adjust release dates, re categorize genres, or replace low resolution cover art. When audio tags are incorrect, users are forced to close the app, open external tagging tools, edit files on disk, and wait for a full library rescan to observe changes.

Editing local audio file tags introduces complex technical forces. Audio files range across multiple container formats including MP3, FLAC, M4A, OGG, and WAV. Writing tags directly to disk risks file corruption or truncation if the application crashes or system power fails mid write. Furthermore, on Windows desktop environments, an audio file currently playing in the Rodio playback engine holds an open operating system file handle that blocks write access, causing file lock errors if written naively. Simply pausing Rodio leaves the file handle open; closing the stream without an internal reload guard triggers background monitor threads to treat the empty sink as track completion, causing an unwanted skip to the next song in the queue.

Finally, database and filesystem consistency is critical. Updating SQLite without writing tags to disk causes metadata drift, where external players show outdated information and subsequent library scans clobber user changes. In batch album editing, deleting and recreating album rows destroys user album favorites and invalidates open UI views. A robust, atomic, and safe editing pipeline with in place album preservation is required.

## Options considered

### Option 1: Dual mode single track and album batch editor with Lofty atomic sibling file writing, playback stream reload guard, in place album preservation, and event driven store updates (Chosen)

Build single track editing accessible from track context menus and batch editing accessible from the Album Details screen header. On modal open, fresh physical tags are probed via Lofty. On save, the backend validates canonical paths within library folders, activates an audio reload guard to drop open Windows file handles without triggering premature track skips, writes modified tags to uniquely named sibling temporary files before atomic replacement with bounded retries, normalizes replacement artwork to JPEG or PNG, updates existing album records in place to protect user favorites, commits transactional updates to SQLite, emits `library:tracks-updated` events, and refreshes Zustand stores across the application.

**Pros**:
- Guarantees disk and database parity by enforcing physical write success before SQLite commits.
- Eliminates file corruption risk through unique temporary file swaps and bounded Windows indexer retries.
- Prevents Windows playback lock crashes and premature track skips through the cooperative reload guard.
- Protects user album favorites and active page navigation by updating album rows in place.
- Decouples UI store synchronization cleanly via standard Tauri event notifications.

**Cons**:
- Slightly more complex backend implementation requiring stream reload coordination and temporary file cleanup.
- Temporary playback stream re initialization introduces a brief micro pause on the active track.

### Option 2: Single track in place editor with deferred playback writes

Implement only a single track editing modal without batch capabilities. Lofty writes directly to the existing file path in place without creating a temporary file. If the targeted file is currently playing, writing is deferred until the track completes or playback stops.

**Pros**:
- Simpler implementation with fewer file operations.
- Avoids interrupting playback on the active track.

**Cons**:
- Direct in place writes risk catastrophic audio file truncation if the process terminates during IO.
- Inability to edit album tags in bulk forces users to edit dozens of tracks one by one.
- Deferred writes introduce confusing UI state where edits are saved in memory but uncommitted on disk.

### Option 3: External native file tagger delegation

Instead of implementing a custom tag editor inside Mutinhimira, provide an "Open in external tag editor" button that launches third party software (such as Mp3tag or MusicBrainz Picard) via OS shell commands, followed by an automatic folder rescan.

**Pros**:
- Minimal code footprint in Mutinhimira.
- Defers advanced tagging features to mature specialized tools.

**Cons**:
- Fragmented user experience that requires installing third party software.
- Loses seamless instant UI updates, requiring disruptive library rescans.
- Fails the core requirement of being an integrated desktop music player.

## Rationale

Option 1 is selected because it directly solves the core user need for an integrated, safe, and pleasant catalog curation experience. Sibling temporary file writes protect local audio libraries from data loss, which is the paramount responsibility of any local media player.

Coordinating with the Rodio audio engine using an atomic reload guard solves the Windows file locking bottleneck smoothly without triggering premature track end skips. The alternative of blocking edits on active tracks would frustrate users who frequently edit song information while listening to their library.

Updating album entities in place during batch edits preserves album favorites and prevents breaking the open Album Details page. Emitting standard Tauri events guarantees all independent UI views update reactively without tight store coupling.
