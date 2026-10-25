# 0014. Fast local library search indexing (Rationale)

## Context

Mumhanzi provides a desktop music player designed to handle collections ranging from hundreds of songs to tens of thousands of audio files. In Phase 1, the search and explore interface was constructed with mock fixtures and in memory JavaScript array filtering. While this mock implementation demonstrated the interface layout, category pills, and Explore genre grid, scaling to real personal libraries requires persistent indexing and high performance query execution.

The primary requirement is speed. When a user types a query, search results across tracks, albums, artists, playlists, and genres must appear almost instantly, with database query execution times under 50 milliseconds. Naive SQL queries using `LIKE '%query%'` patterns perform full table scans that fail to meet this threshold as collections expand, and they lack relevance ranking or multi word prefix matching.

Furthermore, as the background library scanner imports and updates audio metadata, the search index must remain fully synchronized without manual reindexing jobs or complex application level cache invalidation logic. Crucially, active music listening frequently updates track records via play count increments, favorite toggles, and last played timestamps; these frequent playback events must never trigger expensive full text index updates.

## Options considered

### Option 1: Single unified SQLite FTS5 virtual table with B Tree locator table and column targeted triggers

Create a single FTS5 virtual table named `library_search_index` coupled with a B Tree locator table `search_index_entries`. Attach automated SQL triggers to tracks, albums, artists, and playlists. Target track update triggers strictly to textual columns (`title, artist_name, album_name, genre`) so playback events like incrementing play count or liking a track do not cause FTS deletions and re insertions. Query genres dynamically from tracks with grouped aggregation queries. Execute searches using BM25 relevance scoring with prefix matching and exact match boosting.

**Pros**:

* Queries all music entities in a single database round trip with unified relevance ranking.
* B Tree locator table prevents full linear scans during record deletions, maintaining high performance on large libraries.
* Column targeted triggers ensure zero performance penalty or lock contention during audio playback.
* Dynamic genre querying guarantees zero orphaned genre records without complex trigger maintenance.

**Cons**:

* FTS5 index and locator table add roughly fifteen to twenty percent storage overhead to the SQLite database file.
* Inserts during heavy background library scans incur a slight trigger execution cost.

### Option 2: Individual FTS5 virtual tables per entity with multi table queries

Create separate virtual tables for tracks, albums, artists, and playlists (`tracks_fts`, `albums_fts`, `artists_fts`, `playlists_fts`). Execute four independent queries or combine them using UNION ALL operations in Rust.

**Pros**:

* Schema matches domain models directly without packing different entity types into one table.
* Queries targeting a specific category avoid evaluating other entity records.

**Cons**:

* Requires maintaining multiple virtual tables, multiple sets of triggers, and more migration boilerplate.
* Cross category relevance ranking is difficult to calibrate across separate BM25 scoring spaces.
* Running multiple queries increases overall query latency compared to a single unified index.

### Option 3: In memory Rust search index with trigram fuzzy matching

Maintain an in memory search index in the Rust backend process using a specialized data structure or search library, loading indexed terms into RAM on application startup and querying in memory data directly.

**Pros**:

* Delivers sub 10 millisecond in memory query responses without disk reads.
* Supports advanced phonetic similarity algorithms and Levenshtein edit distance for typo tolerance.

**Cons**:

* Consumes substantial additional RAM for large audio collections on desktop systems.
* Requires continuous synchronization between SQLite persistent storage and the in memory heap.
* Slower application startup times while the in memory index warms up from disk records.

## Rationale

Option 1 is selected because it directly aligns with Mumhanzi's local first desktop architecture and embedded SQLite storage foundation established in spec 0012. SQLite FTS5 provides proven, battle tested full text search performance with microsecond level prefix queries, while automated database triggers eliminate an entire class of synchronization bugs between the background scanner and the search view.

Pairing the FTS5 virtual table with a B Tree locator table resolves the known SQLite issue where deleting unindexed columns forces a full table scan. Restricting update triggers to textual columns preserves database throughput during playback. Combining this backend foundation with a 150 millisecond frontend debounce, monotonic sequence tokens in `useSearchStore`, and client side model adapters guarantees a smooth, responsive search experience with zero visual stutter or out of order response flickers.
