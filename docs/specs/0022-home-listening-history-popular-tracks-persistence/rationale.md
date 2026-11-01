# 0022. Home listening history and popular tracks persistence: Rationale

## Context

Mutinhimira is a modern desktop music player built with Tauri v2, React 19, Rust, and SQLite. In Phase 1 development, Feature 4 delivered the Home and discovery screen as a visual facade. That initial implementation utilized static mock data fixtures to populate the hero showcase banner, curated playlists, recently played carousel, and popular tracks table.

In Phase 2, the project introduced core local persistence: SQLite relational storage in Feature 13, local library scanning in Feature 15, audio playback engine integration in Feature 14, and catalog persistence for albums and artists in Features 20 and 21. While the backend audio engine already tracks audio positions and increments a `play_count` counter on tracks, the Home discovery screen remains decoupled from this persistent data. When listeners play their local music, recently played tracks are retained only in temporary component memory, disappearing whenever the application is closed or restarted. Furthermore, the popular tracks list displays hardcoded sample songs rather than reflecting the music the listener actually enjoys.

Wiring the Home discovery screen to SQLite requires settling several architectural choices: how and when listening events are recorded, how repeated plays of identical tracks are presented, how popular songs are ranked when library play counts are low or zero, and how to maintain high performance without blocking audio playback or causing database contention during background library scans.

## Options considered

### Option 1: Dedicated SQLite listening history table with milestone playback recording and sliding window retention

Introduce a new `listening_history` table in SQLite schema migration V005. Each playback event records the track reference, timestamp, and active playback context (such as album or playlist title). Writes occur only when the playback progress reaches thirty seconds or half duration, matching the established audio play counter milestone. The repository implements distinct queries to deduplicate repeated songs in the carousel, and automatically prunes older rows beyond the latest 1000 entries. A native Tauri event notifies the frontend player store reactively when writes complete.

**Pros**:
- Preserves a clean historical log with precise timestamps and playback context for every listening session.
- Enables accurate deduplication for the carousel while keeping full audit records for potential future listening trends.
- Keeps table size bounded and queries fast through the 1000 row sliding window policy.
- Decouples playback history events from track metadata modifications.
- Milestone latching at thirty seconds prevents brief skips from polluting history and distorting play statistics.

**Cons**:
- Requires a new database schema migration and an additional database table.
- Involves writing to SQLite during active audio playback, requiring asynchronous execution to avoid audio glitches.

### Option 2: Column based history using existing tracks.last_played_at without a separate table

Avoid creating a new database table by querying the existing `tracks` table directly where `last_played_at IS NOT NULL`, ordered by `last_played_at DESC`.

**Pros**:
- Requires zero schema migrations, reusing columns already present in migration V001.
- Minimal backend code additions since queries operate directly on the `tracks` table.

**Cons**:
- Stores only a single timestamp per track, making it impossible to reconstruct playback sessions, analyze listening frequency over time, or record different playback contexts.
- Clearing history would require setting `last_played_at` to null across tracks, mixing track metadata state with history clearing actions.
- Lacks context information, such as which playlist or album the track was playing from when the listen occurred.

### Option 3: Immediate write on track start with unbounded append log

Insert a history record the instant any track begins playing, appending to an unlimited history table without retention limits or duration thresholds.

**Pros**:
- Records every single audio interaction, including immediate skips and accidental clicks.
- Simplifies audio engine logic by removing position checks and milestone latches.

**Cons**:
- Pollutes the listener's history with songs skipped within the first few seconds.
- An unbounded table will grow indefinitely over years of desktop usage, degrading query performance on older hardware.
- Skews play counts and popular track calculations with songs the user may not actually enjoy.

### Option 4: Client side local storage caching with periodic background sync

Store recent play events inside browser local storage or webview IndexedDB, synchronizing periodically with SQLite in batches.

**Pros**:
- Offloads write operations from the Rust audio thread entirely.

**Cons**:
- Introduces multiple sources of truth between SQLite and browser local storage.
- Fails to synchronize if the application is closed unexpectedly before a batch sync completes.
- Breaks clean Clean Architecture separation by making presentation storage responsible for core persistence.

## Rationale

Option 1 is selected because it delivers an authentic, robust listening experience while maintaining database performance and architectural integrity.

In desktop audio playback, recording history on an audio milestone (thirty seconds or half track duration) is standard practice across mature media players. It ensures that listeners who rapidly browse their collection or click the wrong song do not have their recent history or popularity rankings distorted by transient actions.

Using a dedicated `listening_history` table (Option 1) rather than relying solely on `tracks.last_played_at` (Option 2) provides essential flexibility. It preserves the exact context of playback (such as whether a song was played from an album or a custom playlist) and enables independent history management. When a user chooses to clear recent plays, the application can truncate `listening_history` without wiping out the track's all time play count or altering its metadata.

The 1000 row sliding window ensures that the SQLite database file remains compact and queries execute in single digit milliseconds, avoiding the unbounded growth risks of Option 3. Emitting a native Tauri event upon milestone completion guarantees that the Home screen updates reactively and seamlessly without polling loops or manual screen refreshes.
