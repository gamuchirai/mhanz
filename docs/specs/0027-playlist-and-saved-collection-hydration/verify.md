# Verify: Playlist and saved collection hydration · spec 0027 · updated 2026-11-10
_Steps derived from spec 0027 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Launch app in Tauri and navigate to Playlists → verify loading skeletons render while querying SQLite, followed by hydrated playlists with real track counts → AC-1
- [x] Trigger a SQLite error by simulating query rejection → verify playlists clear to empty array and display an inline alert with a working Retry action → AC-1
- [x] Select an active playlist with tracks → verify detail view displays header banner and track table; for an empty playlist, verify empty guidance is shown → AC-1, AC-5
- [x] Navigate to Home screen → verify Your Collections section displays up to 6 cards with playlists ordered first followed by library albums → AC-2
- [x] Vary collection counts (such as 5 playlists and 1 album, or 1 playlist and 5 albums) → verify unused slots fill to maintain up to 6 cards → AC-2
- [x] Simulate playlist query failure while album query succeeds → verify album cards remain visible and an inline retry card appears in the first slot of playlists → AC-3
- [x] Simulate album query failure while playlist query succeeds → verify playlist cards remain visible and an inline retry card appears in the first slot of albums → AC-3
- [x] Simulate empty library and empty playlists → verify Your Collections shows empty guidance with functional Open Playlists and Add Music buttons → AC-3
- [x] Click See all on Home Your Collections → verify it navigates to the Playlists view without a dead click → AC-4, AC-5
- [x] Click an album card → verify it sets active album and navigates to Albums detail → AC-4
- [x] Click a playlist card → verify it sets active playlist and navigates to Playlist detail → AC-4
- [x] Click quick play on a playlist card with tracks → verify button displays loading spinner, fetches ordered tracks via db_get_playlist_details, and starts playback → AC-4
- [x] Observe quick play on an empty playlist → verify button is disabled, has aria-disabled="true", and displays tooltip explaining tracks must be added first → AC-4, AC-5
- [x] Simulate database error during detail fetch on quick play → verify desktop toast notice appears and playback is not triggered → AC-4

## Commands
- [x] `npm test` → 35 test files and 382 tests pass, including all 24 tests in `src/test/playlistCollectionHydration.test.tsx` → AC-1, AC-2, AC-3, AC-4, AC-5
- [x] `cargo test --manifest-path src-tauri/Cargo.toml` → all 47 native Rust tests pass cleanly → AC-1
- [x] `npm run build` → TypeScript and Vite production bundle compiles cleanly with 0 errors → AC-1, AC-5

## Acceptance-criteria coverage
- AC-1 in Tauri, playlist overview and detail data come from SQLite with loading skeletons, empty guidance, and visible retry action; database errors clear items and do not fall back to fixtures; duplicate store initialization calls are ignored while loading is active · covered by UI steps 1, 2, 3 and Command steps 1, 3
- AC-2 Home shows a Your Collections section using persisted playlists and library albums up to six cards with balanced slots (up to 3 each, filling unused slots from the other type), qualifying playlists first then albums, preserving store sort order and curated playlists · covered by UI steps 4, 5 and Command step 1
- AC-3 playlist and album data load independently; failed source displays inline retry card in first slot while healthy source cards remain visible; empty collections offer actions to open Playlists and add music · covered by UI steps 6, 7, 8 and Command step 1
- AC-4 See all opens Playlists; album card opens album detail; playlist card opens detail; quick play displays spinner, loads ordered entries from SQLite, and starts playback; detail failure triggers toast notice; empty playlist has disabled Play button with accessible tooltip · covered by UI steps 9, 10, 11, 12, 13, 14 and Command step 1
- AC-5 unsupported or empty controls are visibly disabled with accessible explanations and no dead clicks across reviewed playlist and Home surfaces · covered by UI steps 3, 9, 13 and Command steps 1, 3

## Value-sourcing coverage
- Render saved playlist card → verified from `PlaylistDto` via `db_get_playlists`
- Render playlist detail → verified from `PlaylistTrackDto.position` and `TrackDto` via `db_get_playlist_details`
- Render saved album card → verified from `AlbumDto` via `db_get_albums`
- Navigate via See all → verified route targeting `Playlists`
- Navigate via album card → verified `AlbumDto.id` targeting `Albums` detail
- Play saved playlist → verified ordered tracks and queue context from SQLite
- Inline error presentation → verified store error message and targeted retry action
- Retry failed collection → verified independent store reload without touching successful collection

