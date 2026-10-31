# Reviews and Audits

This directory contains code reviews, audit records, and process analysis reports for Mutinhimira.

## Open and Actionable Issues

| ID | Title | Severity | Status | Quick Action | Source Report |
|---|---|---|---|---|---|
| F-7 | [Settings bypass SQLite persistence and audio device controls are simulated](process-0001-unlinked-ui-backend-flows.md#finding-f-7-settings-bypass-sqlite-persistence-and-audio-device-controls-are-simulated--major--bug) | major | action-required | `/develop queue, lyrics & settings overlays` | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |
| F-5 | [Home header action buttons are dead clicks](process-0001-unlinked-ui-backend-flows.md#finding-f-5-home-header-action-buttons-are-dead-clicks--minor--ux) | minor | action-required | `/develop home & discovery screen` | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |
| F-6 | [Home recent plays and popular songs ignore database play stats](process-0001-unlinked-ui-backend-flows.md#finding-f-6-home-recent-plays-and-popular-songs-ignore-database-play-stats--minor--scope) | minor | action-required | `/architect home & discovery screen: wire listening history and popular tracks to SQLite` | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |
| F-9 | [Audio visualizer displays simulated animation rather than real frequency data](process-0001-unlinked-ui-backend-flows.md#finding-f-9-audio-visualizer-displays-simulated-animation-rather-than-real-frequency-data--minor--scope) | minor | action-required | `/architect now playing fullscreen view: audio frequency analyzer stream` | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |

## Resolved and Enrolled Historical Issues

| ID | Title | Severity | Status | Quick Action | Governing Feature / Resolution | Source Report |
|---|---|---|---|---|---|---|
| REV-1 | [Manifest removal breaks native test runner on Windows](2026-10-30-feat-your-library-folder-browser.md#manifest-removal-breaks-native-test-runner-on-windows-src-tauribuildrs1) | major | resolved | `cargo test` | Restored Common Controls v6 manifest linking in `src-tauri/build.rs` | [2026-10-30-feat-your-library-folder-browser.md](2026-10-30-feat-your-library-folder-browser.md) |
| REV-2 | [Desktop database error falls through to browser mock fallback](2026-10-30-feat-your-library-folder-browser.md#desktop-database-error-falls-through-to-browser-mock-fallback-srcstoreuselibrarystorets178) | major | resolved | `npm test` | Prevented fallthrough to mock fallback when `isTauri()` is active and added regression test | [2026-10-30-feat-your-library-folder-browser.md](2026-10-30-feat-your-library-folder-browser.md) |
| F-1 | [Native folder picker missing in library screen](process-0001-unlinked-ui-backend-flows.md#finding-f-1-native-folder-picker-missing-in-library-screen--critical--bug) | critical | resolved | `/check verify your library & folder browser` | Governed by Feature 6 Your library and folder browser ([spec 0005](../specs/0005-your-library-folder-browser/index.md)) | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |
| F-4 | [Search interface filters mock data instead of indexed library](process-0001-unlinked-ui-backend-flows.md#finding-f-4-search-interface-filters-mock-data-instead-of-indexed-library--major--scope) | major | resolved | `/check verify fast local library search indexing` | Governed by Feature 17 Fast local library search indexing ([spec 0014](../specs/0014-fast-local-library-search-indexing/index.md)) | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |
| F-2 | [Albums catalog and detail views not hydrated from SQLite](process-0001-unlinked-ui-backend-flows.md#finding-f-2-albums-catalog-and-detail-views-not-hydrated-from-sqlite--major--scope) | major | enrolled | `/architect albums and album detail persistence` | Governed by Feature 20 Albums and album detail persistence ([scope.md](../scope/scope.md#20-albums-and-album-detail-persistence--needs-a-decision)) | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |
| F-3 | [Artists catalog and profile views not hydrated from SQLite](process-0001-unlinked-ui-backend-flows.md#finding-f-3-artists-catalog-and-profile-views-not-hydrated-from-sqlite--major--scope) | major | enrolled | `/architect artists and artist profile persistence` | Governed by Feature 21 Artists and artist profile persistence ([scope.md](../scope/scope.md#21-artists-and-artist-profile-persistence--needs-a-decision)) | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |
| F-8 | [Lyrics overlay is hard coded with no local file or tag parser](process-0001-unlinked-ui-backend-flows.md#finding-f-8-lyrics-overlay-is-hard-coded-with-no-local-file-or-tag-parser--major--scope) | major | enrolled | `/architect local file lyrics parser and metadata extraction` | Governed by Feature 22 Local file lyrics parser and metadata extraction ([scope.md](../scope/scope.md#22-local-file-lyrics-parser-and-metadata-extraction--needs-a-decision)) | [process-0001-unlinked-ui-backend-flows.md](process-0001-unlinked-ui-backend-flows.md) |

## Review and Audit Documents Index

- [Review: Your Library and Folder Browser](2026-10-30-feat-your-library-folder-browser.md) (2026-10-30)
- [Process 0001: Unlinked UI and Backend Flows](process-0001-unlinked-ui-backend-flows.md) (2026-10-27)
- [Review: Playlists and Favorites Persistence](2026-10-27-feat-playlists-favorites-persistence.md) (2026-10-27)
- [Review: Local Library Scanner and Metadata](2026-10-26-feat-local-library-scanner-metadata.md) (2026-10-26)
- [Review: Desktop UI Responsiveness](2026-10-26-feat-desktop-ui-responsiveness.md) (2026-10-26)
