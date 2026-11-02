# Review: Local file lyrics parser and metadata extraction, 2026-11-02

**Reviewed by**: Senior Software Engineer
**Scope**: 33 files, feat/local-file-lyrics-parser-metadata-extraction vs main
**Verdict**: Approved

## Summary

This pull request implements local file lyrics extraction, companion `.lrc` sidecar file parsing, SQLite caching, and presentation layer wiring across the desktop lyrics overlay and fullscreen views. It honors priority resolution by checking for adjacent `.lrc` and `.LRC` companion files before extracting embedded ID3 USLT, Vorbis, and Lofty metadata tags. Extracted lines are parsed with support for header timing offsets, UTF-8 BOM stripping, and multiple timestamp tags per lyric line. Caching in SQLite via `V006__track_lyrics.sql` validates file modification times while preserving user configured timing offsets across rescans and restarts. The user interface integration seamlessly delivers active line highlighting, click seeking, and interactive offset nudge controls with debounce protection.

## Strengths

* **Priority and encoding resilience**: Companion discovery cleanly prefers external `.lrc` files over embedded tags, while the native Rust parser handles UTF-8 BOM markers, multi timestamp tags per line, and header offsets `[offset:+/-ms]` robustly.
* **Non destructive user offset persistence**: When modified companion files are detected and reparsed, existing user timing preferences in SQLite are preserved rather than overwritten.
* **Debounced IPC updates**: The reactive Zustand store `useLyricsStore` debounces timing offset backend writes by 300ms, preventing database write contention during rapid nudge button clicks.
* **Comprehensive test coverage**: 8 native Rust tests in `lyrics::parser` and `db::lyrics_repo` paired with 11 Vitest component and store tests in `src/test/lyrics.test.tsx` thoroughly verify both happy paths and edge cases including unsynced plain text and IPC failures.
* **Graceful presentation fallbacks**: The lyrics modal and fullscreen view transition smoothly between synchronized timed lines, unsynchronized plain text poetry, and empty placeholder states without throwing errors or interrupting audio playback.

## Nits

* ⚪ `src-tauri/src/lyrics/parser.rs:142`: Standard LRC lines with non-standard centisecond precision (e.g., 3-digit millisecond timestamps `[mm:ss.xxx]`) are parsed via flexible regex, but trailing bracket tags such as karaoke inline word timestamps are preserved as plain line text rather than stripped.
* ⚪ `src/components/lyrics/LyricsModal.tsx:72`: Active line search operates via sequential scan; with typical song lyrics containing under 100 lines this is instantaneous, though a binary search could be considered if parsing extended librettos or speeches.

## Test Coverage

Both backend and frontend test suites pass with zero failures:
* `cargo test lyrics` executes 8 unit tests testing standard LRC parsing, header offsets, UTF-8 BOM, plain text fallback, companion file priority, and SQLite repository CRUD.
* `npm test src/test/lyrics.test.tsx` executes 11 tests covering service IPC invocation, offset debouncing, click-to-seek arithmetic, unsynced formatting, cache invalidation, and accessibility attributes.
* Full application test suite (`npm test`) passes 21 test files and 260 tests cleanly.
