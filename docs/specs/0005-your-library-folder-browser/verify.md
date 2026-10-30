# Verify: your library & folder browser · spec 0005 · updated 2026-10-29
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Select Your Library in the sidebar → Library screen renders with summary header (9 tracks, 32 mins, 2 folders), action buttons, and songs table → AC-1
- [ ] Click Manage Folders in header → Collapsible folder management panel smoothly reveals cards for Afrobeats Grooves and Midnight Chill → AC-2
- [ ] Click Add Folder in panel → Folder selection modal appears with preset collections, custom path form, and native system directory picker → AC-3, Finding F-1
- [ ] Click Browse Folder on This PC → Native desktop file explorer dialog opens to select an audio directory from disk → Finding F-1
- [ ] Select a music directory from native picker → Modal dismisses, folder registers with SQLite, and background scanner imports tracks → Finding F-1
- [ ] Click Browse next to custom path input → Native directory picker opens and populates custom path input and display name → Finding F-1
- [ ] Select Rock Classics preset → New folder card appears, and 3 rock tracks are indexed into the songs table (total 12 tracks) → AC-3
- [ ] Click Rescan on Afrobeats Grooves card → Spinning loader appears on card for 1 second and last scanned timestamp updates to Just now → AC-4
- [ ] Click Remove on Afrobeats Grooves card → Removal dialog opens with purge checkbox checked → AC-5
- [ ] Click Remove Folder in dialog → Afrobeats Grooves is unmonitored and its 4 tracks are purged from table (5 tracks remain) → AC-5
- [ ] Click folder card for Midnight Chill → Songs table filters to display only Midnight Chill tracks and displays active filter chip → AC-6
- [ ] Click clear on the active folder filter chip → Songs table restores all indexed tracks across all folders → AC-6
- [ ] Click column headers (Title, Artist, Album, Duration, Date Added) → Rows reorder ascending and descending with arrow indicators → AC-7
- [ ] Type query "Aiden" into library filter search box → Table filters in real time to show only tracks by Aiden Vale → AC-8
- [ ] Click Play All or Shuffle in header → Visible tracks queue into PlayerFooter and playback begins immediately → AC-9
- [ ] Double click a song row or click row play button → Track plays in PlayerFooter and active row is highlighted with accent tone → AC-10
- [ ] Remove all folders → Empty library welcoming state card appears with Add Music Folder button → AC-11

## Commands
- [ ] `npm test src/test/library.test.tsx` → Vitest unit and component tests pass (12 passing tests) → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11
- [ ] `npm test src/test/libraryFolderPicker.test.tsx` → Vitest native picker integration tests pass (4 passing tests) → Finding F-1
- [ ] `npx tsc --noEmit` → TypeScript strict compilation passes with zero diagnostics
- [ ] `npx eslint .` → Code style and lint checks pass cleanly
- [ ] `cargo check --manifest-path src-tauri/Cargo.toml` → Rust crate compilation with tauri-plugin-dialog passes cleanly
- [ ] `npm run build` → Vite production client bundle builds successfully

## Acceptance-criteria coverage
- AC-1: Covered by summary header render, total stats counters, and sidebar navigation
- AC-2: Covered by Manage Folders toggle and folder cards presentation
- AC-3: Covered by Add Folder modal, demo presets, and custom path indexing
- AC-4: Covered by Rescan button, 1s spinner simulation, and timestamp refresh
- AC-5: Covered by Remove button, confirmation dialog, and track purge option
- AC-6: Covered by folder card click isolation and clear filter chip
- AC-7: Covered by sortable column headers with visual ascending and descending arrows
- AC-8: Covered by real time text search filter matching title, artist, and album
- AC-9: Covered by Play All and Shuffle actions connecting to usePlayerStore
- AC-10: Covered by row play button and double click row playback
- AC-11: Covered by empty library state card with welcoming instructions
- Finding F-1: Covered by native desktop folder picker button, path browse action, plugin registration, and test suite
