# Verify: playlists & favorites persistence · spec 0015

## UI / manual
- [x] Boot application and observe 5 default seeded playlists in overview grid and sidebar → AC-4, AC-5
- [x] Navigate to Liked Songs and observe total count of liked tracks and duration → AC-6
- [x] Click unlike heart on a song in Liked Songs, observe immediate state persistence and row retention with restore heart button → AC-9, AC-10
- [x] Click restore heart button, observe dynamic counter and like state restoration → AC-9, AC-10
- [x] Open Create New Playlist modal, submit playlist "Synthwave Reverie", observe new playlist in sidebar and navigation to detail banner → AC-2, AC-3, AC-7
- [x] Open Add Songs drawer in newly created playlist, add "Perfect" and "Dusk Till Dawn", observe updated track count and duration → AC-5, AC-8
- [x] Toggle favorite status from player footer, observe reactive synchronization across Liked Songs, Library, Albums, and Playlist tables via favoritesSync coordinator → AC-9, AC-11
- [x] Delete active playing playlist, observe current song continues to completion while playbackContext and upcoming queue are cleared → AC-12

## Commands
- [x] `cargo test` → all 14 native database and audio tests passed → AC-1, AC-2, AC-3, AC-4, AC-8
- [x] `npm test src/test/playlistsPersistence.test.tsx` → all 9 persistence integration tests passed → AC-1 through AC-12
- [x] `npm test src/test/liked.test.tsx` → all 10 liked songs tests passed → AC-6, AC-9, AC-10, AC-11
- [x] `npm test src/test/playlists.test.tsx` → all 14 playlist UI tests passed → AC-2, AC-3, AC-7, AC-8
- [x] `npm test` → all 15 test suites and 159 tests passed → AC-1 through AC-12
- [x] `cargo clippy -- -D warnings` and `cargo fmt --check` → passed with zero warnings
- [x] `npm run build` and `npm run lint` → TypeScript compiles and bundles cleanly

## Acceptance-criteria coverage
- AC-1 Migration V002 schema additions with composite index on (is_favorite, liked_at DESC): met
- AC-2 Playlist entity storing gradient preset, cover art path, and is_curated: met
- AC-3 Typed PlaylistInputDto payload contracts for creation and updates: met
- AC-4 Transactional seeding of 5 default playlists on startup: met
- AC-5 Lazy tracklist loading via dbGetPlaylistDetails and boot hydration: met
- AC-6 SQLite liked songs boot hydration ordered by liked_at DESC: met
- AC-7 Optimistic update with automatic rollback on SQLite error: met
- AC-8 Atomic position sequence reordering strictly matching on entry IDs: met
- AC-9 Serialized SQLite favorite toggle persistence per track ID: met
- AC-10 Liked songs unliking retention until navigation: met
- AC-11 Centralized favoritesSync coordinator reactive event broadcast: met
- AC-12 Playback context and upcoming queue cleanup on active playlist deletion: met
