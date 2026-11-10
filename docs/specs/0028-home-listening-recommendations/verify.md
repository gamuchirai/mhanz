# Verify: Home listening recommendations · spec 0028 · updated 2026-11-10

_Steps derived from spec 0028 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] View Home with empty library → expect four recommendation cards displaying guidance to add music → AC-1, AC-6
- [x] Add music folder with tracks and scan → expect Recently Added card to populate with up to 10 newest tracks and From your library label → AC-1, AC-2, AC-6
- [x] Play several songs across different artists and genres until milestones commit → expect Most Played to display up to 30 most played tracks without From your library label → AC-1, AC-3
- [x] Play multiple songs from a single artist → expect Best of an Artist to display formatted title Best of [Artist] with highest play count sum → AC-1, AC-4
- [x] Play songs within current 30 day window → expect Trending Genre to display formatted title Trending in [Genre] with count of qualifying history rows → AC-1, AC-5
- [x] Click card play button on any collection → expect queue to replace with listed tracks, start playback, and set playback context title and type → AC-7
- [x] Click card body outside play button → expect queue to replace with listed tracks, start playback, and set playback context title and type → AC-7
- [x] Trigger scan completed or record history → expect recommendations to refresh live without page reload → AC-8
- [x] Click Clear recent history in Home → expect history to clear and recommendations to refresh to library fallbacks with From your library labels while play counts remain → AC-8, AC-9
- [x] Simulate SQLite database query error → expect inline retry alert for Based on Your Listening while Your Collections remains intact and functional → AC-10
- [x] Click Retry on recommendation error card → expect recommendations to attempt rehydration → AC-10

## Commands

- [x] `cargo test --manifest-path src-tauri/Cargo.toml` → 50 tests pass including 30 day history pruning, cutoff calculation, ranking rules, and fallbacks → AC-2, AC-3, AC-4, AC-5, AC-6, AC-9
- [x] `npm test` → 397 tests pass across 36 test files including recommendation UI, queue replacement, context setting, fallback labels, and retry state → AC-1, AC-6, AC-7, AC-8, AC-10
- [x] `npm run build` → production bundle builds cleanly with zero TypeScript errors

## Acceptance criteria coverage

- AC-1: covered by card shells, loading skeletons, and gradient artwork fallbacks
- AC-2: covered by Recently Added 10 track limit and created_at sort order
- AC-3: covered by Most Played 30 track limit and play_count sort order
- AC-4: covered by Best of an Artist play count sum ranking and display name formatting
- AC-5: covered by Trending Genre 30 day cutoff query and display name formatting
- AC-6: covered by library fallback queries, From your library labeling, and zero track guidance
- AC-7: covered by queue replacement, playback start, and context metadata on card or play clicks
- AC-8: covered by event driven refresh on history record, scan complete, and clear history
- AC-9: covered by 30 day age pruning during history recording and startup maintenance
- AC-10: covered by independent aggregate query failure resilience and inline retry alert

