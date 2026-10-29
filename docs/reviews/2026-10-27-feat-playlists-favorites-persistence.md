# Review, feat/playlists-favorites-persistence, 2026-10-27

**Reviewed by**: Gemini 3.8 Flash (inline; author on same model family, see note below)
**Scope**: 36 files changed, branch vs feat/local-library-scanner-metadata
**Verdict**: Approve with nits

> **Independence note**: Antigravity subagents inherit the parent model, so this review runs on the same model family that wrote the code. The cross model guarantee is not met. For a fully independent review, paste the diff into Claude Opus or GPT-4o via your AI tool of choice. The findings below are genuine but may share the author model blind spots on subtle logic.

## Summary

This pull request implements SQLite persistence and synchronized favorite state for playlists and liked songs in Mutinhimira. It introduces schema migration V002 with composite indexing, adds structured Rust DTO contracts and transactional repository operations, seeds default sample playlist containers safely on first boot, and coordinates favorite toggles across all five presentation stores via a centralized coordinator. The implementation honors Clean Architecture, provides optimistic state updates with rollback handling, and prevents active playback cutoff when a playlist is deleted. All 14 Rust tests and 159 frontend tests pass cleanly with zero lint errors. No blockers or majors were found.

Three minor improvements and two nits are noted below.

## Minor

### 🟡 Chained in flight promise rejection propagation in favorite coordinator, `src/services/favoritesSync.ts:75`

**Problem**: When serializing rapid consecutive clicks on a track, `const previousPromise = this.inFlightByTrack.get(trackId) ?? Promise.resolve(currentIsFavorite)` chains subsequent requests using `previousPromise.then(...)`. If an initial toggle fails and rejects (for instance due to temporary database contention), the rejected promise immediately propagates through the chain, causing any queued subsequent click to reject without executing its own toggle logic.

**Why it matters**: If a user double clicks a heart icon and the first database call experiences an error, the second click will fail instantly even if the database is ready for the second write.

**Suggested fix**: Catch rejection on the antecedent promise before chaining with `.then()`, for example `(this.inFlightByTrack.get(trackId) ?? Promise.resolve()).catch(() => {})`. This ensures that each queued toggle attempts its own persistence operation regardless of prior request outcomes.

### 🟡 Optimistic temporary entry identifier race condition on rapid playlist edits, `src/store/usePlaylistStore.ts:405`

**Problem**: `addTrackToPlaylist` creates an optimistic entry using a temporary client identifier (`temporaryEntryId`) and triggers `dbAddTracksToPlaylist` alongside `loadPlaylistDetails`. If a user adds a track and immediately deletes or drags it before the background SQLite call and detail reload complete, subsequent actions pass the temporary identifier to `db_remove_playlist_track` or `db_reorder_playlist_tracks`. SQLite rejects the unknown identifier with `item_not_found`, causing an unexpected rollback.

**Why it matters**: In rapid user interactions, such as quickly adding a track and immediately reordering or deleting it, the action can fail and revert unexpectedly.

**Suggested fix**: Update `db_add_tracks_to_playlist` to return the inserted playlist track records with their assigned database identifiers directly, or permit client supplied entry identifiers during track insertion so the optimistic state matches the database record immediately.

### 🟡 Liked songs boot query caps tracks at 500 items, `src/store/useLikedSongsStore.ts:153`

**Problem**: The `initializeLikedSongs` method calls `dbGetTracks(0, 500)`. When a music collection contains more than 500 favorited songs, only the first 500 tracks are loaded into the store and presented on the screen.

**Why it matters**: Listeners with large music libraries will find that liked tracks beyond count 500 do not appear in the liked songs view.

**Suggested fix**: Implement chunked retrieval during initial hydration or configure a higher default threshold until virtualized table server pagination is introduced.

## Nits

- ⚪ `src/store/useLikedSongsStore.ts:278`, When a track is liked from a view where full metadata is not already cached in memory, `findTrackInfo` defaults missing fields to placeholder strings such as Unknown Title. Querying SQLite asynchronously via `dbGetTrackById` when memory lookup returns null ensures full metadata display.

- ⚪ `src/store/usePlaylistStore.ts:220` and `src/pages/Playlists.tsx:20`, `loadPlaylistDetails` is invoked both inside `setActivePlaylistId` in the store and within the mount `useEffect` hook in `Playlists.tsx`. Consolidating this call avoids duplicate IPC queries when selecting a playlist.

## Strengths

- Robust transactional reordering in `playlist_repo.rs`: Updating playlist track positions runs within an explicit database transaction with sequential renumbering, guaranteeing zero position gaps and atomic rollback on failure.
- Reactive cross store sync architecture: The centralized `favoritesSync` coordinator broadcasts favorite state across `useLikedSongsStore`, `usePlayerStore`, `useLibraryStore`, `useAlbumStore`, and `usePlaylistStore` without tight coupling between stores.
- Playback deletion safety in `usePlayerStore.ts`: `clearContextIfMatches` safely clears active playlist context and future queue without cutting off the currently playing song.
- Safe default container seeding in `seeding.rs`: Seeding empty playlist containers on startup avoids foreign key constraint violations prior to library folder scanning.

## Test coverage

Comprehensive test verification across native and frontend layers. Rust unit tests cover playlist CRUD, transactional track reordering, and migration integrity. The Vitest suite covers optimistic hydration, detail loading, cross store favorite broadcasting, error rollback, and deletion queue safety across 159 tests.
