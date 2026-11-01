# 0020. Local file lyrics parser and metadata extraction (Rationale)

## Context

Mutinhimira is a lightweight modern desktop music player designed for local audio file playback. In Phase 1, clickable presentation overlays for lyrics (`LyricsModal` and `FullscreenLyricsView`) were constructed using static mock data fixtures to simulate timed line progression and line seeking. Now in Phase 2, the player requires real lyrics integration directly from the listener's local filesystem.

Local lyrics come in two distinct formats: external companion lrc sidecar files placed next to the audio file (such as `track.lrc` beside `track.flac`), and embedded metadata tags inside the audio file itself (such as ID3 USLT tags in MP3 files, Vorbis LYRICS comments in FLAC or Ogg files, and MP4 lyrics atoms). Users often download or craft custom lrc files to synchronize music, and they expect edits to companion files to reflect immediately in playback. Additionally, companion files in the wild exhibit diverse character encodings, varying timestamp precision (centiseconds or milliseconds), header metadata tags like `[offset:...]`, and occasional timing drift relative to specific audio master recordings.

Without a deliberated lyrics parsing and caching strategy, the application would risk slow folder scans, duplicated data parsing on every track change, or audio playback hiccups caused by blocking file reads on the main thread.

## Options considered

### Option 1: Native Rust zero dependency LRC and tag parser with companion file priority, SQLite track_lyrics cache, and dedicated presentation useLyricsStore (Recommended)

Implement an in process Rust parser module using only the Rust standard library and existing lofty crate dependencies. Companion lrc files take priority over embedded tags. Parsing happens on demand when a track plays or an overlay opens, and the resulting structured line array is cached in a dedicated `track_lyrics` SQLite table as serialized JSON. Cache validity is checked against file modification timestamps. A dedicated `useLyricsStore` in React drives active line tracking and allows listeners to save personal timing offsets per track.

**Pros**:
- Zero additional third party crates in Cargo, keeping build times fast and binary size small.
- Fast single row database reads for cached lyrics without complex table joins.
- Companion lrc priority allows listeners to fix or update lyrics without modifying audio binaries.
- Persistent user timing offsets solve audio drift without altering source files.

**Cons**:
- Initial lyric loading for a newly played track requires a disk probe and parse before lines appear.

### Option 2: Eager extraction during library scanning with normalized relational lyric lines

Parse all companion lrc files and embedded tags eagerly during background library folder scans, and store every individual lyric line as a distinct row in a normalized `lyric_lines` relational table.

**Pros**:
- Lyrics are fully populated and indexed in the database before the user ever plays a track.
- Enables SQL queries filtering tracks that contain specific lyric words.

**Cons**:
- Significantly slows down library folder scanning across large music libraries.
- Bloats the database with tens of thousands of individual line records, increasing database file size and lock contention.
- Changes to external lrc files on disk are missed until the user manually triggers a full folder rescan.

### Option 3: Client side TypeScript parsing via Tauri filesystem reads

Read lrc files and audio tags from the frontend using Tauri filesystem plugins and parse timestamp strings directly in TypeScript inside the browser webview.

**Pros**:
- Avoids backend Rust code and database schema migrations.
- Easy to prototype in JavaScript.

**Cons**:
- Reading large audio files in the webview to extract embedded tags creates high memory spikes and sluggish UI animations.
- Cannot leverage lofty for comprehensive tag parsing across varied audio formats.
- Lacks durable database caching, forcing files to be reread from disk on every track transition.

## Rationale

Option 1 is selected because it delivers the optimal balance of fast library scanning, low memory consumption, and responsive playback. By parsing on demand and caching structured JSON lines in SQLite, folder scans remain fast while playback lyrics load in under five milliseconds from the local database cache. Storing the cache in a dedicated `track_lyrics` table avoids bloating the main `tracks` catalog table, and using file modification timestamps guarantees that external edits to companion lrc files appear automatically on the next track play. Furthermore, providing a persistent user offset adjustment addresses the common real world problem where downloaded lrc files lead or lag the specific audio master file in the listener's collection.
