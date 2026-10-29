# 0012. Data model and SQLite storage: Rationale and Decision Record

## Context

Mutinhimira is evolving from its Phase 1 clickable UI facade into a fully functional offline desktop audio player. During Phase 1, UI views across Home, Search, Library, Liked Songs, Playlists, Albums, and Artists were developed using in memory Zustand stores backed by mock data fixtures. While this validated the visual layout and user interactions, a real desktop player requires durable persistence that survives application restarts, scales to tens of thousands of local tracks, and coordinates across native audio playback threads and background file scanning workers.

Several key forces shape this architecture decision:

1. **Local and offline first architecture**: Mutinhimira is fundamentally a local audio player for desktop environments. It must operate with zero cloud dependencies, zero external database servers, and zero mandatory network connectivity. All user playlists, liked tracks, playback counts, and scanned folder metadata must reside on the user device.

2. **Concurrency across threads**: In Phase 2, background file scanner threads (using lofty) will parse audio tags and write records in bulk, the Rodio audio engine thread will update track progress and play counts, and the React frontend will issue concurrent search and playlist read queries. The persistence layer must support concurrent reads without blocking on writes or throwing database lock errors.

3. **Portability and zero system dependencies**: Desktop users on Windows, macOS, or Linux may not have SQLite installed as an operating system library, or may have differing SQLite versions. The application must bundle its own complete, battle tested SQLite engine inside the binary with zero external DLL or shared library requirements.

4. **Clean Architecture boundaries**: Following project rules in AGENTS.md, presentation components must never execute raw database queries or handle file paths directly. Rust domain models must define clean repository interfaces, serializing data across Tauri IPC into TypeScript domain interfaces without loose nulls or unsafe types.

## Options considered

### Option 1: File based JSON document store using serde json

Store all tracks, playlists, and settings in plain JSON files within the local application data directory, loading the entire structure into memory on boot and rewriting files on change.

**Pros**:
- Very simple to implement using standard serde serialization without adding database dependencies.
- Human readable files that can be easily inspected or edited with text editors.

**Cons**:
- Does not scale to thousands of audio tracks. Loading and saving megabytes of JSON on every minor update creates severe memory overhead and disk input output lag.
- Lacks ACID transaction guarantees. Unexpected application termination during a write operation risks corrupting the entire music catalog.
- Cannot perform efficient indexing, joins, or sorted pagination, forcing all filtering to execute in memory on the UI thread.

### Option 2: Asynchronous SQLx with SQLite connection pool

Use SQLx as an asynchronous database driver with an asynchronous connection pool, compile time query validation, and async migration execution.

**Pros**:
- Modern async first Rust ergonomics fitting Tokio async tasks.
- Compile time query checking validates SQL syntax against a prepared database schema during cargo build.

**Cons**:
- Significantly heavier crate footprint and substantially longer compile times compared to rusqlite.
- Compile time query checks require an active offline SQLite cache file checked into git or a live database during cargo build, creating friction in continuous integration pipelines.
- Overkill for single user desktop local file storage where synchronous connections protected by an async mutex and WAL mode perform flawlessly.

### Option 3: Embedded SQLite with rusqlite bundled feature and rusqlite migration (Chosen)

Compile SQLite directly into the application binary using rusqlite with the bundled feature flag. Manage schema migrations with rusqlite migration using embedded SQL files, and wrap a single shared connection with Write Ahead Logging mode and a five second busy timeout under an asynchronous Mutex.

**Pros**:
- Self contained with zero operating system dependencies. Compiles identically across Windows, macOS, and Linux without requiring system SQLite libraries.
- Highly lightweight and fast, compiling in seconds while delivering microsecond local query response times.
- SQLite Write Ahead Logging mode allows concurrent background readers while writer tasks commit changes smoothly.
- Robust ecosystem with proven reliability across millions of desktop and mobile deployments.
- Clean separation through Rust repository pattern wrapping parameterized queries safely.

**Cons**:
- Synchronous SQLite driver requires wrapping database interactions in thread safe mutexes or blocking task pools when called from asynchronous Tauri command handlers.

## Rationale

Option 3 was chosen because it represents the gold standard for reliable, high performance desktop application persistence. SQLite is the most widely tested database engine in the world, and compiling it directly into the Mutinhimira binary through rusqlite ensures that every desktop installation behaves predictably regardless of host operating system configuration.

Write Ahead Logging mode combined with a five second busy timeout elegantly resolves concurrency requirements between background library scanning, audio playback tracking, and interactive user queries. Wrapping the schema in rusqlite migration guarantees smooth, reproducible version upgrades as Mutinhimira expands throughout Phase 2 and beyond.
