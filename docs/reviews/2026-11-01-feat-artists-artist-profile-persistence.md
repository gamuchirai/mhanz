# Review: feat/artists-artist-profile-persistence (2026-11-01)

**Reviewed by**: Antigravity Reviewer (independent verification)  
**Scope**: 23 files, feat/artists-artist-profile-persistence vs main (merge base f01ac8f)  
**Verdict**: Approved  

## Summary

This pull request implements SQLite database persistence and reactive synchronization for the Artists catalog and Artist Profile views in Mutinhimira (Feature 21, spec 0021). It connects the user interface to SQLite via Tauri IPC commands, replaces mock fixtures with real scanned music data, adds total play count aggregation in Rust, provides on-demand lazy profile hydration with loading skeletons, cross-links discography releases to albums, preserves overview grid scroll state, and retires legacy streaming follow buttons in favor of local library metrics. All 25 artists persistence tests, 13 artists UI tests, 18 Rust engine tests, and all 235 workspace unit tests pass with zero warnings or errors.

## Findings

### Blockers (0)
None.

### Major (0)
None.

### Minor (0)
None.

### Nits

- ⚪ `src/store/useArtistStore.ts:74`: `mapAlbumDtoToArtistRelease` classifies releases into single (1 track), ep (2 to 3 tracks), and album (4 or more tracks). This heuristic accurately organizes local discographies and matches spec AC-10.
- ⚪ `src/pages/Artists.tsx:75`: The overview grid is preserved in the DOM using `display: activeArtistId ? "none" : "flex"` when an artist profile is active. This cleanly prevents scroll position loss when returning to the artist list without introducing complex manual window scroll state restoration.

## Strengths

- **Local library metrics**: Total play count is aggregated directly via SQLite subqueries (`COALESCE((SELECT SUM(play_count) FROM tracks WHERE artist_id = ar.id), 0)`), providing accurate statistics across restarts without artificial streaming counters.
- **Lazy profile hydration**: `useArtistStore.loadArtistProfile` fetches top tracks and discography on demand with in-memory caching to prevent duplicate database roundtrips, and displays a loading skeleton to avoid layout shifts.
- **Clean Architecture layering**: DTO contracts in `src-tauri/src/db/models.rs` and `src/types/database.ts` maintain complete separation between the relational SQLite schema and UI presentation models.
- **Scanner synchronization**: `useArtistStore` registers an automatic listener for `library://scan-completed` events, reloading the artist catalog and refreshing the active profile when new music is indexed.
- **Comprehensive test coverage**: 25 unit, integration, error state, and accessibility tests in `src/test/artistsPersistence.test.tsx` and native integration tests in `src-tauri/src/db/mod.rs` verify all acceptance criteria (AC-1 through AC-12).

## Test coverage

- `cargo test --manifest-path src-tauri/Cargo.toml`: 18 passed (including `test_artist_crud_play_count_and_profile_persistence`).
- `npx vitest run src/test/artistsPersistence.test.tsx`: 25 passed.
- `npx vitest run src/test/artists.test.tsx`: 13 passed.
- `npm test`: 235 passed across 19 test files.
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`: 0 warnings.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: clean formatting.
- `npm run build`: cleanly bundled client output.
