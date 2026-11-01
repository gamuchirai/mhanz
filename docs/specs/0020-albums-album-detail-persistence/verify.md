# Verify: Albums and album detail persistence · spec 0020 · updated 2026-10-31
_Steps derived from spec 0020 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Boot application and observe scanned local albums in Albums overview grid loaded from SQLite → AC-2, AC-3, AC-6
- [x] Click any album card to open Album Detail view, observing hero banner with cover art, release year, total calculated duration, and track count → AC-3, AC-4, AC-7
- [x] In Album Detail view for a multi disc release, observe distinct disc separator headers with tracks sequenced per disc → AC-4, AC-7
- [x] In Album Detail view for a single disc release, observe a seamless numbered tracklist with hidden disc header → AC-4, AC-7
- [x] Click album heart icon on hero banner, observe immediate optimistic active heart state and SQLite persistence across restarts → AC-1, AC-5, AC-8
- [x] Navigate to Liked Songs or PlayerFooter after liking an album, observing that all tracks belonging to the album are marked as liked → AC-5, AC-8
- [x] Individually like fifty percent or more of songs in an album, observing that the album heart automatically updates to favorite status → AC-2, AC-9
- [x] Unlike an already favorited album, observing that the album heart and all song hearts in that album become unliked across SQLite and active stores → AC-5, AC-8
- [x] Trigger a local folder scan in Library view, observing that newly discovered albums appear in the Albums grid upon scan completion without scroll jumps → AC-10
- [x] Run application in a web browser without Tauri, observing graceful fallback to placeholder fixture albums → AC-11
- [x] Click Play All or Shuffle on an album detail screen, observing sequential playback queueing in PlayerFooter → AC-12

## Commands
- [x] `cargo test` → native migration, repository, and IPC tests pass → AC-1, AC-2, AC-3, AC-4, AC-5
- [x] `npm test src/test/albumsPersistence.test.tsx` → integration tests pass → AC-1 through AC-12
- [x] `npm test` → all test suites pass → AC-1 through AC-12
- [x] `cargo clippy -- -D warnings` and `cargo fmt --check` → passed with zero warnings
- [x] `npm run build` and `npm run lint` → TypeScript compiles and bundles cleanly

## Acceptance criteria coverage
- AC-1 Migration V004 schema additions with index on (is_favorite, favorited_at DESC): met
- AC-2 Aggregated track count, duration, and derived 50 percent liked album status: met
- AC-3 Typed AlbumDto data contracts in Rust and TypeScript: met
- AC-4 Sequenced multi disc tracklist query via db_get_album_details: met
- AC-5 Atomic transaction toggle in db_toggle_album_favorite returning affected tracks: met
- AC-6 Asynchronous store hydration via initializeAlbums on boot: met
- AC-7 Lazy tracklist loading on album detail view open: met
- AC-8 Optimistic favorite update with rollback and favoritesSync broadcast: met
- AC-9 Reactive derived album favorite recalculation on track like updates: met
- AC-10 Silent catalog re hydration on scanner completion events: met
- AC-11 Browser preview fallback to mock fixtures when isTauri is false: met
- AC-12 Full album playback queueing with multi disc order preservation: met
