# Review, feat/local-library-scanner-metadata, 2026-10-26

**Reviewed by**: Gemini 3.8 Flash (inline; author on same model family, see note below)
**Scope**: 21 files changed, branch vs main
**Verdict**: Approve with nits

> **Independence note**: Antigravity subagents inherit the parent model, so this review runs on the same model family that wrote the code. The cross model guarantee is not met. For a fully independent review, paste the diff into Claude Opus or GPT-4o via your AI tool of choice. The findings below are genuine but may share the author model blind spots on subtle logic.

## Summary

This pull request introduces the native local library scanner and metadata extraction engine for Mumhanzi. It connects monitored filesystem folders to SQLite storage through background worker threads using walkdir, rayon, lofty, and sha2 hashing. The architecture follows Clean Architecture with clean separation between discovery, tag parsing, chunked transactional batch writes, and frontend presentation. User curation stats (favorites, play counts, timestamps) are preserved atomically on rescans via SQLite conflict update clauses, and orphaned records are pruned safely when completed scans finish. All 14 Rust tests and 146 frontend tests pass cleanly with zero lint errors. No blockers or majors were found.

Three minor improvements and two nits are noted below.

## Minor

### 🟡 Concurrent Rayon cover art file writing race condition on Windows, `src-tauri/src/scanner/metadata.rs:156`

**Problem**: In `extract_cover_art`, Rayon threads parse audio tracks in parallel. When multiple tracks in the same batch belong to the same album and share embedded artwork, their destination paths are identical. If multiple threads check `!dest_path.exists()` at the same time and attempt `fs::write(&dest_path, data)`, Windows file locking can trigger a sharing violation error. When the write call fails, the function logs an error and returns `None`, causing that track's cover art path to remain blank even if the file was written successfully by the concurrent thread.

**Why it matters**: In large multi track albums, some songs might fail to display artwork thumbnails while others succeed, leading to inconsistent cover display for tracks within the same album.

**Suggested fix**: If `fs::write` returns an error, perform a secondary check with `if dest_path.exists() { return Some(dest_path.to_string_lossy().to_string()); }`. This ensures that if another thread already finished writing the image, the current track still receives the valid cached artwork path.

### 🟡 Library refresh queries only the first 500 songs without pagination, `src/store/useLibraryStore.ts:303`

**Problem**: The `refreshFromDatabase` function calls `dbGetTracks(0, 500)`. If a user indexes a local collection with more than 500 tracks, only the first 500 songs will be loaded into the store and displayed in the virtualized song table.

**Why it matters**: Users with large music libraries will wonder why songs beyond track 500 do not show up in the library view or table search.

**Suggested fix**: Either loop or page until all tracks are loaded into the store, or provide a higher upper limit (such as 5,000 or 10,000 tracks) during initial catalog hydration until server driven table pagination is introduced.

### 🟡 Scanner event listeners unmount when navigating away from Your Library, `src/pages/Library.tsx:26`

**Problem**: `Library.tsx` mounts `initScanner()` inside a `useEffect` and cleans up listeners upon unmounting. If a user starts a folder scan and navigates to the Home, Search, or Playlists screen while the background worker is running, the progress and completion event listeners are detached.

**Why it matters**: The store will not receive the completion event while the user browses other screens, meaning folder cards may still display scanning spinners until the user navigates back to Your Library where `refreshFromDatabase` runs again.

**Suggested fix**: Move `initScanner()` to root `App.tsx` or a top level shell layout component alongside player initialization, ensuring the scanner store stays synchronized globally across view changes.

## Nits

* ⚪ `src-tauri/src/scanner/service.rs:347`: The worker thread emits `library://scan-completed` before updating atomic state flags back to idle. Resetting `is_scanning` and `active_phase` before emitting the event ensures that any immediate status queries from callers reflect the idle state.

* ⚪ `src-tauri/src/scanner/discovery.rs:128`: `path.to_string_lossy().to_string()` produces native backslashes on Windows, while mock fixtures and URL paths might contain forward slashes. Normalizing path separators to a consistent style helps avoid subtle path lookup mismatches.

## Strengths

* Atomic user curation preservation in `batch_writer.rs`: The `INSERT INTO tracks ... ON CONFLICT(file_path) DO UPDATE SET ...` query carefully excludes user specific columns like `is_favorite`, `play_count`, and `last_played_at`. This cleanly guarantees that user curation is never reset when updating tag metadata.
* High performance differential discovery in `discovery.rs`: Loading existing timestamps into an in memory lookup table before traversing allows unchanged files to bypass expensive audio tag probing, making subsequent rescans extremely fast.
* Clean separation of concerns: The background scanner coordinator, worker threads, and presentation stores interact cleanly via strongly typed IPC contracts and throttled event emissions.

## Test coverage

Comprehensive test coverage across both native and presentation layers. `cargo test scanner::tests` covers recursive traversal, differential checks, atomic user stats preservation, orphan pruning, and disconnected folder error tolerance. `src/services/__tests__/scanner.test.ts` validates IPC command invocation, event listeners, DTO adapters, and cancellation state transitions. All 14 Rust tests and 146 Vitest tests pass cleanly.
