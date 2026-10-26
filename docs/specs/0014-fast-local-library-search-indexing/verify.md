# Verify: Fast local library search indexing (spec 0014, created 2026-10-24)

Steps derived from spec 0014 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones.

## Verification checklist

* Verify Cargo dependencies: Cargo.toml configures rusqlite with features = ["bundled-full"] -> AC-1
* Inspect V002 schema migration: creates search_index_entries locator table and library_search_index FTS5 virtual table using unicode61 tokenizer -> AC-2
* Verify automated SQLite triggers: insertions, deletions, and updates on tracks, albums, artists, and playlists synchronize into library_search_index using rowid lookups -> AC-3
* Verify trigger isolation during playback: updating play_count, is_favorite, or last_played_at on tracks does not trigger search index modifications -> AC-4
* Verify initial backfill: migration seeds existing database tracks, albums, artists, and playlists into library_search_index -> AC-5
* Test dynamic genre search: aggregation queries return distinct genres with exact track counts and procedural gradient styling -> AC-6
* Test Tauri IPC command db_search_library: accepts query string, category filter, and limit, returning typed SearchResultsDto -> AC-7
* Test query parser sanitization: strips FTS5 syntax characters and formats prefix matching tokens without throwing SQL errors -> AC-8
* Verify relevance scoring: query results prioritize exact title matches first and apply BM25 scoring with play count weighting -> AC-9
* Benchmark search query performance: verifies database execution completes in under 50 milliseconds on typical library collections -> AC-10
* Verify model adapters: frontend db service maps database DTOs to UI models and hydrates album tracks on demand -> AC-11
* Verify frontend debounce behavior: useSearchStore debounces input by 150 milliseconds while updating input display immediately -> AC-12
* Test rapid typing concurrency: verifies earlier query responses arriving late are discarded by monotonic sequence token and isSearching remains active until the newest request resolves -> AC-13
* Test category pill filtering: selecting Songs, Albums, Artists, Playlists, or Genres isolates visible results while preserving category badge match counts -> AC-14
* Verify playlist search UI: playlist cards and Playlists filter pill render search matches and support playback queueing -> AC-15
* Test empty query reset: clearing search input resets results immediately to empty without triggering database queries -> AC-16
* Test error handling: malformed queries or database errors return structured DatabaseError without crashing UI -> AC-17

## Commands

* `cargo test` -> Rust unit and integration tests for FTS5 queries, sanitization, locator table lookups, and playback trigger isolation pass cleanly -> AC-1 through AC-10, AC-17
* `cargo clippy -- -D warnings` -> Rust clippy linter passes with zero warnings -> AC-1 through AC-10
* `cargo check` -> Rust compiler checks pass with zero errors -> AC-1 through AC-10
* `npm test` -> Frontend TypeScript service, model adapters, and search store unit tests pass cleanly -> AC-11 through AC-17
* `npx tsc --noEmit` -> TypeScript types compile cleanly with zero errors -> AC-7, AC-11 through AC-17

## Acceptance criteria coverage

* AC-1: Cargo configuration covered by dependency inspection and `cargo check`
* AC-2: Schema and locator table covered by migration inspection and `cargo test`
* AC-3: Automated triggers covered by database trigger synchronization tests
* AC-4: Playback isolation covered by track update assertion tests
* AC-5: Initial backfill covered by migration verification tests
* AC-6: Dynamic genre search covered by aggregation query tests
* AC-7: IPC command signature covered by command handler tests and TypeScript compilation
* AC-8: Query sanitization covered by search parser unit tests
* AC-9: Relevance scoring covered by ranking assertion tests
* AC-10: Execution latency benchmarked in search repository performance tests
* AC-11: Model adapters covered by frontend service tests
* AC-12: Input debounce covered by store timer tests in Vitest
* AC-13: Concurrency handling covered by monotonic sequence counter tests
* AC-14: Category badge preservation covered by search store state tests
* AC-15: Playlist UI integration covered by component render tests
* AC-16: Empty query reset covered by search store state tests
* AC-17: Error resilience covered by error mapping tests
