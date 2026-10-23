# Verify: Playlists & playlist detail · spec 0007 · updated 2026-10-23

_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Navigate to Playlists in sidebar -> Expect playlists overview screen with search bar, header summary, and playlist cards -> AC-1
- [ ] Type search query into overview filter -> Expect playlist cards filtered in real time -> AC-1
- [ ] Click "+ New Playlist" button in header or plus icon in sidebar -> Expect creation modal with title input, description, and 6 Midnight gradient swatches -> AC-2
- [ ] Enter title, select gradient preset, submit form -> Expect new playlist created, sidebar updated reactively, and immediate navigation into detail view -> AC-3
- [ ] Click any playlist card or sidebar playlist link -> Expect playlist detail view with hero banner, cover art, track count, calculated duration, Play All, Shuffle, Edit, and Delete buttons -> AC-4
- [ ] Click "All Playlists" back button in detail header -> Expect return to playlists overview grid -> AC-5
- [ ] Click "Play All" or "Shuffle" on populated playlist -> Expect tracks queued in player footer and playback started immediately -> AC-6
- [ ] View an empty playlist -> Expect Play All and Shuffle buttons disabled with tooltip, and empty state card with Add Songs button -> AC-7
- [ ] Click "Add Songs" button -> Expect slide-in curation drawer displaying searchable library and catalog tracks with one-click Add buttons -> AC-8
- [ ] Click "+ Add" on a track in curation drawer -> Expect track appended to active playlist with updated count and duration metrics -> AC-8, AC-10
- [ ] In song table, test column sort headers and manual up/down position reordering controls -> AC-9
- [ ] Click remove track button on a row -> Expect track entry purged from playlist while original song stays intact in library -> AC-10
- [ ] Click "Edit Details", change title or gradient, save -> Expect detail banner and sidebar playlist item updated immediately -> AC-11
- [ ] Click "Delete Playlist", confirm modal prompt -> Expect custom playlist permanently removed from store and sidebar, navigating back to overview grid -> AC-12
- [ ] Open curated system playlist "Midnight Essentials" -> Expect Edit Details and Delete Playlist buttons suppressed -> AC-12

## Commands

- [ ] `npm test` -> 51 unit and component tests passing across all suites -> AC-1..AC-12
- [ ] `npm run typecheck` -> TypeScript clean with zero emit errors -> AC-1..AC-12
- [ ] `npm run lint` -> ESLint clean with zero warnings or errors -> AC-1..AC-12

## Value-sourcing coverage

- [ ] Playlists overview grid cards -> Sourced from `usePlaylistStore.playlists`
- [ ] Header banner metadata and cover -> Sourced from active record matching `activePlaylistId`
- [ ] Total track count and formatted duration -> Computed dynamically from `playlistTracks[playlistId]`
- [ ] Detail tracklist table rows -> Hydrated from universal catalog tracks via `findCatalogTrackById`
- [ ] Search filter queries -> Matched against title, description, artist, and album
- [ ] Playback queue -> Fed directly from mapped tracks into `usePlayerStore.playCollection`

## Acceptance-criteria coverage

- AC-1: Playlists overview grid, summary header, search filter, and cards covered by steps 1, 2, and test suite
- AC-2: New playlist modal with 6 Midnight gradient swatches covered by step 3 and test suite
- AC-3: Reactive creation and immediate detail navigation covered by step 4 and test suite
- AC-4: Dedicated detail layout with hero banner, cover art, and actions covered by step 5 and test suite
- AC-5: Header back navigation returning to overview grid covered by step 6 and test suite
- AC-6: Play All and Shuffle playback queue integration covered by step 7 and test suite
- AC-7: Empty playlist disabled actions and helper card covered by step 8 and test suite
- AC-8: Slide-in curation drawer with search and one-click add covered by steps 9, 10, and test suite
- AC-9: Songs table sortable columns and manual position reordering covered by step 11 and test suite
- AC-10: Track removal and dynamic metric updates covered by step 12 and test suite
- AC-11: Edit details modal and reactive banner/sidebar sync covered by step 13 and test suite
- AC-12: Destructive deletion flow and curated playlist protection covered by steps 14, 15, and test suite
