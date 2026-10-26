# Verify: Data model and SQLite storage (spec 0012, created 2026-10-24)
_Steps derived from spec 0012 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Verification checklist

- [ ] Inspect Cargo.toml dependencies -> rusqlite with bundled feature and rusqlite migration configured cleanly -> AC-1
- [ ] Inspect V001 initial schema migration -> Tables defined for folders, artists, albums, tracks, playlists, playlist tracks, and settings with indices -> AC-2
- [ ] Inspect database initialization path -> Resolves to app local data directory with mumhanzi.db database file name -> AC-3
- [ ] Verify SQLite connection pragmas -> journal mode is WAL, synchronous is NORMAL, foreign keys is ON, and busy timeout is 5000 -> AC-4
- [ ] Verify startup lifecycle hook -> Database connection initializes and applies migrations synchronously in Tauri setup before window displays -> AC-5
- [ ] Verify IPC command naming and error responses -> All commands use db prefix and return structured DatabaseError on failure -> AC-6
- [ ] Test folder repository operations -> Adding, listing, and removing monitored music folders works with persistent storage -> AC-7
- [ ] Test track repository operations -> Querying paginated tracks, toggling favorites, and incrementing play count persists changes -> AC-8
- [ ] Test catalog repository queries -> Querying albums, album details, artists, and artist profile discography returns structured data -> AC-9
- [ ] Test playlist repository operations -> Creating playlists, appending tracks, removing tracks, and reordering tracks updates SQLite records -> AC-10
- [ ] Test corruption recovery handling -> Simulating corrupted SQLite file creates timestamped backup and reinitializes clean schema -> AC-11
- [ ] Test player settings storage -> Saving and retrieving key value preferences works reliably -> AC-12

## Commands

- [ ] `cargo test` -> Rust unit and integration tests for database connection, migrations, and repositories pass cleanly -> AC-1 through AC-12
- [ ] `cargo clippy -- -D warnings` -> Rust clippy linter passes with zero warnings -> AC-1 through AC-12
- [ ] `cargo check` -> Rust compiler checks pass with zero errors -> AC-1 through AC-12
- [ ] `npm test` -> Frontend TypeScript service unit tests pass cleanly -> AC-6 through AC-12
- [ ] `npx tsc --noEmit` -> TypeScript types compile cleanly with zero errors -> AC-6 through AC-12

## Acceptance criteria coverage

- AC-1: Cargo configuration covered by dependency inspection and `cargo check`
- AC-2: Relational schema covered by migration inspection and `cargo test`
- AC-3: App data path resolution covered by database initialization tests
- AC-4: SQLite pragmas covered by connection tests
- AC-5: Synchronous startup hook covered by Tauri setup test
- AC-6: IPC command naming and errors covered by command tests and TypeScript compiler
- AC-7: Folder repository covered by repository tests
- AC-8: Track repository covered by track persistence tests
- AC-9: Catalog repository covered by album and artist query tests
- AC-10: Playlist repository covered by playlist CRUD and reordering tests
- AC-11: Corruption recovery covered by backup and reinit test
- AC-12: Settings persistence covered by key value repository tests
