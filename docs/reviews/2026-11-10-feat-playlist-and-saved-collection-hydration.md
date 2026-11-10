# Review: feat/playlist-and-saved-collection-hydration (2026-11-10)

**Reviewed by**: Antigravity Reviewer (independent verification)  
**Scope**: 16 files, feat/playlist-and-saved-collection-hydration vs main  
**Verdict**: Approved  

## Summary

This pull request implements SQLite hydration, error isolation, responsive slot balancing, and local music curation for playlists and Home collections in Mutinhimira (Feature 28, spec 0027). It connects `usePlaylistStore` and `useAlbumStore` to existing native SQLite database APIs (`dbGetPlaylists`, `dbGetAlbums`, `dbGetPlaylistDetails`, `dbAddTracksToPlaylist`), enforces clean error clearing without fixture fallback in desktop mode, implements the 6 card slot balancing algorithm in `CuratedGrid` (up to 3 playlists and 3 albums, filling unused slots while prioritizing playlists), routes See all to Playlists (resolving finding P2-F5), adds quick play loading spinners with 0 track disabled state tooltips and failure toast notifications, and connects `AddSongsDrawer` to user library tracks with automatic SQLite refresh on opening. All 387 Vitest tests, 47 native Rust tests, and production compilation pass cleanly.

## Findings

### Blockers (0)
None.

### Major (0)
None.

### Minor (0)
None.

### Nits

- `src/components/home/CuratedGrid.tsx:32`: The `computeYourCollectionsCards` helper cleanly handles asymmetrical collection distributions (e.g., 5 playlists and 1 album, or 0 playlists and 6 albums) while preserving curated playlist priority.
- `src/components/playlists/AddSongsDrawer.tsx:42`: Candidate tracks prefer `libraryTracks` in desktop mode, fall back to catalog fixtures only in browser preview mode when the library is unpopulated, and display an empty library guide when no local folders have been scanned.
- `src/store/usePlaylistStore.ts:138`: Resolved library tracks are placed into `dynamicTrackCache` to provide O(1) subsequent lookups during detail rendering.

## Strengths

- **Clean Architecture and error isolation**: Playlists and albums query database commands independently; failure in one source renders an inline retry card in its first slot while leaving the healthy collection cards visible and interactive.
- **Fixture clearance guard**: In desktop Tauri mode, database query rejections clear playlists and albums to empty arrays rather than reverting to static mock fixtures, preventing misleading stale data.
- **Accessible controls**: 0 track playlists disable quick play with `aria-disabled="true"`, `cursor-not-allowed`, and a descriptive tooltip explaining that tracks must be added first.
- **See all dead click resolved**: The See all button on Home collections navigates directly to the Playlists view without dead clicks, resolving issue P2-F5.
- **Comprehensive test coverage**: 29 unit and component tests in `src/test/playlistCollectionHydration.test.tsx` thoroughly verify store hydration, slot balancing, independent error states, quick play, toast notices, search filtering, and library track sourcing.

## Test coverage

- `cargo test --manifest-path src-tauri/Cargo.toml`: 47 passed cleanly.
- `npm test`: 387 passed across 35 test files.
- `npm run build`: cleanly bundled client output with zero TypeScript errors.
