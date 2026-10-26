# Verify: Local library scanner and metadata · spec 0016 · updated 2026-10-26
_Steps derived from spec 0016 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Open Your Library view and expand Monitored Music Folders panel → verify active folder cards display track count, total size, and Rescan button → AC-1, AC-12
- [x] Click Rescan on a monitored folder → verify the button changes to a spinning indicator, displays scanning phase and track progress, and shows a Cancel button → AC-11, AC-12
- [x] Click Cancel while scanning is active → verify the scan aborts gracefully without corrupting database or deleting unscanned tracks → AC-8, AC-11
- [x] Allow a full scan to complete on a local music folder → verify track list reloads automatically with newly discovered songs, titles, artists, and durations → AC-1, AC-3, AC-6, AC-12
- [x] Inspect SongTable artwork column → verify songs with embedded cover art display thumbnail images resolved through local cache → AC-5, AC-12
- [x] Add an audio file with missing ID3 tags to a monitored folder and rescan → verify title displays file basename, artist shows "Unknown Artist", and album shows "Unknown Album" → AC-4
- [x] Toggle like heart on a scanned track, rescan folder → verify liked status and play counts are retained without reset → AC-7
- [x] Delete a track file from disk and run a complete rescan → verify the deleted track is pruned from library table, and orphaned album or artist records are cleaned up → AC-8

## Commands
- [x] `cargo test scanner::tests` → verify recursive discovery, differential timestamp skipping, atomic upserts, orphan pruning, and disconnected folder error tolerance pass → AC-1, AC-2, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11
- [x] `npm test src/services/__tests__/scanner.test.ts` → verify scanner client IPC commands, progress event listeners, DTO mappers, and store state synchronization pass → AC-11, AC-12
- [x] `cargo test` → verify entire Rust engine test suite executes with zero errors → AC-1, AC-2, AC-3, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11
- [x] `npm test` → verify full Vitest frontend suite executes with all 146 tests passing → AC-11, AC-12
- [x] `npm run typecheck` → verify TypeScript compilation passes cleanly with zero errors → AC-12
- [x] `npm run lint` → verify ESLint check passes with zero errors → AC-12

## Acceptance criteria coverage
- AC-1 (Recursive audio discovery): covered by UI manual scan and `cargo test scanner::tests::tests::test_recursive_discovery_and_differential_checks`
- AC-2 (Fast differential pre fetch): covered by `cargo test scanner::tests::tests::test_recursive_discovery_and_differential_checks`
- AC-3 (Parallel tag extraction with Lofty and Rayon): covered by UI manual scan and `cargo test`
- AC-4 (Tag fallback derivation): covered by UI manual missing tag test and metadata parsing
- AC-5 (Embedded cover artwork extraction and SHA256 caching): covered by UI artwork thumbnail test and `npm test src/services/__tests__/scanner.test.ts`
- AC-6 (Chunked transactional persistence): covered by `cargo test scanner::tests::tests::test_batch_upsert_and_user_stats_preservation`
- AC-7 (Atomic user stats preservation): covered by UI like retention test and `cargo test scanner::tests::tests::test_batch_upsert_and_user_stats_preservation`
- AC-8 (Pruning removed files on completed scans): covered by UI track deletion test and `cargo test scanner::tests::tests::test_pruning_missing_tracks_and_orphans`
- AC-9 (Disconnected folder safety): covered by `cargo test scanner::tests::tests::test_disconnected_folder_safety`
- AC-10 (Resilient error tolerance): covered by `cargo test scanner::tests::tests::test_scanner_manager_status_and_cancel_guards`
- AC-11 (Asynchronous IPC control and live progress events): covered by UI scan control tests and `npm test src/services/__tests__/scanner.test.ts`
- AC-12 (Presentation layer synchronization): covered by UI table reload test, `npm test src/services/__tests__/scanner.test.ts`, and `npm test src/test/library.test.tsx`
