# Review: feat/home-listening-recommendations (2026-11-10)

**Reviewed by**: Antigravity Reviewer (independent verification)
**Scope**: 18 files, feat/home-listening-recommendations vs main
**Verdict**: Approved

## Summary

This pull request implements dynamic home recommendations for Mutinhimira (spec 0028, Feature 28). It introduces four distinct generated collections on the Home screen: Recently Added, Most Played, Best of an Artist, and Trending Genre.

The implementation provides an aggregate read only SQLite query in `src-tauri/src/db/history_repo.rs` that computes the four collections in one database round trip, returning typed models with localized display titles. A 30 day age pruning policy replaces row count pruning during playback recording and application boot. The frontend introduces `useRecommendationsStore`, `RecommendationsGrid` with animated skeleton loaders, accessible inline error retry states, fallback indicators, and queue replacement with playback context metadata.

All blockers and minor formatting discrepancies identified during preliminary evaluation were resolved: the unused type import in `src/test/homeRecommendations.test.tsx` was pruned, `cargo fmt` was applied cleanly, and `npm run build`, `npm test`, and `cargo test` all pass with zero errors.

## Findings

### Blockers (0)
0

### Major (0)
0

### Minor (0)
0

### Nits / Observations

* `src/store/useRecommendationsStore.ts:31`: The `initializeRecommendations` method exits early if `get().error` is non null. This keeps the error alert and retry button visible when returning to the Home screen until the user clicks Retry or until a background event such as scan completion triggers `refreshRecommendations`.
* `src/components/home/RecommendationsGrid.tsx:187`: When a collection contains zero tracks and library track count is zero, clicking the recommendation card calls `onNavigate("Your Library")`, providing smooth onboarding guidance for new music listeners.
* `src-tauri/src/db/history_repo.rs:538`: In `TrendingGenre`, the recent play count subquery filters history entries with `played_at >= cutoff` before grouping by `track_id`. Because `listening_history(played_at DESC)` is indexed by `idx_listening_history_played_at`, SQLite scans only the recent 30 day window, preserving high performance on large listening databases.
* `src-tauri/src/db/history_repo.rs:233`: `get_home_recommendations` accepts `conn: &Connection`, enforcing read only query execution at compile time. History pruning is strictly isolated to write paths (`record_playback` and startup initialization in `DatabaseManager`), preventing database lock contention during recommendation reads.

### Strengths

* Clean Architecture compliance: Clear boundaries are preserved between presentation (`RecommendationsGrid.tsx`), application store (`useRecommendationsStore.ts`), infrastructure client (`db.ts`), Tauri command layer (`commands/db.rs`), and repository persistence (`history_repo.rs`).
* Single round trip aggregate query: Consolidates Recently Added, Most Played, Best of an Artist, and Trending Genre into one read only SQLite invocation, returning all four collections in a single IPC call.
* Robust fallback handling: Gracefully handles empty history by selecting winning fallback artists and genres from library tracks and labeling cards with the `From your library` badge.
* Parameterized SQL queries: Dynamic values including the 30 day cutoff timestamp, artist identifiers, normalized artist names, and genre strings are strictly bound using positional parameters, eliminating SQL injection risks.
* Accessible UI and error resilience: Provides animated skeleton loading cards during initial fetch, explicit `role="alert"` retry UI on database failure, keyboard activation with Enter and Space, and accessible labels for screen readers.
* Comprehensive test coverage: Includes 3 Rust unit tests covering 30 day age pruning, fallback behavior, and empty library handling, plus 510 lines of frontend integration tests covering UI states, store operations, and queue playback.

### Test and build verification status

* `npm test`: 401 tests passed across 36 test files (all tests pass).
* `cargo test --manifest-path src-tauri/Cargo.toml`: 50 unit tests passed (all tests pass).
* `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: Clean, zero differences.
* `npm run build`: Clean production bundle built in under 1 second with zero TypeScript or bundle errors.

### Verdict

Needs Changes