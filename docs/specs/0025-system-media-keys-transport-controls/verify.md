# Verify: System media keys and transport controls (spec 0025, 2026-11-07)

Steps derived from spec 0025 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones.

## UI and manual verification

* [ ] Play any local track in Mutinhimira and adjust Windows system volume via keyboard volume keys or taskbar icon -> Windows volume flyout overlay appears displaying song title, artist, album name, and album artwork -> AC-3, AC-4
* [ ] Observe Windows volume flyout timeline slider during active playback -> Scrubber position updates smoothly in sync with Mutinhimira playback timeline without high frequency IPC flooding -> AC-5
* [ ] Click Pause button in Windows volume flyout or press keyboard PlayPause media key while Mutinhimira is minimized -> Playback pauses immediately, audio stops, and Windows overlay displays Play icon -> AC-7, AC-8
* [ ] Click Play button in Windows volume flyout or press keyboard PlayPause media key while paused -> Playback resumes smoothly and Windows overlay switches back to Pause icon -> AC-7, AC-8
* [ ] Press keyboard Next Track media key or click Next button in Windows flyout -> Playback advances immediately to next track in queue, updating title, artist, and artwork in Windows flyout -> AC-7, AC-8
* [ ] Press keyboard Previous Track media key or click Previous button in Windows flyout -> Playback returns to previous track or restarts current track according to player store rules -> AC-7, AC-8
* [ ] Drag or click timeline scrubber in Windows volume flyout -> Song playback seeks to the selected position in Mutinhimira -> AC-7, AC-8
* [ ] Play a track with WebP artwork or missing artwork -> Windows media flyout renders the bundled Mutinhimira PNG application icon fallback cleanly without crashing -> AC-4
* [ ] Stop playback and clear the playback queue -> Windows media controls detach and clear active song metadata cleanly -> AC-6
* [ ] Open Settings modal from sidebar gear icon, navigate to Playback section, and inspect System Media Controls toggle -> Switch is present, enabled by default, and reflects `systemMediaControlsEnabled` -> AC-10, AC-11
* [ ] Turn off System Media Controls toggle in Settings modal -> Mutinhimira detaches operating system media controls and stops responding to global media keys -> AC-11, AC-12
* [ ] Turn System Media Controls toggle back on in Settings modal while a song is playing -> Controls reattach immediately and restore metadata to the Windows flyout -> AC-11, AC-12
* [ ] Restart Mutinhimira desktop application -> User preference for System Media Controls persists across restarts via SQLite `app_settings` -> AC-10
* [ ] Close Mutinhimira desktop application -> Windows media controls detach on application exit and leave no lingering phantom controls -> AC-6

## Commands

* [ ] `npm test` -> All test suites pass cleanly with MediaControlsService mock active -> AC-9
* [ ] `npx vitest run src/test/mediaControls.test.tsx` -> Unit tests for media controls service and store event handling pass cleanly -> AC-8, AC-9
* [ ] `cargo test` -> Rust unit and integration tests compile and pass cleanly -> AC-1, AC-2, AC-3, AC-4, AC-5
* [ ] `npm run typecheck` -> TypeScript compiles with zero type errors across all stores and components -> AC-8, AC-10
* [ ] `npm run lint` -> ESLint runs clean with zero errors across the codebase -> AC-8, AC-10

## Acceptance criteria coverage

* AC-1: Cargo souvlaki dependency covered by `cargo test` and build configuration
* AC-2: Native MediaControlsManager initialization in Tauri managed state covered by `cargo test` and runtime startup
* AC-3: Track title, artist, album, and duration metadata update covered by UI step 1 and `cargo test`
* AC-4: Local cover art loading, WebP format validation, and PNG application icon fallback covered by UI steps 1, 8 and `cargo test`
* AC-5: Playback status and timeline position synchronization covered by UI steps 1, 2 and `cargo test`
* AC-6: Clearing transport display on playback stop or application exit covered by UI steps 9, 14 and `cargo test`
* AC-7: Global media keys, flyout buttons, and seek scrubber dispatch covered by UI steps 3, 4, 5, 6, 7
* AC-8: Frontend event handling and queue navigation coordination covered by UI steps 3, 4, 5, 6, 7 and `npm test`
* AC-9: Browser and Vitest mock service fallback covered by `npm test`
* AC-10: UserSettings schema extension and SQLite persistence covered by UI steps 10, 13 and `npm test`
* AC-11: Settings modal toggle switch UI and interaction covered by UI steps 10, 11, 12
* AC-12: Dynamic enable and detach invocation covered by UI steps 11, 12
