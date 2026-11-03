# Verify: Audio file metadata tag editor · spec 0023 · updated 2026-11-03
_Steps derived from spec 0023 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI and manual
- [ ] Right click a track row in Your Library → select "Edit metadata" → verify modal opens showing probed physical tags including title, artist, album, genre, year, track number, disc number, and cover art → AC-1, AC-2, AC-5
- [ ] Edit the track title, artist name, and year in the modal and save → verify modal closes, table row updates immediately via event, audio file on disk contains modified tags via Lofty, and Search view displays updated song → AC-1, AC-2, AC-6, AC-8, AC-9, AC-11
- [ ] Replace cover art by clicking the image frame and selecting a PNG or JPG file via native file dialog → save changes → verify track thumbnail updates and cached image exists in local cache directory → AC-5, AC-6, AC-8, AC-11
- [x] Drag and drop an image file onto the cover art frame in the tag editor modal → verify image preview updates immediately before saving → AC-5
- [x] Navigate to an album detail page and click the "Edit details" button in the album banner → verify batch editor opens prefilled with album title, album artist, year, and cover art → AC-3, AC-4
- [ ] Change the album title and release year in the batch editor and save → verify all album tracks update on disk and in SQLite, album favorite status is preserved, and album detail header reflects new information → AC-3, AC-4, AC-6, AC-8, AC-11
- [ ] Start playing a track in the player footer, open its tag editor modal, change the title or artist, and save → verify audio continues playing from same position without skipping to next track, file on disk updates, and player footer updates active track metadata → AC-7, AC-11
- [ ] Attempt to edit a track marked as read only on disk → save changes → verify friendly error banner appears stating write permissions failed, temporary file is deleted, and database remains unchanged → AC-6, AC-10
- [ ] Run a batch edit across multiple tracks where one file is locked by an external application → save changes → verify accessible tracks succeed and a clear summary banner alerts the user to the failed file → AC-4, AC-10, AC-11

## Commands
- [x] `cargo test tagger::tests` → verify Lofty probing, unique temporary file writing, Windows rename retry loop, cover art hashing, and audio reload guard pass → AC-1, AC-5, AC-6, AC-7
- [x] `cargo test tagger::tests::test_track_metadata_transaction_and_orphan_cleanup` → verify SQLite updates, in place album updating, post write timestamp extraction, and orphan cleanup pass → AC-8, AC-9
- [x] `npm test src/test/tagEditor.test.tsx` → verify modal inputs, drag and drop cover replacement, batch editing, and reactive store synchronization pass → AC-1, AC-2, AC-3, AC-4, AC-5, AC-11
- [x] `npm test` → verify full Vitest frontend suite executes with zero failures → AC-2, AC-3, AC-4, AC-5, AC-11
- [x] `cargo test` → verify complete Rust backend test suite passes → AC-1, AC-5, AC-6, AC-7, AC-8, AC-10
- [x] `npm run typecheck` → verify TypeScript compilation passes cleanly → AC-1, AC-2, AC-3, AC-4, AC-11
- [ ] `npm run lint` → verify ESLint check passes with zero errors → AC-2, AC-3, AC-4

## Acceptance criteria coverage
- AC-1 (Physical tag probing on modal launch): covered by UI modal launch test, `cargo test tagger::tests::test_lofty_tag_operations`, and `npm test src/test/tagEditor.test.tsx`
- AC-2 (Track context menu triggers): covered by UI context menu test and `npm test src/test/tagEditor.test.tsx`
- AC-3 (Album details batch edit trigger): covered by UI album banner test and `npm test src/test/tagEditor.test.tsx`
- AC-4 (Multi track batch editor mechanics): covered by UI batch save test and `npm test src/test/tagEditor.test.tsx`
- AC-5 (Embedded cover artwork replacement and removal): covered by UI file picker and drag and drop tests, and `cargo test tagger::tests::test_cache_cover_image_size_cap`
- AC-6 (Atomic temporary file disk write with Windows retry loop): covered by UI save test and `cargo test tagger::tests`
- AC-7 (Active playback coordination and reload guard): covered by UI active playback test and `cargo test audio::tests::test_audio_engine_reload_guard`
- AC-8 (In place album update and relational SQLite synchronization): covered by UI save test and `cargo test tagger::tests::test_track_metadata_transaction_and_orphan_cleanup`
- AC-9 (Automatic search index updates): covered by UI search test and database trigger tests
- AC-10 (Resilient error handling and batch aggregation): covered by UI read only error test, UI partial failure test, and `cargo test tagger::tests`
- AC-11 (Event driven presentation layer synchronization): covered by UI event reload tests, `npm test src/test/tagEditor.test.tsx`, and store integration tests
