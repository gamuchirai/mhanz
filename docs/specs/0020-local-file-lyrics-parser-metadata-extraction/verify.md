# Verify: Local file lyrics parser and metadata extraction · spec 0020 · updated 2026-10-31
_Steps derived from spec 0020 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Play a local audio file with a matching companion lrc file (for example `song.lrc` beside `song.mp3`) and open LyricsModal → verify synchronized lines render, active line highlights as playback advances, and auto scroll centers the current line → AC-1, AC-2, AC-7, AC-8
- [ ] Click an upcoming lyric line in LyricsModal → verify audio seeks to the calculated target time with offset adjustment applied, and playback resumes smoothly → AC-8
- [ ] Open NowPlayingFullscreen view while playing a track with synchronized lyrics → verify fullscreen lyrics view highlights the current line and scrolls in sync with the audio → AC-8
- [ ] Play a track with embedded ID3 USLT lyrics and no companion lrc file → verify embedded lyrics are parsed through lofty and displayed in LyricsModal → AC-1, AC-8
- [ ] Play an instrumental or untagged track with no lrc file and no embedded lyrics → verify LyricsModal displays EmptyLyricsState cleanly without errors or crashes → AC-8, AC-10
- [ ] Use timing offset controls in the lyrics UI (`[-0.1s]`, `[+0.1s]`) to adjust timing by +200ms → verify line highlights shift earlier in real time, and offset persists after closing and reopening the modal → AC-6, AC-7, AC-9
- [ ] Edit a companion lrc file on disk, change timestamps, and replay track → verify the parser detects file modification, refreshes the displayed lyrics, and preserves existing user offset preferences → AC-4, AC-5, AC-6

## Commands
- [ ] `cargo test lyrics::tests` → verify companion lrc discovery, line timestamp parsing, header offset tags, BOM stripping, multi timestamp line handling, and lofty tag fallbacks pass → AC-1, AC-2, AC-3, AC-10
- [ ] `cargo test db::tests::test_track_lyrics` → verify migration V004, track_lyrics CRUD repository methods, unique constraints, and offset preservation upserts pass → AC-4, AC-5, AC-9
- [ ] `npm test src/services/__tests__/lyrics.test.ts` → verify frontend lyrics service IPC invocation, DTO mapping, and error fallbacks pass → AC-6, AC-7
- [ ] `npm test src/components/lyrics/__tests__/LyricsModal.test.tsx` → verify LyricsModal renders real lines from useLyricsStore, handles line seeking, renders offset controls, and shows EmptyLyricsState → AC-7, AC-8, AC-10
- [ ] `cargo test` → verify entire Rust engine test suite executes with zero errors → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-10
- [ ] `npm test` → verify complete frontend Vitest test suite executes cleanly with zero failures → AC-7, AC-8, AC-9
- [ ] `npm run typecheck` → verify TypeScript compilation passes cleanly with zero errors → AC-7, AC-8
- [ ] `npm run lint` → verify ESLint check passes with zero errors → AC-7, AC-8

## Acceptance criteria coverage
- AC-1 (Priority resolution for companion files and embedded tags): covered by UI companion lrc test and `cargo test lyrics::tests::test_companion_and_embedded_priority`
- AC-2 (Synchronized and plain text LRC parsing): covered by `cargo test lyrics::tests::test_lrc_line_parsing_and_tag_stripping`
- AC-3 (Encoding and BOM resilience): covered by `cargo test lyrics::tests::test_bom_stripping_and_lossy_fallback`
- AC-4 (Relational SQLite schema migration): covered by `cargo test db::tests::test_track_lyrics`
- AC-5 (On demand caching and freshness validation): covered by UI file modification test and `cargo test lyrics::tests::test_cache_freshness_invalidation`
- AC-6 (Tauri IPC interface contracts and DTO schemas): covered by `npm test src/services/__tests__/lyrics.test.ts` and `cargo test commands::lyrics::tests`
- AC-7 (Presentation layer state and reactive store): covered by `npm test src/store/__tests__/useLyricsStore.test.ts`
- AC-8 (Seamless overlay and fullscreen integration): covered by UI manual tests and `npm test src/components/lyrics/__tests__/LyricsModal.test.tsx`
- AC-9 (Persistent user timing offset): covered by UI offset nudge test and `npm test src/services/__tests__/lyrics.test.ts`
- AC-10 (Resilient error tolerance): covered by UI empty state test and `cargo test lyrics::tests::test_malformed_syntax_graceful_handling`
