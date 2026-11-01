# Review, feat/home-listening-history-popular-tracks-persistence, 2026-11-01

**Reviewed by**: Staff Software Engineer (author on Claude 3.7 Sonnet)
**Scope**: 39 files, feat/home-listening-history-popular-tracks-persistence vs main
**Verdict**: Approve with nits

## Summary

This pull request implements SQLite persistence for listening history and popular tracks across the desktop home discovery experience. The audio engine progress loop accurately latches playback milestones at thirty seconds or half duration, releasing mutex locks before spawning background persistence tasks. Queries for deduplicated recent plays and top played tracks operate efficiently with database indexing and sliding window pruning. Minor visual polish items around unplayed track zero counts in the hero banner, image error reset handling, and initial hydration state checks should be addressed, but the underlying implementation is robust and safe to merge.

## Minor

### 🟡 Hero banner displays artificial prototype play count for unplayed songs, `src/components/home/HeroBanner.tsx:184`
**Problem**: The display check tests `item.track?.playsCount ?` using JavaScript truthiness. When the local library has unplayed songs that backfill the popular tracks query, `playsCount` is zero, which evaluates to false. This causes the banner to fall back to the string `"4.8M"` from prototype fixtures.
**Why it matters**: A real local song with zero plays is presented to the user with a misleading play count of 4.8 million plays under the badge TOP PLAYED.
**Suggested fix**: Check whether `item.track?.playsCount` is a valid number instead of evaluating truthiness, and display zero plays or omit the count when zero.

### 🟡 Hero artwork error state does not reset on track change, `src/components/home/HeroBanner.tsx:17`
**Problem**: The `imageError` state is initialized once with `useState(false)`. If an image fails to load or if the initial showcase item has no valid image, the flag switches to true and never resets when `bannerImg` changes during player hydration or track switching.
**Why it matters**: When the hero banner transitions from placeholder fixtures to the actual top played track, or when a listener navigates between featured tracks, authentic cover art remains hidden behind the fallback color block.
**Suggested fix**: Reset `imageError` to false whenever `bannerImg` or `trackId` changes, either with an effect or by keying the component.

### 🟡 Unused initialization flag causes transient empty state flash, `src/pages/Home.tsx:18`
**Problem**: The store defines and exports `isHomeInitialized` via `useIsHomeInitialized`, but neither `Home.tsx` nor `RecentCarousel.tsx` reads this property. During initial launch on Tauri, `libraryTrackCount` starts at zero while asynchronous database queries run in the background.
**Why it matters**: The recent plays section briefly renders the empty state inviting the user to scan music folders before the database query finishes and replaces it with recent cards.
**Suggested fix**: Consume `useIsHomeInitialized` in `Home.tsx` or `RecentCarousel.tsx` to delay rendering contextual empty states until SQLite queries have resolved.

## Nits

* ⚪ `src-tauri/src/db/history_repo.rs:58`, Sliding window deletion query `ORDER BY played_at DESC LIMIT 1000` could add `rowid DESC` as a secondary tie breaker to ensure deterministic pruning when multiple rows share identical timestamps.
* ⚪ `src-tauri/src/db/history_repo.rs:84`, Method `record_playback` executes history insertion and play count updates in separate calls without an explicit SQLite transaction block; wrapping both in `conn.transaction()` guarantees atomic commits.
* ⚪ `src/components/home/HeroBanner.tsx:184`, String template `${item.track.playsCount} plays` uses the plural noun unconditionally, producing "1 plays" for single play tracks instead of singular "1 play".

## Strengths

* Audio monitor milestone latching drops the engine inner mutex before dispatching database writes on a background thread, guaranteeing zero audio stutter during disk writes.
* Common table expression query in `get_recent_plays` cleanly deduplicates repeated plays to the latest playback session in SQLite rather than transferring duplicate rows to the frontend.
* Graceful backfill in `get_popular_tracks` seamlessly blends played tracks with unplayed favorites and recent additions, maintaining an aesthetically balanced discovery grid in fresh libraries.
* Excellent test suite with 19 Rust unit tests and 8 comprehensive frontend persistence tests covering edge cases including seek deduplication, foreign key cascading, and browser fallback.

## Test coverage

The test suite provides high quality coverage across both Rust and TypeScript layers. Backend tests in `history_repo.rs` verify record insertion, play count increments, deduplicated recent queries, popular track backfill order, clear history preservation, and foreign key cascade deletion. Frontend integration tests in `src/test/homePersistence.test.tsx` thoroughly exercise hydration from SQLite status and discovery endpoints, dynamic hero banner presentation, contextual empty states, audio play context propagation, clear history triggers, reactive event updates via `audio:history-recorded`, and browser fallback when outside Tauri.
