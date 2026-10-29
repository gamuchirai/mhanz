# 0014. Fast local library search indexing

**Date**: 2026-10-24
**Status**: Accepted

## Summary

This specification defines the architecture, database schema, and frontend integration for fast local music library search indexing in Mutinhimira. It introduces an embedded SQLite FTS5 (full text search version five) virtual table with a B Tree row locator table and column targeted database triggers that keep song titles, artists, albums, and playlists synchronized without manual application code. Tauri IPC commands expose unified search querying with BM25 relevance scoring, prefix token matching, and exact match boosting, while the presentation layer Zustand store connects through a 150 millisecond debounce and monotonic request sequence token to prevent out of order responses.

## Requirements

**User stories**:

* As a listener searching for a song, album, artist, or playlist in my personal library, I want instant search results as I type so that I can locate and play music without delays.
* As a listener typing partial words or terms in any order, I want prefix token matching to find matching tracks and albums even if I do not type the complete title.
* As a listener typing rapidly, I want earlier pending search requests to never overwrite newer search results so that the visible screen always reflects my latest query.
* As a listener browsing by category pills, I want to filter search results by songs, albums, artists, playlists, or genres with accurate badge counts preserved across categories.
* As a listener with a growing library of thousands of songs, I want database search queries to complete in under 50 milliseconds so that the user interface feels lightweight and snappy.

**Acceptance criteria**:

* **AC-1**: Cargo configuration upgrades rusqlite to use `features = ["bundled-full"]`, ensuring the SQLite FTS5 virtual table extension compiles reliably across all desktop platforms.
* **AC-2**: Database migration V002 creates a B Tree locator table `search_index_entries` and SQLite FTS5 virtual table `library_search_index` indexing entity type, entity identifier, primary title, subtitle, and secondary text with the unicode61 tokenizer.
* **AC-3**: Automated SQLite triggers on tracks, albums, artists, and playlists immediately synchronize insertions, deletions, and metadata updates into `library_search_index` using index row lookups to avoid full table scans.
* **AC-4**: Track update trigger `trg_tracks_au` targets only textual columns (`title, artist_name, album_name, genre`), preventing playback count increments, favorite toggles, and timestamp changes from re indexing FTS rows during playback.
* **AC-5**: Database migration V002 seeds `library_search_index` with existing records for tracks, albums, artists, and playlists currently stored in the SQLite database.
* **AC-6**: Genre searches execute dynamically via grouped aggregation queries directly against `tracks.genre`, computing exact track counts and applying deterministic procedural gradient styling without orphaned index records.
* **AC-7**: Tauri IPC command `db_search_library` accepts a search query string, an optional category filter, and an optional limit, returning typed `SearchResultsDto` containing matched tracks, albums, artists, playlists, genres, total match count, and execution duration in milliseconds.
* **AC-8**: Search query parser trims input whitespace, sanitizes SQLite FTS5 special operators, splits terms, and formats prefix matching tokens (`token*`) so words typed in any order match without syntax errors.
* **AC-9**: SQLite queries prioritize exact title matches first, followed by prefix matches, and rank results using SQLite FTS5 BM25 scoring with track play count weighting.
* **AC-10**: Keystroke search queries on typical local libraries return results in under 50 milliseconds execution time on the SQLite connection.
* **AC-11**: Frontend client service in `src/services/db.ts` maps database DTOs to UI models (`AlbumCard`, `ArtistCard`, `GenreCard`, `Track`), hydrating album tracklists on demand when clicked rather than embedding full nested tracklists in initial search results.
* **AC-12**: Frontend `useSearchStore` debounces user input by 150 milliseconds before invoking `db_search_library`, while keeping the text input responsive with zero visual lag.
* **AC-13**: Frontend `useSearchStore` tracks a monotonic request sequence counter, ignoring responses from earlier queries when a newer search has already dispatched, and keeps `isSearching` true until the newest dispatched search resolves.
* **AC-14**: Category pill selection switches the visible results panel on the client side without resetting badge match counts of other categories to zero.
* **AC-15**: Search presentation components in `src/components/search/` render playlist search results with a dedicated Playlists filter pill, playlist card grid, and immediate queue playback triggers.
* **AC-16**: When the search query is empty or cleared, `useSearchStore` resets results to empty without issuing database queries, restoring the Explore view with genre cards.
* **AC-17**: If SQLite FTS5 query encounters an error or malformed input, `db_search_library` catches the error safely, returns a structured `DatabaseError`, and frontend displays a friendly empty state without crashing.

