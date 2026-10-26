# 0015. Playlists and favorites persistence (Rationale)

## Context

Mumhanzi completed Phase 1 by building interactive clickable user interface shells for the Playlists and Liked Songs screens. These screens demonstrated rich user interactions including creating playlists, assigning Midnight gradient covers, curating tracks from library search drawers, drag reordering playlist songs, and toggling song favorite hearts. However, all playlist and favorite state currently resides in memory using mock fixture data inside `usePlaylistStore` and `useLikedSongsStore`. When a user closes or restarts the application, all newly created playlists, track order customizations, and favorited songs vanish.

Phase 2 introduces durable SQLite storage using rusqlite with WAL mode and Clean Architecture repositories, defined in spec 0012. While the database schema and repositories for tracks and playlists exist in Rust, the frontend presentation layer remains decoupled from them. Feature 16 bridges this gap by wiring the existing Zustand stores to SQLite via Tauri IPC commands.

The core challenge is balancing instant user interface responsiveness with durable data integrity. Desktop audio listeners expect immediate visual reactions when clicking heart icons or dragging playlist tracks. If the interface blocks waiting for IPC round trips and disk writes, animations and clicks feel sluggish. Conversely, if local state diverges from SQLite records or fails silently during unexpected errors, user trust erodes. Furthermore, favorite toggles occur across multiple independent views, including the player footer, library browser, album detail, and liked songs page, requiring synchronized state management without duplicate database writes.

## Options considered

### Option 1: Optimistic Zustand store wiring with structured Tauri IPC commands and centralized favorite synchronization

Update the existing `usePlaylistStore` and `useLikedSongsStore` to manage local state optimistically, updating screen state immediately while dispatching asynchronous Tauri IPC calls in the background. If a database command fails, the store reverts to its previous state snapshot and triggers an error toast notification. IPC commands for creating and updating playlists accept structured payload objects containing gradient preset identifiers and optional cover artwork paths. A lightweight synchronization service coordinates track favorite toggles across all stores with in flight request deduplication. Fresh application launches automatically seed default sample playlists into SQLite when the database is empty.

**Pros**:
- Provides zero latency visual feedback for drag reordering, track additions, and favorite toggling.
- Guarantees immediate database persistence so user actions are durable across application restarts.
- Centralized favorite coordinator ensures heart icons update synchronously across all views without race conditions.
- Default playlist seeding gives new users an engaging collection without requiring manual imports.

**Cons**:
- Requires store actions to retain prior state snapshots for clean rollback handling on write errors.
- Adds coordination logic for in flight request locks to serialize rapid consecutive heart clicks.

### Option 2: Strictly awaited IPC calls with direct store re-querying

Make all store actions asynchronous functions that wait for the Tauri IPC invocation to resolve before modifying local Zustand state. After each database write, the store re-queries SQLite to fetch the updated entity list directly from disk.

**Pros**:
- Simple store logic with zero need for optimistic rollback snapshots.
- Guarantees that visible user interface state strictly mirrors database rows at all times.

**Cons**:
- Introduces noticeable latency on drag reordering and heart toggles as the interface awaits IPC and query round trips.
- Can cause visible flicker and scroll position jumps during frequent list re-querying.
- Rapid heart clicking can trigger multiple out of order database queries.

### Option 3: Local storage caching with asynchronous SQLite synchronization

Persist playlists and favorites into webview browser local storage using the Zustand persist middleware, and synchronize local storage changes to SQLite through a debounced background sync worker.

**Pros**:
- Instant synchronous reads and writes inside the webview without IPC delays.
- Leverages existing Zustand persist middleware patterns.

**Cons**:
- Introduces dual sources of truth between browser local storage and SQLite.
- Potential data desynchronization if the app closes before background sync flushes to disk.
- Bypasses the Clean Architecture boundaries established in spec 0012.

## Rationale

Option 1 is the chosen approach because it delivers the immediate, tactile responsiveness desktop music listeners expect while guaranteeing durable data integrity in SQLite. Music player actions such as toggling a favorite song or reordering tracks in a playlist are high frequency interactions where even fifty milliseconds of interface lag feels unpolished. Optimistic store updates ensure instant visual feedback, while snapshot rollback guarantees that the interface never displays false state if an operating system write fails.

Extending the Tauri IPC contracts to accept structured input objects cleanly supports custom gradient presets and cover artwork paths without resorting to untyped string serialization. The centralized favorite coordinator solves cross view synchronization cleanly, ensuring that liking a track in the player footer immediately reflects in the library and liked songs screens without redundant database queries. Finally, seeding sample playlists transactionally into an empty database ensures that first time users experience a warm, functional player out of the box while retaining full freedom to edit or delete those lists later.