## Decision

**Chosen option**: Option 1: Single unified SQLite FTS5 virtual table with B Tree locator table, column targeted database triggers, dynamic genre querying, and monotonic sequence token handling in the Zustand store

Adopt an embedded SQLite FTS5 virtual table named `library_search_index` coupled with a B Tree locator table `search_index_entries` to enable microsecond deletion lookups without linear FTS table scans. Restrict track modification triggers to metadata columns so playback counters do not re index during music listening. Expose search through a unified Tauri IPC command `db_search_library` returning categorized matches in under 50 milliseconds, mapped to presentation models via client adapters and wired to `useSearchStore` with monotonic token request filtering and playlist UI components.

**Implementation skills**: `tauri-v2` (`nodnarbnitram/claude-code-extensions`, `.agents/skills/tauri-v2/`) · `rust-best-practices` (`apollographql/skills`, `.agents/skills/rust-best-practices/`) · `zustand` (`pedronauck/skills`, `.agents/skills/zustand/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

```sql
-- Migration V002: Fast Full Text Search Index and Synchronization Triggers

-- 1. Create B Tree locator table for fast rowid lookups on deletion and update
CREATE TABLE IF NOT EXISTS search_index_entries (
    rowid INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_search_entries_lookup
ON search_index_entries(entity_type, entity_id);

-- 2. Create FTS5 virtual table using contentless or rowid mapped structure
CREATE VIRTUAL TABLE IF NOT EXISTS library_search_index USING fts5(
    title,
    subtitle,
    secondary_text,
    tokenize = 'unicode61 remove_diacritics 2'
);

-- 3. Populate initial records for existing tracks
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'track', id FROM tracks;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, t.title, t.artist_name, coalesce(t.album_name, '') || ' ' || coalesce(t.genre, '')
FROM tracks t
JOIN search_index_entries e ON e.entity_type = 'track' AND e.entity_id = t.id;

-- 4. Populate initial records for existing albums
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'album', id FROM albums;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, a.title, a.artist_name, coalesce(a.genre, '') || ' ' || coalesce(cast(a.year as text), '')
FROM albums a
JOIN search_index_entries e ON e.entity_type = 'album' AND e.entity_id = a.id;

-- 5. Populate initial records for existing artists
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'artist', id FROM artists;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, ar.name, '', coalesce(ar.bio, '')
FROM artists ar
JOIN search_index_entries e ON e.entity_type = 'artist' AND e.entity_id = ar.id;

-- 6. Populate initial records for existing playlists
INSERT INTO search_index_entries(entity_type, entity_id)
SELECT 'playlist', id FROM playlists;

INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
SELECT e.rowid, p.name, coalesce(p.description, ''), ''
FROM playlists p
JOIN search_index_entries e ON e.entity_type = 'playlist' AND e.entity_id = p.id;

-- 7. Automated triggers for track synchronization (targeted to text columns only)
CREATE TRIGGER IF NOT EXISTS trg_tracks_ai AFTER INSERT ON tracks BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('track', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.title, new.artist_name, coalesce(new.album_name, '') || ' ' || coalesce(new.genre, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_ad AFTER DELETE ON tracks BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.title, old.artist_name, coalesce(old.album_name, '') || ' ' || coalesce(old.genre, '')
    FROM search_index_entries e WHERE e.entity_type = 'track' AND e.entity_id = old.id;
    DELETE FROM search_index_entries WHERE entity_type = 'track' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_au AFTER UPDATE OF title, artist_name, album_name, genre ON tracks BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.title, old.artist_name, coalesce(old.album_name, '') || ' ' || coalesce(old.genre, '')
    FROM search_index_entries e WHERE e.entity_type = 'track' AND e.entity_id = old.id;
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.title, new.artist_name, coalesce(new.album_name, '') || ' ' || coalesce(new.genre, '')
    FROM search_index_entries e WHERE e.entity_type = 'track' AND e.entity_id = new.id;
END;

-- 8. Automated triggers for album synchronization
CREATE TRIGGER IF NOT EXISTS trg_albums_ai AFTER INSERT ON albums BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('album', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.title, new.artist_name, coalesce(new.genre, '') || ' ' || coalesce(cast(new.year as text), ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_albums_ad AFTER DELETE ON albums BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.title, old.artist_name, coalesce(old.genre, '') || ' ' || coalesce(cast(old.year as text), '')
    FROM search_index_entries e WHERE e.entity_type = 'album' AND e.entity_id = old.id;
    DELETE FROM search_index_entries WHERE entity_type = 'album' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_albums_au AFTER UPDATE OF title, artist_name, genre, year ON albums BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.title, old.artist_name, coalesce(old.genre, '') || ' ' || coalesce(cast(old.year as text), '')
    FROM search_index_entries e WHERE e.entity_type = 'album' AND e.entity_id = old.id;
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.title, new.artist_name, coalesce(new.genre, '') || ' ' || coalesce(cast(new.year as text), '')
    FROM search_index_entries e WHERE e.entity_type = 'album' AND e.entity_id = new.id;
END;

-- 9. Automated triggers for artist synchronization
CREATE TRIGGER IF NOT EXISTS trg_artists_ai AFTER INSERT ON artists BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('artist', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.name, '', coalesce(new.bio, ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_artists_ad AFTER DELETE ON artists BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.name, '', coalesce(old.bio, '')
    FROM search_index_entries e WHERE e.entity_type = 'artist' AND e.entity_id = old.id;
    DELETE FROM search_index_entries WHERE entity_type = 'artist' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_artists_au AFTER UPDATE OF name, bio ON artists BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.name, '', coalesce(old.bio, '')
    FROM search_index_entries e WHERE e.entity_type = 'artist' AND e.entity_id = old.id;
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.name, '', coalesce(new.bio, '')
    FROM search_index_entries e WHERE e.entity_type = 'artist' AND e.entity_id = new.id;
END;

-- 10. Automated triggers for playlist synchronization
CREATE TRIGGER IF NOT EXISTS trg_playlists_ai AFTER INSERT ON playlists BEGIN
    INSERT INTO search_index_entries(entity_type, entity_id) VALUES ('playlist', new.id);
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    VALUES (last_insert_rowid(), new.name, coalesce(new.description, ''), '');
END;

CREATE TRIGGER IF NOT EXISTS trg_playlists_ad AFTER DELETE ON playlists BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.name, coalesce(old.description, ''), ''
    FROM search_index_entries e WHERE e.entity_type = 'playlist' AND e.entity_id = old.id;
    DELETE FROM search_index_entries WHERE entity_type = 'playlist' AND entity_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_playlists_au AFTER UPDATE OF name, description ON playlists BEGIN
    INSERT INTO library_search_index(library_search_index, rowid, title, subtitle, secondary_text)
    SELECT 'delete', e.rowid, old.name, coalesce(old.description, ''), ''
    FROM search_index_entries e WHERE e.entity_type = 'playlist' AND e.entity_id = old.id;
    INSERT INTO library_search_index(rowid, title, subtitle, secondary_text)
    SELECT e.rowid, new.name, coalesce(new.description, ''), ''
    FROM search_index_entries e WHERE e.entity_type = 'playlist' AND e.entity_id = new.id;
END;
```

**State transitions**:

* Search query lifecycle: Empty (Explore grid active) -> Typing (150ms debounce active, immediate text display) -> Executing (request token incremented, IPC query dispatched, loading state active) -> Resolved (response received, token verified, categorised results rendered) -> Cleared (reset to Empty).
* Index record lifecycle: Inserted (via database trigger on entity creation with locator entry) -> Updated (via targeted trigger on text column modification) -> Removed (via delete trigger looking up rowid in locator table).

**API surface**:

| Endpoint / Command | Method / Type | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| db_search_library | Tauri Command | query: String, category: Option\<String\>, limit: Option\<u32\> | SearchResultsDto | Local IPC | DB_QUERY_FAILED, INVALID_QUERY |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| db_search_library | tracks list | Joined query between library_search_index rowid, search_index_entries, and tracks table |
| db_search_library | albums list | Joined query between library_search_index rowid, search_index_entries, and albums table |
| db_search_library | artists list | Joined query between library_search_index rowid, search_index_entries, and artists table |
| db_search_library | playlists list | Joined query between library_search_index rowid, search_index_entries, and playlists table |
| db_search_library | genres list | Aggregation query `SELECT genre, count(*) FROM tracks WHERE genre LIKE ? GROUP BY genre` with procedural gradient palette |
| db_search_library | total_matches | Sum of all matched tracks, albums, artists, playlists, and genres |
| db_search_library | execution_time_ms | High resolution timer duration measured in Rust backend during execution |
| client adapter | AlbumCard.tracks | Hydrated on demand via `dbGetAlbumDetails` upon album selection rather than upfront search loading |
| client adapter | ArtistCard.monthlyListeners | Sum of play_count across tracks by that artist |
| client adapter | ArtistCard.followersCount | Total track_count for that artist |

**Key invariants**:

* Fast deletion lookups: `search_index_entries` B Tree index resolves internal rowids immediately, preventing full linear FTS5 scans during deletions.
* Playback isolation: Track modification trigger updates FTS rows only when textual columns change, guaranteeing zero database overhead on play increments, favorites, or timestamps.
* Dynamic genre synchronization: Genres query directly against current track records, eliminating orphaned genre records and avoiding complex trigger maintenance.
* Monotonic response ordering: The presentation store only accepts search results if the request sequence token matches the active request token, preventing race conditions.
* Maximum result caps: Unified searches cap tracks at 20, albums at 8, artists at 8, playlists at 6, and genres at 6 to guarantee sub 50 millisecond query execution and fast DOM rendering.

**Security model**:

* Desktop local execution only. All search commands execute within the local Tauri process against the local SQLite database file in the user application data directory.
* No network requests, external telemetry, or credentials are required or transmitted.

**Configuration required**:

* Cargo dependency update: `rusqlite = { version = "0.40", features = ["bundled-full"] }` in `src-tauri/Cargo.toml`.

**Critical test scenarios**:

* Happy path: User types a partial artist name, query executes in under 50 milliseconds, returning matching tracks, albums, artist cards, and playlists, verifies AC-7, AC-9, AC-10
* Token prefix matching: User types words in arbitrary sequence without case matching, FTS5 matches titles correctly, verifies AC-2, AC-8
* Rapid typing concurrency: User types five characters in rapid succession, out of order responses are discarded by sequence token, verifies AC-12, AC-13
* Database trigger synchronization: Inserting a new track file via scanner immediately makes it findable via search without manual reindexing, verifies AC-3, AC-5
* Playback counter isolation: Incrementing play count or toggling favorite does not invoke FTS triggers or modify search_index_entries, verifies AC-4
* Malformed input resilience: User types quote marks, asterisks, and punctuation symbols, search cleanses tokens and returns empty or partial results without error, verifies AC-8, AC-17

## Build plan

1. Update `src-tauri/Cargo.toml` to specify `rusqlite` with `features = ["bundled-full"]`, satisfies AC-1
2. Create migration file `src-tauri/migrations/V002__search_index.sql` with B Tree locator table, FTS5 virtual table, column targeted triggers, and backfill statements, satisfies AC-2, AC-3, AC-4, AC-5
3. Implement search repository `src-tauri/src/db/search_repo.rs` with query sanitization, tokenization, BM25 scoring, exact match boosting, and dynamic genre aggregation, satisfies AC-6, AC-7, AC-8, AC-9, AC-10
4. Register Tauri IPC command `db_search_library` in `src-tauri/src/commands/db.rs` and update command registration in `src-tauri/src/lib.rs`, satisfies AC-7, AC-17
5. Define TypeScript interfaces in `src/types/database.ts` and client helper `dbSearchLibrary` with model adapters in `src/services/db.ts`, satisfies AC-7, AC-11
6. Wire `useSearchStore` in `src/store/useSearchStore.ts` to replace mock filtering with debounced IPC calls and monotonic sequence token validation, satisfies AC-12, AC-13, AC-14, AC-16
7. Update search presentation components in `src/components/search/` with Playlists filter pill, playlist card grid, and queue playback integration, satisfies AC-14, AC-15
8. Add comprehensive unit and integration tests covering query execution speed, trigger isolation during playback, and out of order response handling, satisfies AC-4, AC-9, AC-10, AC-13, AC-17

## Consequences

**Positive**:

* Instant keystroke search across local music libraries with execution times consistently under 50 milliseconds.
* B Tree locator table prevents full linear scans during record deletions, maintaining fast performance on large collections.
* Column targeted triggers ensure zero performance impact or database locking during active audio playback and favorite toggling.
* Shared FTS5 virtual table enables querying songs, albums, artists, playlists, and genres in one unified pass.
* Sequence token filtering prevents visual flickering and race conditions during rapid typing.

**Negative / tradeoffs**:

* FTS5 virtual table and locator table increase SQLite database file size on disk by roughly fifteen to twenty percent for stored term indices.
* Write operations (track insertions during initial library scans) incur minor trigger overhead to update locator and search entries.

**Neutral**:

* Uses bundled SQLite compiled with full extensions, adding zero external operating system dependencies.

## Follow-up

* [ ] Monitor database file size growth during large library imports in Phase 2 scanner testing.
